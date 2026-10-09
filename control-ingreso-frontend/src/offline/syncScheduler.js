import { db } from './db.js';
import { asistenciaRepo } from './asistenciaRepo.js';
import { solicitarPersistencia } from './almacenamiento.js';
import { sincronizarPendientes, iniciarSync, suscribirSync } from './syncQueueService.js';
import {
  iniciarConectividad,
  detenerConectividad,
  verificarAhora,
  probarConexionReal,
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

  const conn = obtenerEstadoConexion();
  if (conn.estado === 'offline') {
    return;
  }

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

    if (!res?.omitido) {
      ultimaSync = Date.now();
      ultimoResultado = res;
    }

    if (res?.pausadaPorAuth) {
      pausadoPorAuth = true;
    }

    notificarCambioScheduler();
  } catch (err) {
    console.warn(`[syncScheduler] Error en sincronización (${motivo}):`, err);
  } finally {
    syncEnCurso = false;
  }
}

/**
 * Botón manual "Sincronizar ahora".
 * - Si forzado está activo: prueba la red real con probarConexionReal().
 * - Si no está forzado: verifica con verificarAhora().
 * - Si no hay conexión: retorna sin invocar a sincronizarPendientes.
 * - Si res.omitido es true: devuelve con motivo: 'envio_en_curso' sin actualizar ultimaSync ni ultimoResultado.
 */
export async function sincronizarAhora({ enviarLote, tamanoLote } = {}) {
  const conn = obtenerEstadoConexion();
  const pendientesRestantes = await asistenciaRepo.contarPendientes();

  if (conn.forzado) {
    const redReal = await probarConexionReal();
    if (!redReal.ok) {
      return {
        sinConexion: true,
        pendientesRestantes,
        enviados: 0,
        procesados: 0,
        duplicados: 0,
        errores: 0,
        itemsConFalloDeLote: 0
      };
    }
  } else {
    const estadoActualizado = await verificarAhora();
    if (estadoActualizado.estado === 'offline') {
      return {
        sinConexion: true,
        pendientesRestantes,
        enviados: 0,
        procesados: 0,
        duplicados: 0,
        errores: 0,
        itemsConFalloDeLote: 0
      };
    }
  }

  pausadoPorAuth = false;
  notificarCambioScheduler();

  const loteSize =
    tamanoLote ||
    (conn.estado === 'degraded'
      ? configActual.tamanoLoteLento
      : configActual.tamanoLote);

  const res = await sincronizarPendientes({
    enviarLote: enviarLote || configActual.enviarLote,
    tamanoLote: loteSize,
    origen: 'manual'
  });

  if (res?.omitido) {
    return {
      ...res,
      motivo: 'envio_en_curso'
    };
  }

  ultimaSync = Date.now();
  ultimoResultado = res;

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

  temporizadorIntervalo = setTimeout(async () => {
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
    const conn = obtenerEstadoConexion();

    if (visible && (conn.estado === 'online' || conn.estado === 'degraded') && !pausadoPorAuth) {
      const pendientes = await asistenciaRepo.pendientes(1);
      if (pendientes.length > 0) {
        await dispararSincronizacion('intervalo_periodico');
      }
    }

    programarCicloPeriodico();
  }, configActual.intervaloMs);
}

function handleVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    dispararSincronizacion('pestana_visible').catch(() => {});
  }
}

/**
 * Inicia la sincronización automática protegido con contador de generación.
 * Maneja llamadas concurrentes y cancelaciones inmediatas (Strict Mode de React).
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
  // Bucle de sincronización de arranques en curso
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

  // Si activo ya es true tras resolver el bucle, devolver función de detención
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

    // 1. Revertir huérfanos
    try {
      await iniciarSync();
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

    // 4. Iniciar conectividad pasando ping e intervaloPingMs
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
    try {
      db.asistencias_pendientes.hook('creating', fnHookCreating);
    } catch (err) {
      console.warn('[syncScheduler] Error al registrar hook creating:', err);
    }

    // 6. Suscribir a conectividad con temporizadorJitterRecuperacion
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

    // 9. Ciclo periódico
    programarCicloPeriodico();

    if (!esValido()) {
      detenerSincronizacionAutomatica();
      return detenerSincronizacionAutomatica;
    }

    activo = true;

    // Intento inicial si hay red y pendientes
    const connInicial = obtenerEstadoConexion();
    if (connInicial.estado === 'online' || connInicial.estado === 'degraded') {
      asistenciaRepo.pendientes(1).then((pendientes) => {
        if (pendientes.length > 0) {
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
 * Detiene el scheduler. Incrementa la generación para abortar arranques pendientes.
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
