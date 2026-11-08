import { db } from './db.js';
import { asistenciaRepo } from './asistenciaRepo.js';
import { incidenciaRepo } from './incidenciaRepo.js';
import { solicitarPersistencia } from './almacenamiento.js';
import { sincronizarPendientes, sincronizarIncidenciasPendientes, iniciarSync, suscribirSync } from './syncQueueService.js';
import { sincronizarPendientesFaciales } from './facialSyncService.js';
import { contarPendientesFaciales } from './facialSqliteDb.js';
import {
  iniciarConectividad,
  detenerConectividad,
  verificarAhora,
  obtenerEstadoConexion,
  suscribirConectividad
} from './connectivityService.js';

let activo = false;
let pausadoPorAuth = false;
let ultimaSync = null;
let ultimoResultado = null;
let syncEnCurso = false;

let generacion = 0;
let generacionArranque = 0;
let arranqueEnCursoPromise = null;

let configActual = {
  enviarLote: undefined,
  intervaloMs: 30000,
  tamanoLote: 100,
  tamanoLoteLento: 25,
  esperaTrasMarcaMs: 2000,
  ping: undefined,
  intervaloPingMs: undefined
};

let temporizadorIntervalo = null;
let debounceMarcaTimer = null;
let temporizadorJitterRecuperacion = null;
let fnHookCreating = null;
let fnHookCreatingIncidencias = null;
let desuscribirConectividad = null;
let desuscribirSyncEventos = null;

const suscriptoresScheduler = new Set();

function notificarCambioScheduler() {
  const snapshot = obtenerEstadoScheduler();
  for (const fn of suscriptoresScheduler) {
    try {
      fn(snapshot);
    } catch (err) {
      console.warn('[syncScheduler] Error en suscriptor:', err);
    }
  }
}

export function obtenerEstadoScheduler() {
  return {
    activo,
    pausadoPorAuth,
    ultimaSync,
    ultimoResultado
  };
}

export function suscribirScheduler(callback) {
  if (typeof callback === 'function') {
    suscriptoresScheduler.add(callback);
  }
  return () => {
    suscriptoresScheduler.delete(callback);
  };
}

export function reanudarSync() {
  pausadoPorAuth = false;
  notificarCambioScheduler();
  if (activo) {
    dispararSincronizacion('reanudacion_auth').catch(() => {});
  }
}

async function dispararSincronizacion(motivo) {
  if (!activo || pausadoPorAuth || syncEnCurso) {
    return;
  }

  // Comprobación rápida: si el navegador dice que no hay internet, saltar.
  // Si dice que sí, intentamos sincronizar y deja que el servidor responda.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }

  const conn = obtenerEstadoConexion();
  const tamano =
    conn.estado === 'degraded'
      ? configActual.tamanoLoteLento
      : configActual.tamanoLote;

  syncEnCurso = true;
  try {
    const res = await sincronizarPendientes({
      enviarLote: configActual.enviarLote,
      tamanoLote: tamano,
      origen: 'automatico'
    });
    const resIncidencias = await sincronizarIncidenciasPendientes({ tamanoLote: tamano });
    let resFacial = null;
    if (!res?.omitido && !res?.pausadaPorAuth && !res?.huboFalloDeRed) {
      // Si la sincronización automática está desactivada, el modo offline está
      // forzado, la sesión expiró o la red falló, la cola facial también espera:
      // misma política que asistencias.
      try {
        resFacial = await sincronizarPendientesFaciales();
      } catch (errFacial) {
        console.warn('[syncScheduler] Error en sincronizacion facial:', errFacial);
      }
    }

    if (!res?.omitido) {
      ultimaSync = Date.now();
      ultimoResultado = { asistencias: res, incidencias: resIncidencias, facial: resFacial };
    }

    if (res?.pausadaPorAuth) {
      pausadoPorAuth = true;
    }

    notificarCambioScheduler();
  } catch (err) {
    console.warn(`[syncScheduler] Error en sincronizacion (${motivo}):`, err);
  } finally {
    syncEnCurso = false;
  }
}

