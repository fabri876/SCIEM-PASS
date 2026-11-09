import { db } from './db.js';
import { asistenciaRepo } from './asistenciaRepo.js';
import { incidenciaRepo } from './incidenciaRepo.js';
import { syncLogRepo } from './syncLogRepo.js';
import { configRepo } from './configRepo.js';
import { obtenerDeviceId } from './deviceId.js';
import { generarUuid } from './uuid.js';
import { ESTADO_SYNC, STATUS_ITEM_SYNC } from './constantes.js';
import { strApiBaseUrl } from '../services/apiConfig.js';
import { obtenerToken } from '../services/authService.js';

export const URL_BATCH_SYNC = '/api/v1/asistencias/batch-sync';
// El registro de incidencias es idempotente por `claveSolicitud` y acepta la
// evidencia en la misma petición multipart, por eso la sincronización offline
// reutiliza el endpoint de registro online.
export const URL_INCIDENCIAS = '/api/incidencias';

// Estados devueltos por el backend en batch-sync que NO deben reintentarse
// (datos invalidos o peticion no autorizada: reintentar no cambiaria el resultado).
const ESTADOS_NO_REINTENTABLES = new Set(['NO_AUTORIZADO', 'ERROR_VALIDACION']);

// Suscriptores desacoplados de React
const suscriptores = new Set();
let envioEnCursoLocal = false;

function notificar(estado) {
  for (const fn of suscriptores) {
    try {
      fn(estado);
    } catch (err) {
      console.warn('[syncQueueService] Error en suscriptor:', err);
    }
  }
}

/**
 * Función pura de cálculo de backoff con jitter.
 * min(2000 * 2^intentos, 300000) * (0.5 + Math.random() * 0.5)
 */
export function calcularBackoffMs(intentos = 0) {
  const base = Math.min(2000 * Math.pow(2, Math.max(0, intentos)), 300000);
  const jitter = 0.5 + Math.random() * 0.5;
  return Math.round(base * jitter);
}

/**
 * Reinvierte marcas huérfanas en 'syncing' a 'pendiente' UNA sola vez al iniciar la aplicación.
 * No se llama dentro de sincronizarPendientes.
 */
export async function iniciarSync() {
  await asistenciaRepo.revertirSyncingHuerfanos();
  await asistenciaRepo.recuperarErrores();
}

/**
 * Único lugar donde se construye la estructura del payload hacia el servidor.
 */
export function construirPayload({ batchId, deviceId, items }) {
  return {
    batchId,
    deviceId,
    enviadoEn: new Date().toISOString(),
    items: items.map((item) => ({
      clientUuid: item.clientUuid,
      examenId: item.examenId,
      asignaturaId: item.asignaturaId || null,
      ambienteId: item.ambienteId || null,
      codigoSis: item.codigoSis,
      metodo: item.metodo === 'QR' ? 'QR' : 'MANUAL',
      marcadoEn: item.timestampLocal,
      clockOffsetMs: item.clockOffsetMs || 0,
      rol: item.rol,
      verificacionVisual: Boolean(item.verificacionVisual),
      qrToken: item.qrToken || null,
      // Scores del facial aprobado offline (null si el ingreso fue sin facial).
      scoreFacial: item.scoreFacial ?? null,
      livenessScore: item.livenessScore ?? null,
      modelVersion: item.modelVersion || null,
      deviceId: item.deviceId || null
    }))
  };
}

/**
 * Cliente HTTP por defecto que usa la configuración de API del proyecto.
 * Incluye tiempo límite de 20 s con AbortController.
 */
