import { db } from './db.js';
import { asistenciaRepo } from './asistenciaRepo.js';
import { syncLogRepo } from './syncLogRepo.js';
import { configRepo } from './configRepo.js';
import { obtenerDeviceId } from './deviceId.js';
import { generarUuid } from './uuid.js';
import { ESTADO_SYNC, STATUS_ITEM_SYNC } from './constantes.js';
import { strApiBaseUrl } from '../services/apiConfig.js';
import { obtenerToken } from '../services/authService.js';

export const URL_BATCH_SYNC = '/api/v1/asistencias/batch-sync';

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
  return await asistenciaRepo.revertirSyncingHuerfanos();
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
      codigoSis: item.codigoSis,
      metodo: item.metodo === 'QR' ? 'QR' : 'MANUAL',
      marcadoEn: item.timestampLocal,
      clockOffsetMs: item.clockOffsetMs || 0,
      rol: item.rol,
      verificacionVisual: Boolean(item.verificacionVisual),
      qrToken: item.qrToken || null
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

        // 5. Procesamiento de respuesta 200 con resultados por ítem
        const mapaResultados = new Map(
          (respuesta?.resultados || []).map((r) => [r.clientUuid, r])
        );

        let exitososLote = 0;
        let duplicadosLote = 0;
        let fallidosLote = 0;

        for (const item of lote) {
          const resItem = mapaResultados.get(item.clientUuid);

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

          if (resItem.status === STATUS_ITEM_SYNC.PROCESADO) {
            exitososLote++;
            procesadosTotal++;
            await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.SINCRONIZADO);
          } else if (resItem.status === STATUS_ITEM_SYNC.DUPLICADO) {
            duplicadosLote++;
            duplicadosTotal++;
            await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.DUPLICADO);
          } else {
            fallidosLote++;
            erroresTotal++;
            if (resItem.reintentable === false) {
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.ERROR, {
                ultimoError: resItem.codigo || resItem.mensaje || 'ERROR_NO_REINTENTABLE'
              });
            } else {
              const intentos = (item.intentos || 0) + 1;
              const backoff = calcularBackoffMs(intentos);
              await asistenciaRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.PENDIENTE, {
                intentos,
                nextRetryAt: Date.now() + backoff,
                ultimoError: resItem.codigo || resItem.mensaje || 'ERROR_REINTENTABLE'
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