/**
 * Boton manual "Sincronizar ahora".
 * - Si forzado esta activo: prueba la red real con probarConexionReal().
 * - Si no esta forzado: verifica con verificarAhora().
 * - Si no hay conexion: retorna sin invocar a sincronizarPendientes.
 * - Si res.omitido es true: devuelve con motivo: 'envio_en_curso' sin actualizar ultimaSync ni ultimoResultado.
 */
export async function sincronizarAhora({ enviarLote, tamanoLote } = {}) {
  const pendientesRestantes = (await asistenciaRepo.contarPendientes()) + (await incidenciaRepo.contarPendientes());

  console.log('[syncScheduler] sincronizarAhora llamado. Pendientes:', pendientesRestantes);
  pausadoPorAuth = false;
  notificarCambioScheduler();

  const conn = obtenerEstadoConexion();
  const loteSize =
    tamanoLote ||
    (conn.estado === 'degraded'
      ? configActual.tamanoLoteLento
      : configActual.tamanoLote);

  console.log('[syncScheduler] Llamando a sincronizarPendientes con origen manual');
  const res = await sincronizarPendientes({
    enviarLote: enviarLote || configActual.enviarLote,
    tamanoLote: loteSize,
    origen: 'manual'
  });
  const resIncidencias = await sincronizarIncidenciasPendientes({ tamanoLote: loteSize });
  let resFacial = null;
  // Si otro envío seguía en curso (omitido), ese mismo ciclo ya incluye la cola
  // facial; lanzarla aquí duplicaría la petición.
  if (!res?.omitido && !res?.pausadaPorAuth && !res?.huboFalloDeRed) {
    try {
      resFacial = await sincronizarPendientesFaciales();
    } catch (errFacial) {
      console.warn('[syncScheduler] Error en sincronizacion facial manual:', errFacial);
    }
  }
  console.log('[syncScheduler] Resultado sincronizarPendientes:', res);

  if (res?.omitido) {
    return {
      ...res,
      motivo: 'envio_en_curso'
    };
  }

  ultimaSync = Date.now();
  ultimoResultado = { asistencias: res, incidencias: resIncidencias, facial: resFacial };

  if (res?.pausadaPorAuth) {
    pausadoPorAuth = true;
  }

  notificarCambioScheduler();
  return res;
}

function programarCicloPeriodico() {
  if (!activo) return;
  if (temporizadorIntervalo) {
    clearTimeout(temporizadorIntervalo);
    temporizadorIntervalo = null;
  }

  // Captura la generacion al momento de programar
  const genAlProgramar = generacion;

  temporizadorIntervalo = setTimeout(async () => {
    // Comprobar que sigue siendo vigente antes de actuar
    if (!activo || generacion !== genAlProgramar) return;

    const visible = typeof document === 'undefined' || document.visibilityState === 'visible';

    if (visible && !pausadoPorAuth && !(typeof navigator !== 'undefined' && navigator.onLine === false)) {
      const [pendientes, incidenciasPendientes, facialesPendientes] = await Promise.all([
        asistenciaRepo.pendientes(1),
        incidenciaRepo.pendientes(1),
        contarPendientesFaciales()
      ]);

      // Comprobar de nuevo tras el await
      if (!activo || generacion !== genAlProgramar) return;

      if (pendientes.length > 0 || incidenciasPendientes.length > 0 || facialesPendientes > 0) {
        await dispararSincronizacion('intervalo_periodico');
      }
    }

    // Comprobar antes de reprogramar
    if (!activo || generacion !== genAlProgramar) return;

    programarCicloPeriodico();
  }, configActual.intervaloMs);
}

function handleVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    dispararSincronizacion('pestana_visible').catch(() => {});
  }
}

/**
 * Inicia la sincronizacion automatica protegido con contador de generacion.
 * Acepta ping e intervaloPingMs opcionales para connectivityService.
 */