export async function enviarLoteHttp(payload, timeoutMs = 20000) {
  const token = obtenerToken();
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': payload.batchId
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let resp;
  try {
    resp = await fetch(`${strApiBaseUrl}${URL_BATCH_SYNC}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (errRed) {
    const esTimeout = controller.signal.aborted;
    const error = new Error(
      esTimeout
        ? 'Tiempo de espera agotado al enviar lote (timeout 20s)'
        : (errRed.message || 'Fallo de conexión')
    );
    error.esFalloDeRed = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (resp.status === 401) {
    const err = new Error('Sesión no autorizada (401)');
    err.status = 401;
    throw err;
  }

  if (resp.status === 413) {
    const err = new Error('Carga útil demasiado grande (413)');
    err.status = 413;
    throw err;
  }

  if (resp.status === 429) {
    const retryHeader = resp.headers.get('Retry-After');
    let retryAfterMs = null;
    if (retryHeader) {
      const seg = parseInt(retryHeader, 10);
      if (!Number.isNaN(seg)) {
        retryAfterMs = seg * 1000;
      }
    }
    const err = new Error('Demasiadas solicitudes (429)');
    err.status = 429;
    err.retryAfterMs = retryAfterMs;
    throw err;
  }

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => null);
    const mensaje = errBody?.mensaje || errBody?.error || `Error ${resp.status} del servidor`;
    const err = new Error(mensaje);
    err.status = resp.status;
    throw err;
  }

  return await resp.json();
}

/**
 * Suscribe un callback para recibir actualizaciones del progreso de la cola.
 */
export function suscribirSync(callback) {
  if (typeof callback === 'function') {
    suscriptores.add(callback);
  }
  return () => {
    suscriptores.delete(callback);
  };
}

/**
 * Ejecuta la sincronización asegurando exclusión mutua.
 */
async function conBloqueo(ejecutar) {
  if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
    return await navigator.locks.request('sync-asistencias', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        return {
          enviados: 0,
          procesados: 0,
          duplicados: 0,
          errores: 0,
          itemsConFalloDeLote: 0,
          pendientesRestantes: await asistenciaRepo.contarPendientes(),
          pausadaPorAuth: false,
          huboFalloDeRed: false,
          omitido: true,
          motivo: 'Envío en curso'
        };
      }
      return await ejecutar();
    });
  }

  if (envioEnCursoLocal) {
    return {
      enviados: 0,
      procesados: 0,
      duplicados: 0,
      errores: 0,
      itemsConFalloDeLote: 0,
      pendientesRestantes: await asistenciaRepo.contarPendientes(),
      pausadaPorAuth: false,
      huboFalloDeRed: false,
      omitido: true,
      motivo: 'Envío en curso'
    };
  }

  envioEnCursoLocal = true;
  try {
    return await ejecutar();
  } finally {
    envioEnCursoLocal = false;
  }
}

/**
 * Procesa la cola de asistencias pendientes por lotes hasta vaciarla o hallar un fallo.
 */
export async function sincronizarPendientes({
  enviarLote = enviarLoteHttp,
  tamanoLote = 100,
  origen = 'manual'
} = {}) {
  // 1. Verificación de políticas automáticas
  if (origen === 'automatico') {
    const syncAuto = await configRepo.obtenerConfig('syncAutomatico', true);
    const modoOffline = await configRepo.obtenerConfig('modoOfflineForzado', false);
    if (!syncAuto || modoOffline) {
      return {
        enviados: 0,
        procesados: 0,
        duplicados: 0,
        errores: 0,
        itemsConFalloDeLote: 0,
        pendientesRestantes: await asistenciaRepo.contarPendientes(),
        pausadaPorAuth: false,
        huboFalloDeRed: false,
        omitido: true,
        motivo: !syncAuto ? 'syncAutomatico_desactivado' : 'modoOfflineForzado_activo'
      };
    }
  }

  return await conBloqueo(async () => {
    const deviceId = await obtenerDeviceId();
    const procesadosEnCorrida = new Set();

    let enviadosTotal = 0;
    let procesadosTotal = 0;
    let duplicadosTotal = 0;
    let erroresTotal = 0;
    let itemsConFalloDeLoteTotal = 0;
    let pausadaPorAuth = false;
    let huboFalloDeRed = false;

    let tamanoActual = Math.max(1, tamanoLote);
    let loteEnCurso = [];

    try {
      while (true) {
        // Solicita candidatos excluyendo los ya procesados en esta ejecución
        const candidatos = await asistenciaRepo.pendientes(tamanoActual + procesadosEnCorrida.size);
        const lote = candidatos
          .filter((c) => !procesadosEnCorrida.has(c.clientUuid))
          .slice(0, tamanoActual);

        if (lote.length === 0) {
          break;
        }

        loteEnCurso = lote;

        for (const item of lote) {
          procesadosEnCorrida.add(item.clientUuid);
          await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.SYNCING);
        }

        const pendientesRestantesInicial = await asistenciaRepo.contarPendientes();
        notificar({ estado: 'enviando', pendientesRestantes: pendientesRestantesInicial });

        const batchId = generarUuid();
        const payload = construirPayload({ batchId, deviceId, items: lote });

        let respuesta = null;

        try {
          respuesta = await enviarLote(payload);
          console.log('[syncQueueService] Respuesta cruda del servidor batch-sync:', respuesta);
        } catch (error) {
          const status = error.status;

          // 4.1. Error 401: Sesión expirada -> estado 'auth' y pausa
          if (status === 401) {
            pausadaPorAuth = true;
            for (const item of lote) {
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
                nextRetryAt: 0
              });
            }
            await syncLogRepo.registrarLog({
              batchId,
              total: lote.length,
              exitosos: 0,
              duplicados: 0,
              fallidos: lote.length,
              mensaje: `[${origen}] Pausado por autenticación (401)`
            });
            const pendientesAuth = await asistenciaRepo.contarPendientes();
            notificar({ estado: 'auth', pendientesRestantes: pendientesAuth });
            loteEnCurso = [];
            break;
          }

          // 4.2. Error 413: Payload Too Large
          if (status === 413) {
            if (tamanoActual > 1) {
              tamanoActual = Math.max(1, Math.floor(tamanoActual / 2));
              for (const item of lote) {
                procesadosEnCorrida.delete(item.clientUuid);
                await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
                  nextRetryAt: 0
                });
              }
              loteEnCurso = [];
              continue;
            } else {
              erroresTotal += 1;
              await asistenciaRepo.marcarEstado(lote[0].clientUuid, ESTADO_SYNC.ERROR, {
                ultimoError: 'HTTP_413_ITEM_DEMASIADO_GRANDE'
              });
              await syncLogRepo.registrarLog({
                batchId,
                total: 1,
                exitosos: 0,
                duplicados: 0,
                fallidos: 1,
                mensaje: `[${origen}] Ítem individual excede tamaño máximo permitido (413)`
              });
              loteEnCurso = [];
              continue;
            }
          }

          // 4.3. Error 429: Too Many Requests con Retry-After
          if (status === 429) {
            itemsConFalloDeLoteTotal += lote.length;
            const retryMs = error.retryAfterMs;
            for (const item of lote) {
              const intentos = (item.intentos || 0) + 1;
              const backoff = retryMs != null ? retryMs : calcularBackoffMs(intentos);
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
                intentos,
                nextRetryAt: Date.now() + backoff,
                ultimoError: 'HTTP_429'
              });
            }
            await syncLogRepo.registrarLog({
              batchId,
              total: lote.length,
              exitosos: 0,
              duplicados: 0,
              fallidos: lote.length,
              mensaje: `[${origen}] Límite 429. Reintento en ${retryMs ? retryMs + 'ms' : 'backoff'}`
            });
            loteEnCurso = [];
            break;
          }

          // 4.4. Errores 400 / 422: Error de validación de lote
          if (status === 400 || status === 422) {
            itemsConFalloDeLoteTotal += lote.length;
            for (const item of lote) {
              const intentos = (item.intentos || 0) + 1;
              const backoff = calcularBackoffMs(intentos);
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
                intentos,
                nextRetryAt: Date.now() + backoff,
                ultimoError: `HTTP_${status}: ${error.message}`
              });
            }
            await syncLogRepo.registrarLog({
              batchId,
              total: lote.length,
              exitosos: 0,
              duplicados: 0,
              fallidos: lote.length,
              mensaje: `[${origen}] Error de lote ${status}: ${error.message}`
            });
            loteEnCurso = [];
            break;
          }

          // 4.5. Sin red, timeout o HTTP 5xx
          huboFalloDeRed = Boolean(error.esFalloDeRed || !status || status >= 500);
          itemsConFalloDeLoteTotal += lote.length;

          for (const item of lote) {
            const intentos = (item.intentos || 0) + 1;
            const backoff = calcularBackoffMs(intentos);
            await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
              intentos,
              nextRetryAt: Date.now() + backoff,
              ultimoError: error.message || 'FALLO_CONEXION'
            });
          }

          await syncLogRepo.registrarLog({
            batchId,
            total: lote.length,
            exitosos: 0,
            duplicados: 0,
            fallidos: lote.length,
            mensaje: `[${origen}] Fallo de red/5xx: ${error.message}`
          });
          loteEnCurso = [];
          break;
        }

        // 5. Procesamiento de respuesta 200 con resultados por ítem.
        // El backend responde: { batchId, items: [{ clientUuid, estado, resultado?, mensaje? }] },
        // donde estado ∈ { PROCESADO, DUPLICADO, NO_AUTORIZADO, ERROR_VALIDACION, ERROR }.
        // Se acepta 'resultados'/'status' por compatibilidad, pero 'items'/'estado' es el contrato real.
        const mapaResultados = new Map(
          (respuesta?.items || respuesta?.resultados || []).map((r) => [r.clientUuid, r])
        );

        let exitososLote = 0;
        let duplicadosLote = 0;
        let fallidosLote = 0;

        for (const item of lote) {
          const resItem = mapaResultados.get(item.clientUuid);
          console.log('[syncQueueService] Procesando ítem:', { clientUuid: item.clientUuid, codigoSis: item.codigoSis, estadoServidor: resItem?.estado, resItem });

          if (!resItem) {
            fallidosLote++;
            erroresTotal++;
            const intentos = (item.intentos || 0) + 1;
            const backoff = calcularBackoffMs(intentos);
            await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
              intentos,
              nextRetryAt: Date.now() + backoff,
              ultimoError: 'ITEM_NO_DEVUELTO_POR_SERVIDOR'
            });
            continue;
          }

          // Normaliza el estado del servidor al catalogo interno de la cola.
          const estadoServidor = resItem.estado ?? resItem.status;
          const reintentable = resItem.reintentable !== undefined
            ? resItem.reintentable !== false
            : !ESTADOS_NO_REINTENTABLES.has(estadoServidor);

          if (estadoServidor === STATUS_ITEM_SYNC.PROCESADO) {
            exitososLote++;
            procesadosTotal++;
            await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.SINCRONIZADO);
          } else if (estadoServidor === STATUS_ITEM_SYNC.DUPLICADO) {
            duplicadosLote++;
            duplicadosTotal++;
            await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.DUPLICADO);
          } else {
            fallidosLote++;
            erroresTotal++;
            const strCausa = resItem.mensaje || resItem.codigo || estadoServidor || 'ERROR';
            console.warn('[syncQueueService] Ítem falló:', {
              clientUuid: item.clientUuid,
              codigoSis: item.codigoSis,
              estadoServidor,
              mensaje: strCausa,
              resItem
            });
            if (!reintentable) {
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.ERROR, {
                ultimoError: strCausa
              });
            } else {
              const intentos = (item.intentos || 0) + 1;
              const backoff = calcularBackoffMs(intentos);
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
                intentos,
                nextRetryAt: Date.now() + backoff,
                ultimoError: strCausa
              });
            }
          }
        }

        enviadosTotal += lote.length;
        loteEnCurso = [];

        await syncLogRepo.registrarLog({
          batchId,
          total: lote.length,
          exitosos: exitososLote,
          duplicados: duplicadosLote,
          fallidos: fallidosLote,
          mensaje: `[${origen}] Lote sincronizado (${exitososLote} proc, ${duplicadosLote} dup, ${fallidosLote} err)`
        });
      }
    } catch (errInesperado) {
      // Si ocurre una excepción inesperada, devuelve a 'pendiente' cualquier marca que haya quedado en 'syncing'
      if (loteEnCurso && loteEnCurso.length > 0) {
        for (const item of loteEnCurso) {
          try {
            const actual = await db.asistencias_pendientes.get(item.clientUuid);
            if (actual && actual.syncStatus === ESTADO_SYNC.SYNCING) {
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
                nextRetryAt: 0
              });
            }
          } catch (e) {
            console.warn('[syncQueueService] Error al revertir marca atascada:', e);
          }
        }
      }

      // Notificar a la interfaz que hubo un error para que no se quede mostrando "enviando"
      notificar({ estado: 'error', pendientesRestantes: await asistenciaRepo.contarPendientes() });
      throw errInesperado;
    }

    const pendientesRestantesFinal = await asistenciaRepo.contarPendientes();

    // Notificar solo si no fue pausada por auth
    if (!pausadaPorAuth) {
      const estadoFinal =
        erroresTotal === 0 && itemsConFalloDeLoteTotal === 0 && !huboFalloDeRed ? 'ok' : 'error';
      notificar({ estado: estadoFinal, pendientesRestantes: pendientesRestantesFinal });
    }

    return {
      enviados: enviadosTotal,
      procesados: procesadosTotal,
      duplicados: duplicadosTotal,
      errores: erroresTotal,
      itemsConFalloDeLote: itemsConFalloDeLoteTotal,
      pendientesRestantes: pendientesRestantesFinal,
      pausadaPorAuth,
      huboFalloDeRed,
      omitido: false
    };
  });
}

/** Tiempo máximo para subir una incidencia (con foto puede tardar más). */
const TIMEOUT_ENVIO_INCIDENCIA_MS = 60000;

/** Códigos HTTP que no cambian al reintentar: se marcan como ERROR definitivo. */
const ESTADOS_HTTP_NO_REINTENTABLES = new Set([400, 404, 409, 413, 415, 422]);

/**
 * Envía una incidencia pendiente al backend con multipart/form-data.
 *
 * Se usa el mismo endpoint que el registro online (`POST /api/incidencias`)
 * porque ya es idempotente por `claveSolicitud` y acepta la foto de evidencia
 * en la misma petición. Así la evidencia guardada en IndexedDB se envía junto
 * con la incidencia, sin necesidad de un segundo paso.
 */
async function enviarIncidenciaOffline(item) {
  const formData = new FormData();
  formData.append('claveSolicitud', item.clientUuid);
  formData.append('idAmbiente', String(item.idAmbiente));
  formData.append('tipo', item.tipo);
  formData.append('severidad', item.severidad);
  formData.append('descripcion', item.descripcion);
  formData.append('retirarEstudiante', String(Boolean(item.retirarEstudiante)));

  if (item.codSisEstudiante) {
    formData.append('codSisEstudiante', String(item.codSisEstudiante));
  }

  if (item.evidenciaBlob) {
    const nombre = item.evidenciaNombre || `evidencia-${item.clientUuid}.jpg`;
    formData.append('evidencia', item.evidenciaBlob, nombre);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const temporizador = controller ? setTimeout(() => controller.abort(), TIMEOUT_ENVIO_INCIDENCIA_MS) : null;
  const token = obtenerToken();

  try {
    return await fetch(`${strApiBaseUrl}${URL_INCIDENCIAS}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

/** Sincroniza incidencias offline (con su evidencia, si la tienen). */
export async function sincronizarIncidenciasPendientes({ tamanoLote = 50 } = {}) {
  let procesados = 0;
  let duplicados = 0;
  let errores = 0;

  while (true) {
    const lote = await incidenciaRepo.pendientes(Math.max(1, tamanoLote));
    if (lote.length === 0) break;

    for (const item of lote) {
      await incidenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.SYNCING);
    }

    const batchId = generarUuid();
    let falloRed = null;
    let falloAuth = false;
    let procesadosLote = 0;
    let erroresLote = 0;

    for (const item of lote) {
      // Sesión expirada: la cola espera sin consumir reintentos.
      if (falloAuth) {
        await incidenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
          nextRetryAt: 0,
          ultimoError: 'SESION_EXPIRADA',
        });
        continue;
      }

      // Tras un fallo de red no se insiste con el resto del lote: se
      // reprograma con backoff para no bloquear el ciclo de sincronización.
      if (falloRed) {
        const intentos = (item.intentos || 0) + 1;
        await incidenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
          intentos,
          nextRetryAt: Date.now() + calcularBackoffMs(intentos),
          ultimoError: falloRed.message || 'FALLO_CONEXION',
        });
        errores++;
        erroresLote++;
        continue;
      }

      try {
        const response = await enviarIncidenciaOffline(item);

        if (response.status === 401) {
          const error = new Error('Sesión expirada o no autorizada (401)');
          error.status = 401;
          throw error;
        }

        if (!response.ok) {
          const cuerpo = await response.json().catch(() => null);
          const error = new Error(
            cuerpo?.mensaje || cuerpo?.error || `Error ${response.status} al sincronizar la incidencia.`
          );
          error.status = response.status;
          throw error;
        }

        const resultado = await response.json().catch(() => null);

        // La evidencia ya viajó en esta petición: se borra el blob local para
        // liberar espacio (el archivo queda en Cloudinary).
        const extras = {
          sincronizadoEn: Date.now(),
          idIncidencia: resultado?.idIncidencia || null,
          ultimoError: null,
        };
        if (item.evidenciaBlob) {
          extras.evidenciaBlob = null;
          extras.evidenciaSincronizada = true;
        }

        await incidenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.SINCRONIZADO, extras);

        const expulsiones = await incidenciaRepo.expulsionesPendientesDe(item.clientUuid);
        for (const expulsion of expulsiones) {
          await incidenciaRepo.marcarEstadoExpulsion(expulsion.clientUuid, ESTADO_SYNC.SINCRONIZADO, {
            sincronizadoEn: Date.now(),
            idIncidencia: resultado?.idIncidencia || null,
          });
        }

        procesados++;
        procesadosLote++;
      } catch (error) {
        errores++;
        erroresLote++;

        if (error.status === 401) {
          falloAuth = true;
          await incidenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
            nextRetryAt: 0,
            ultimoError: error.message,
          });
          continue;
        }

        const intentos = (item.intentos || 0) + 1;
        const reintentable = !ESTADOS_HTTP_NO_REINTENTABLES.has(error.status);

        if (!reintentable) {
          // Error de negocio (validación, sin permiso, etc.): reintentar no
          // cambiaría el resultado. Se descarta la foto para no ocupar espacio.
          const extras = {
            intentos,
            nextRetryAt: 0,
            ultimoError: error.message || 'ERROR_VALIDACION',
          };
          if (item.evidenciaBlob) {
            extras.evidenciaBlob = null;
            extras.evidenciaError = error.message || 'ERROR_VALIDACION';
          }
          await incidenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.ERROR, extras);
          continue;
        }

        // Sin red, timeout o 5xx: se reintenta más tarde.
        falloRed = error;
        await incidenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
          intentos,
          nextRetryAt: Date.now() + calcularBackoffMs(intentos),
          ultimoError: error.message || 'FALLO_CONEXION',
        });
      }
    }

    await syncLogRepo.registrarLog({
      batchId,
      total: lote.length,
      exitosos: procesadosLote,
      duplicados: 0,
      fallidos: erroresLote,
      mensaje: '[incidencias] Lote sincronizado',
    });

    if (falloAuth) {
      notificar({ estado: 'auth', pendientesRestantes: await incidenciaRepo.contarPendientes() });
      break;
    }
    if (falloRed) break;
  }

  return { procesados, duplicados, errores, pendientesRestantes: await incidenciaRepo.contarPendientes() };
}