export async function iniciarSincronizacionAutomatica({
  enviarLote,
  intervaloMs = 30000,
  tamanoLote = 100,
  tamanoLoteLento = 25,
  esperaTrasMarcaMs = 2000,
  ping,
  intervaloPingMs
} = {}) {
  // Bucle de sincronizacion de arranques en curso
  while (arranqueEnCursoPromise) {
    if (generacionArranque === generacion) {
      return await arranqueEnCursoPromise;
    }
    try {
      await arranqueEnCursoPromise;
    } catch (e) {
      // Ignorar errores del arranque previo cancelado
    }
  }

  if (activo) {
    return detenerSincronizacionAutomatica;
  }

  generacion += 1;
  const genActual = generacion;
  generacionArranque = genActual;

  let miPromesa = null;
  miPromesa = (async () => {
    pausadoPorAuth = false;
    syncEnCurso = false;

    configActual = {
      enviarLote,
      intervaloMs,
      tamanoLote,
      tamanoLoteLento,
      esperaTrasMarcaMs,
      ping,
      intervaloPingMs
    };

    const esValido = () => generacion === genActual;

    // 1. Revertir huerfanos
    try {
      await iniciarSync();
      await incidenciaRepo.revertirSyncingHuerfanos();
    } catch (err) {
      console.warn('[syncScheduler] Error en iniciarSync:', err);
    }
    if (!esValido()) {
      detenerSincronizacionAutomatica();
      return detenerSincronizacionAutomatica;
    }

    // 2. Persistencia de cuota
    try {
      await solicitarPersistencia();
    } catch (err) {
      console.warn('[syncScheduler] Error en solicitarPersistencia:', err);
    }
    if (!esValido()) {
      detenerSincronizacionAutomatica();
      return detenerSincronizacionAutomatica;
    }

    // 3. Purgar marcas antiguas (>72h)
    try {
      await asistenciaRepo.purgarSincronizados(72);
    } catch (err) {
      console.warn('[syncScheduler] Error en purgarSincronizados:', err);
    }
    if (!esValido()) {
      detenerSincronizacionAutomatica();
      return detenerSincronizacionAutomatica;
    }

    // 4. Iniciar conectividad
    try {
      await iniciarConectividad({ ping: configActual.ping, intervaloMs: configActual.intervaloPingMs });
    } catch (err) {
      console.warn('[syncScheduler] Error en iniciarConectividad:', err);
    }
    if (!esValido()) {
      detenerSincronizacionAutomatica();
      return detenerSincronizacionAutomatica;
    }

    // 5. Hook Dexie: firma (primKey, obj, trans)
    fnHookCreating = function (primKey, obj, trans) {
      if (debounceMarcaTimer) clearTimeout(debounceMarcaTimer);
      debounceMarcaTimer = setTimeout(() => {
        dispararSincronizacion('marca_creada').catch(() => {});
      }, configActual.esperaTrasMarcaMs);
    };
    fnHookCreatingIncidencias = function () {
      if (debounceMarcaTimer) clearTimeout(debounceMarcaTimer);
      debounceMarcaTimer = setTimeout(() => {
        dispararSincronizacion('incidencia_creada').catch(() => {});
      }, configActual.esperaTrasMarcaMs);
    };
    try {
      db.asistencias_pendientes.hook('creating', fnHookCreating);
      db.incidencias_pendientes.hook('creating', fnHookCreatingIncidencias);
    } catch (err) {
      console.warn('[syncScheduler] Error al registrar hook creating:', err);
    }

    // 6. Suscribir a conectividad con jitter de recuperacion
    let estadoPrevio = obtenerEstadoConexion().estado;
    desuscribirConectividad = suscribirConectividad((conn) => {
      const eraOfflineOVerificando = estadoPrevio === 'offline' || estadoPrevio === 'verificando';
      const ahoraDisponible = conn.estado === 'online' || conn.estado === 'degraded';

      if (eraOfflineOVerificando && ahoraDisponible) {
        const esperaJitter = Math.round(Math.random() * 2000);
        if (temporizadorJitterRecuperacion) clearTimeout(temporizadorJitterRecuperacion);
        temporizadorJitterRecuperacion = setTimeout(() => {
          temporizadorJitterRecuperacion = null;
          dispararSincronizacion('recuperacion_red').catch(() => {});
        }, esperaJitter);
      }
      estadoPrevio = conn.estado;
    });

    // 7. Suscribir a eventos sync (pausa en 401)
    desuscribirSyncEventos = suscribirSync((info) => {
      if (info.estado === 'auth') {
        pausadoPorAuth = true;
        notificarCambioScheduler();
      }
    });

    // 8. Evento visibilidad
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Comprobar validez antes de activar: si fue cancelado, no dejar activo en true
    if (!esValido()) {
      detenerSincronizacionAutomatica();
      return detenerSincronizacionAutomatica;
    }

    // 9. activo = true ANTES de programarCicloPeriodico para que el guard interno no lo corte
    activo = true;

    // 10. Ciclo periodico (activo ya es true)
    programarCicloPeriodico();

    // 11. Intento inicial si hay red y pendientes
    const connInicial = obtenerEstadoConexion();
    if (connInicial.estado === 'online' || connInicial.estado === 'degraded') {
      Promise.all([asistenciaRepo.pendientes(1), incidenciaRepo.pendientes(1), contarPendientesFaciales()]).then(([pendientes, incidenciasPendientes, facialesPendientes]) => {
        if (pendientes.length > 0 || incidenciasPendientes.length > 0 || facialesPendientes > 0) {
          dispararSincronizacion('arranque_con_pendientes').catch(() => {});
        }
      }).catch(() => {});
    }

    notificarCambioScheduler();
    return detenerSincronizacionAutomatica;
  })();

  arranqueEnCursoPromise = miPromesa;

  try {
    return await miPromesa;
  } finally {
    if (arranqueEnCursoPromise === miPromesa) {
      arranqueEnCursoPromise = null;
    }
  }
}

/**
 * Detiene el scheduler. Incrementa la generacion para abortar arranques pendientes.
 * Reinicia pausadoPorAuth y syncEnCurso.
 * Limpia CADA recurso en su propio try/catch y llama a detenerConectividad() siempre.
 */
export function detenerSincronizacionAutomatica() {
  generacion += 1;
  activo = false;
  pausadoPorAuth = false;
  syncEnCurso = false;

  try {
    if (temporizadorIntervalo) {
      clearTimeout(temporizadorIntervalo);
      temporizadorIntervalo = null;
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al limpiar temporizadorIntervalo:', e);
  }

  try {
    if (fnHookCreatingIncidencias && typeof db.incidencias_pendientes?.hook === 'function') {
      db.incidencias_pendientes.hook('creating').unsubscribe(fnHookCreatingIncidencias);
      fnHookCreatingIncidencias = null;
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al desuscribir hook de incidencias:', e);
  }

  try {
    if (debounceMarcaTimer) {
      clearTimeout(debounceMarcaTimer);
      debounceMarcaTimer = null;
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al limpiar debounceMarcaTimer:', e);
  }

  try {
    if (temporizadorJitterRecuperacion) {
      clearTimeout(temporizadorJitterRecuperacion);
      temporizadorJitterRecuperacion = null;
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al limpiar temporizadorJitterRecuperacion:', e);
  }

  try {
    if (fnHookCreating && typeof db.asistencias_pendientes?.hook === 'function') {
      db.asistencias_pendientes.hook('creating').unsubscribe(fnHookCreating);
      fnHookCreating = null;
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al desuscribir hook creating:', e);
  }

  try {
    if (desuscribirConectividad) {
      desuscribirConectividad();
      desuscribirConectividad = null;
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al desuscribir conectividad:', e);
  }

  try {
    if (desuscribirSyncEventos) {
      desuscribirSyncEventos();
      desuscribirSyncEventos = null;
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al desuscribir eventos sync:', e);
  }

  try {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  } catch (e) {
    console.warn('[syncScheduler] Error al remover listener visibilidad:', e);
  }

  try {
    detenerConectividad();
  } catch (e) {
    console.warn('[syncScheduler] Error al detener conectividad:', e);
  }

  notificarCambioScheduler();
}
