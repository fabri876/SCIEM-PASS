import { db } from "./db.js";
import { asistenciaRepo } from "./asistenciaRepo.js";
import { incidenciaRepo } from "./incidenciaRepo.js";
import { revocacionRepo } from "./revocacionRepo.js";
import { evidenciaRepo } from "./evidenciaRepo.js";
import { ingresoExcepcionalRepo } from "./ingresoExcepcionalRepo.js";
import { syncLogRepo } from "./syncLogRepo.js";
import { configRepo } from "./configRepo.js";
import { obtenerDeviceId } from "./deviceId.js";
import { generarUuid } from "./uuid.js";
import { ESTADO_SYNC, STATUS_ITEM_SYNC } from "./constantes.js";
import { strApiBaseUrl } from "../services/apiConfig.js";
import { obtenerToken } from "../services/authService.js";

export const URL_BATCH_SYNC = "/api/v1/asistencias/batch-sync";
export const URL_BATCH_SYNC_INCIDENCIAS = "/api/sync/incidencias";
export const URL_SYNC_INGRESOS_EXCEPCIONALES =
  "/api/sync/ingresos-excepcionales";

// Estados devueltos por el backend en batch-sync que NO deben reintentarse
// (datos invalidos o peticion no autorizada: reintentar no cambiaria el resultado).
const ESTADOS_NO_REINTENTABLES = new Set(["NO_AUTORIZADO", "ERROR_VALIDACION"]);

// Suscriptores desacoplados de React
const suscriptores = new Set();
let envioEnCursoLocal = false;

function notificar(estado) {
  for (const fn of suscriptores) {
    try {
      fn(estado);
    } catch (err) {
      console.warn("[syncQueueService] Error en suscriptor:", err);
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
      metodo: item.metodo === "QR" ? "QR" : "MANUAL",
      marcadoEn: item.timestampLocal,
      clockOffsetMs: item.clockOffsetMs || 0,
      rol: item.rol,
      verificacionVisual: Boolean(item.verificacionVisual),
      qrToken: item.qrToken || null,
      // Scores del facial aprobado offline (null si el ingreso fue sin facial).
      scoreFacial: item.scoreFacial ?? null,
      livenessScore: item.livenessScore ?? null,
      modelVersion: item.modelVersion || null,
      deviceId: item.deviceId || null,
      modoRapido: Boolean(item.modoRapido),
      motivoModoRapido: item.motivoModoRapido || null,
    })),
  };
}

/**
 * Cliente HTTP por defecto que usa la configuración de API del proyecto.
 * Incluye tiempo límite de 20 s con AbortController.
 */
export async function enviarLoteHttp(payload, timeoutMs = 20000) {
  const token = obtenerToken();
  const headers = {
    "Content-Type": "application/json",
    "Idempotency-Key": payload.batchId,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let resp;
  try {
    resp = await fetch(`${strApiBaseUrl}${URL_BATCH_SYNC}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (errRed) {
    const esTimeout = controller.signal.aborted;
    const error = new Error(
      esTimeout
        ? "Tiempo de espera agotado al enviar lote (timeout 20s)"
        : errRed.message || "Fallo de conexión",
    );
    error.esFalloDeRed = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (resp.status === 401) {
    const err = new Error("Sesión no autorizada (401)");
    err.status = 401;
    throw err;
  }

  if (resp.status === 413) {
    const err = new Error("Carga útil demasiado grande (413)");
    err.status = 413;
    throw err;
  }

  if (resp.status === 429) {
    const retryHeader = resp.headers.get("Retry-After");
    let retryAfterMs = null;
    if (retryHeader) {
      const seg = parseInt(retryHeader, 10);
      if (!Number.isNaN(seg)) {
        retryAfterMs = seg * 1000;
      }
    }
    const err = new Error("Demasiadas solicitudes (429)");
    err.status = 429;
    err.retryAfterMs = retryAfterMs;
    throw err;
  }

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => null);
    const mensaje =
      errBody?.mensaje || errBody?.error || `Error ${resp.status} del servidor`;
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
  if (typeof callback === "function") {
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
  if (
    typeof navigator !== "undefined" &&
    navigator.locks &&
    typeof navigator.locks.request === "function"
  ) {
    return await navigator.locks.request(
      "sync-asistencias",
      { ifAvailable: true },
      async (lock) => {
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
            motivo: "Envío en curso",
          };
        }
        return await ejecutar();
      },
    );
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
      motivo: "Envío en curso",
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
  origen = "manual",
} = {}) {
  // 1. Verificación de políticas automáticas
  if (origen === "automatico") {
    const syncAuto = await configRepo.obtenerConfig("syncAutomatico", true);
    const modoOffline = await configRepo.obtenerConfig(
      "modoOfflineForzado",
      false,
    );
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
        motivo: !syncAuto
          ? "syncAutomatico_desactivado"
          : "modoOfflineForzado_activo",
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
    // Fallo a nivel de red (sin conexión, DNS, timeout). Se distingue de un 5xx
    // para que la UI pueda decir "sin conexión" en vez de "error del servidor".
    let sinConexion = false;

    let tamanoActual = Math.max(1, tamanoLote);
    let loteEnCurso = [];

    try {
      while (true) {
        // Solicita candidatos excluyendo los ya procesados en esta ejecución
        const candidatos = await asistenciaRepo.pendientes(
          tamanoActual + procesadosEnCorrida.size,
        );
        const lote = candidatos
          .filter((c) => !procesadosEnCorrida.has(c.clientUuid))
          .slice(0, tamanoActual);

        if (lote.length === 0) {
          break;
        }

        loteEnCurso = lote;

        for (const item of lote) {
          procesadosEnCorrida.add(item.clientUuid);
          await asistenciaRepo.marcarEstado(
            item.clientUuid,
            ESTADO_SYNC.SYNCING,
          );
        }

        const pendientesRestantesInicial =
          await asistenciaRepo.contarPendientes();
        notificar({
          estado: "enviando",
          pendientesRestantes: pendientesRestantesInicial,
        });

        const batchId = generarUuid();
        const payload = construirPayload({ batchId, deviceId, items: lote });

        let respuesta = null;

        try {
          respuesta = await enviarLote(payload);
          console.log(
            "[syncQueueService] Respuesta cruda del servidor batch-sync:",
            respuesta,
          );
        } catch (error) {
          const status = error.status;

          // 4.1. Error 401: Sesión expirada -> estado 'auth' y pausa
          if (status === 401) {
            pausadaPorAuth = true;
            for (const item of lote) {
              await asistenciaRepo.marcarEstado(
                item.clientUuid,
                ESTADO_SYNC.PENDIENTE,
                {
                  nextRetryAt: 0,
                },
              );
            }
            await syncLogRepo.registrarLog({
              batchId,
              total: lote.length,
              exitosos: 0,
              duplicados: 0,
              fallidos: lote.length,
              mensaje: `[${origen}] Pausado por autenticación (401)`,
            });
            const pendientesAuth = await asistenciaRepo.contarPendientes();
            notificar({ estado: "auth", pendientesRestantes: pendientesAuth });
            loteEnCurso = [];
            break;
          }

          // 4.2. Error 413: Payload Too Large
          if (status === 413) {
            if (tamanoActual > 1) {
              tamanoActual = Math.max(1, Math.floor(tamanoActual / 2));
              for (const item of lote) {
                procesadosEnCorrida.delete(item.clientUuid);
                await asistenciaRepo.marcarEstado(
                  item.clientUuid,
                  ESTADO_SYNC.PENDIENTE,
                  {
                    nextRetryAt: 0,
                  },
                );
              }
              loteEnCurso = [];
              continue;
            } else {
              erroresTotal += 1;
              await asistenciaRepo.marcarEstado(
                lote[0].clientUuid,
                ESTADO_SYNC.ERROR,
                {
                  ultimoError: "HTTP_413_ITEM_DEMASIADO_GRANDE",
                },
              );
              await syncLogRepo.registrarLog({
                batchId,
                total: 1,
                exitosos: 0,
                duplicados: 0,
                fallidos: 1,
                mensaje: `[${origen}] Ítem individual excede tamaño máximo permitido (413)`,
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
              const backoff =
                retryMs != null ? retryMs : calcularBackoffMs(intentos);
              await asistenciaRepo.marcarEstado(
                item.clientUuid,
                ESTADO_SYNC.PENDIENTE,
                {
                  intentos,
                  nextRetryAt: Date.now() + backoff,
                  ultimoError: "HTTP_429",
                },
              );
            }
            await syncLogRepo.registrarLog({
              batchId,
              total: lote.length,
              exitosos: 0,
              duplicados: 0,
              fallidos: lote.length,
              mensaje: `[${origen}] Límite 429. Reintento en ${retryMs ? retryMs + "ms" : "backoff"}`,
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
              await asistenciaRepo.marcarEstado(
                item.clientUuid,
                ESTADO_SYNC.PENDIENTE,
                {
                  intentos,
                  nextRetryAt: Date.now() + backoff,
                  ultimoError: `HTTP_${status}: ${error.message}`,
                },
              );
            }
            await syncLogRepo.registrarLog({
              batchId,
              total: lote.length,
              exitosos: 0,
              duplicados: 0,
              fallidos: lote.length,
              mensaje: `[${origen}] Error de lote ${status}: ${error.message}`,
            });
            loteEnCurso = [];
            break;
          }

          // 4.5. Sin red, timeout o HTTP 5xx
          huboFalloDeRed = Boolean(
            error.esFalloDeRed || !status || status >= 500,
          );
          sinConexion = Boolean(error.esFalloDeRed);
          itemsConFalloDeLoteTotal += lote.length;

          for (const item of lote) {
            const intentos = (item.intentos || 0) + 1;
            const backoff = calcularBackoffMs(intentos);
            await asistenciaRepo.marcarEstado(
              item.clientUuid,
              ESTADO_SYNC.PENDIENTE,
              {
                intentos,
                nextRetryAt: Date.now() + backoff,
                ultimoError: error.message || "FALLO_CONEXION",
              },
            );
          }

          await syncLogRepo.registrarLog({
            batchId,
            total: lote.length,
            exitosos: 0,
            duplicados: 0,
            fallidos: lote.length,
            mensaje: `[${origen}] Fallo de red/5xx: ${error.message}`,
          });
          loteEnCurso = [];
          break;
        }

        // 5. Procesamiento de respuesta 200 con resultados por ítem.
        // El backend responde: { batchId, items: [{ clientUuid, estado, resultado?, mensaje? }] },
        // donde estado ∈ { PROCESADO, DUPLICADO, NO_AUTORIZADO, ERROR_VALIDACION, ERROR }.
        // Se acepta 'resultados'/'status' por compatibilidad, pero 'items'/'estado' es el contrato real.
        const mapaResultados = new Map(
          (respuesta?.items || respuesta?.resultados || []).map((r) => [
            r.clientUuid,
            r,
          ]),
        );

        let exitososLote = 0;
        let duplicadosLote = 0;
        let fallidosLote = 0;

        for (const item of lote) {
          const resItem = mapaResultados.get(item.clientUuid);
          console.log("[syncQueueService] Procesando ítem:", {
            clientUuid: item.clientUuid,
            codigoSis: item.codigoSis,
            estadoServidor: resItem?.estado,
            resItem,
          });

          if (!resItem) {
            fallidosLote++;
            erroresTotal++;
            const intentos = (item.intentos || 0) + 1;
            const backoff = calcularBackoffMs(intentos);
            await asistenciaRepo.marcarEstado(
              item.clientUuid,
              ESTADO_SYNC.PENDIENTE,
              {
                intentos,
                nextRetryAt: Date.now() + backoff,
                ultimoError: "ITEM_NO_DEVUELTO_POR_SERVIDOR",
              },
            );
            continue;
          }

          // Normaliza el estado del servidor al catalogo interno de la cola.
          const estadoServidor = resItem.estado ?? resItem.status;
          const reintentable =
            resItem.reintentable !== undefined
              ? resItem.reintentable !== false
              : !ESTADOS_NO_REINTENTABLES.has(estadoServidor);

          if (estadoServidor === STATUS_ITEM_SYNC.PROCESADO) {
            exitososLote++;
            procesadosTotal++;
            await asistenciaRepo.marcarEstado(
              item.clientUuid,
              ESTADO_SYNC.SINCRONIZADO,
            );
          } else if (estadoServidor === STATUS_ITEM_SYNC.DUPLICADO) {
            duplicadosLote++;
            duplicadosTotal++;
            await asistenciaRepo.marcarEstado(
              item.clientUuid,
              ESTADO_SYNC.DUPLICADO,
            );
          } else {
            fallidosLote++;
            erroresTotal++;
            const strCausa =
              resItem.mensaje || resItem.codigo || estadoServidor || "ERROR";
            console.warn("[syncQueueService] Ítem falló:", {
              clientUuid: item.clientUuid,
              codigoSis: item.codigoSis,
              estadoServidor,
              mensaje: strCausa,
              resItem,
            });
            if (!reintentable) {
              await asistenciaRepo.marcarEstado(
                item.clientUuid,
                ESTADO_SYNC.ERROR,
                {
                  ultimoError: strCausa,
                },
              );
            } else {
              const intentos = (item.intentos || 0) + 1;
              const backoff = calcularBackoffMs(intentos);
              await asistenciaRepo.marcarEstado(
                item.clientUuid,
                ESTADO_SYNC.PENDIENTE,
                {
                  intentos,
                  nextRetryAt: Date.now() + backoff,
                  ultimoError: strCausa,
                },
              );
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
          mensaje: `[${origen}] Lote sincronizado (${exitososLote} proc, ${duplicadosLote} dup, ${fallidosLote} err)`,
        });
      }
    } catch (errInesperado) {
      // Si ocurre una excepción inesperada, devuelve a 'pendiente' cualquier marca que haya quedado en 'syncing'
      if (loteEnCurso && loteEnCurso.length > 0) {
        for (const item of loteEnCurso) {
          try {
            const actual = await db.asistencias_pendientes.get(item.clientUuid);
            if (actual && actual.syncStatus === ESTADO_SYNC.SYNCING) {
              await asistenciaRepo.marcarEstado(
                item.clientUuid,
                ESTADO_SYNC.PENDIENTE,
                {
                  nextRetryAt: 0,
                },
              );
            }
          } catch (e) {
            console.warn(
              "[syncQueueService] Error al revertir marca atascada:",
              e,
            );
          }
        }
      }

      // Notificar a la interfaz que hubo un error para que no se quede mostrando "enviando"
      notificar({
        estado: "error",
        pendientesRestantes: await asistenciaRepo.contarPendientes(),
      });
      throw errInesperado;
    }

    const pendientesRestantesFinal = await asistenciaRepo.contarPendientes();

    // Notificar solo si no fue pausada por auth
    if (!pausadaPorAuth) {
      const estadoFinal =
        erroresTotal === 0 && itemsConFalloDeLoteTotal === 0 && !huboFalloDeRed
          ? "ok"
          : "error";
      notificar({
        estado: estadoFinal,
        pendientesRestantes: pendientesRestantesFinal,
      });
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
      sinConexion,
      omitido: false,
    };
  });
}

/** Sincroniza incidencias offline; una expulsión vinculada se confirma después de su incidencia. */
export async function sincronizarIncidenciasPendientes({
  tamanoLote = 50,
} = {}) {
  const deviceId = await obtenerDeviceId();
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
    const payload = {
      batchId,
      deviceId,
      enviadoEn: new Date().toISOString(),
      items: lote.map((item) => ({
        clientUuid: item.clientUuid,
        idAmbiente: item.idAmbiente,
        tipo: item.tipo,
        severidad: item.severidad,
        // La acción y sus detalles también viajan: antes se perdían al
        // sincronizar y la incidencia quedaba como "Registro" en el servidor.
        accion: item.accion || "REGISTRO",
        puntajeReducir: item.puntajeReducir ?? null,
        descripcion: item.descripcion,
        detalleTipoOtro: item.detalleTipoOtro || null,
        detalleAccionOtro: item.detalleAccionOtro || null,
        codSisEstudiante: item.codSisEstudiante || null,
        retirarEstudiante: Boolean(item.retirarEstudiante),
        registradoEn: item.registradoEn,
      })),
    };

    let respuesta;
    try {
      const token = obtenerToken();
      const response = await fetch(
        `${strApiBaseUrl}${URL_BATCH_SYNC_INCIDENCIAS}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": batchId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const error = new Error(
          `Error ${response.status} al sincronizar incidencias.`,
        );
        error.status = response.status;
        throw error;
      }
      respuesta = await response.json();
    } catch (error) {
      for (const item of lote) {
        const intentos = (item.intentos || 0) + 1;
        await incidenciaRepo.marcarEstado(
          item.clientUuid,
          ESTADO_SYNC.PENDIENTE,
          {
            intentos,
            nextRetryAt:
              error.status === 401
                ? 0
                : Date.now() + calcularBackoffMs(intentos),
            ultimoError: error.message || "FALLO_CONEXION",
          },
        );
      }
      if (error.status === 401) {
        for (const item of lote) {
          await incidenciaRepo.marcarEstado(
            item.clientUuid,
            ESTADO_SYNC.PENDIENTE,
            {
              nextRetryAt: 0,
            },
          );
        }
        notificar({
          estado: "auth",
          pendientesRestantes: await incidenciaRepo.contarPendientes(),
        });
        break;
      }
      throw error;
    }

    const resultados = new Map(
      (respuesta?.items || []).map((resultado) => [
        resultado.clientUuid,
        resultado,
      ]),
    );
    for (const item of lote) {
      const resultado = resultados.get(item.clientUuid);
      const estado = resultado?.estado;
      if (
        estado === STATUS_ITEM_SYNC.PROCESADO ||
        estado === STATUS_ITEM_SYNC.DUPLICADO
      ) {
        const estadoLocal =
          estado === STATUS_ITEM_SYNC.PROCESADO
            ? ESTADO_SYNC.SINCRONIZADO
            : ESTADO_SYNC.DUPLICADO;
        await incidenciaRepo.marcarEstado(item.clientUuid, estadoLocal, {
          sincronizadoEn: Date.now(),
          idIncidencia: resultado.idIncidencia || null,
        });
        if (resultado?.advertencia) {
          console.warn(
            "[sync] La incidencia se registró pero no se pudo cerrar:",
            resultado.advertencia,
          );
        }
        const expulsiones = await incidenciaRepo.expulsionesPendientesDe(
          item.clientUuid,
        );
        for (const expulsion of expulsiones) {
          await incidenciaRepo.marcarEstadoExpulsion(
            expulsion.clientUuid,
            estadoLocal,
            {
              sincronizadoEn: Date.now(),
              idIncidencia: resultado.idIncidencia || null,
            },
          );
        }
        // La incidencia ya existe en el servidor: subir su evidencia local (CA25).
        if (resultado.idIncidencia) {
          try {
            await subirEvidenciasDeIncidencia(
              item.clientUuid,
              resultado.idIncidencia,
            );
          } catch {
            // La evidencia queda pendiente para el siguiente ciclo.
          }
        } else {
          // El servidor no devolvió el id de la incidencia: la foto no tiene a
          // dónde subirse. Se marca con error para que quede traza en el
          // historial del docente, en vez de quedarse "sin enviar" para siempre.
          await marcarEvidenciasSinDestino(item.clientUuid);
        }
        if (estado === STATUS_ITEM_SYNC.PROCESADO) procesados++;
        else duplicados++;
      } else {
        errores++;
        const intentos = (item.intentos || 0) + 1;
        const reintentable =
          estado !== "ERROR_VALIDACION" && estado !== "NO_AUTORIZADO";
        await incidenciaRepo.marcarEstado(
          item.clientUuid,
          reintentable ? ESTADO_SYNC.PENDIENTE : ESTADO_SYNC.ERROR,
          {
            intentos,
            nextRetryAt: reintentable
              ? Date.now() + calcularBackoffMs(intentos)
              : 0,
            ultimoError:
              resultado?.mensaje || estado || "ITEM_NO_DEVUELTO_POR_SERVIDOR",
          },
        );
      }
    }

    await syncLogRepo.registrarLog({
      batchId,
      total: lote.length,
      exitosos: procesados,
      duplicados,
      fallidos: errores,
      mensaje: "[incidencias] Lote sincronizado",
    });
  }

  if (procesados > 0 || duplicados > 0) {
    try {
      window.dispatchEvent(new Event("incidencias:actualizadas"));
    } catch {
      // Ignorar si window no está disponible.
    }
  }
  return {
    procesados,
    duplicados,
    errores,
    pendientesRestantes: await incidenciaRepo.contarPendientes(),
  };
}

/**
 * Sube las evidencias guardadas para una incidencia ya sincronizada.
 * Se ejecuta después de que el servidor confirma la incidencia.
 */
async function subirEvidenciasDeIncidencia(incidenciaClientUuid, idIncidencia) {
  if (!idIncidencia) return { subidas: 0, errores: 0 };
  const evidencias = await evidenciaRepo.porIncidencia(incidenciaClientUuid);
  let subidas = 0;
  let errores = 0;

  for (const ev of evidencias) {
    if (ev.syncStatus === ESTADO_SYNC.SINCRONIZADO) continue;
    try {
      const formData = new FormData();
      formData.append("evidencia", ev.blob, ev.nombre || "evidencia.jpg");
      const token = obtenerToken();
      const resp = await fetch(
        `${strApiBaseUrl}/api/incidencias/${idIncidencia}/evidencia`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );
      if (resp.status === 409) {
        // La incidencia ya tiene evidencia en el servidor: nada que reintentar.
        await evidenciaRepo.marcarEstado(
          ev.clientUuid,
          ESTADO_SYNC.SINCRONIZADO,
          { sincronizadoEn: Date.now() },
        );
        subidas++;
        continue;
      }
      if (!resp.ok) {
        const error = new Error(`Error ${resp.status} al subir la evidencia.`);
        error.status = resp.status;
        throw error;
      }
      await evidenciaRepo.marcarEstado(
        ev.clientUuid,
        ESTADO_SYNC.SINCRONIZADO,
        { sincronizadoEn: Date.now() },
      );
      subidas++;
    } catch (error) {
      errores++;
      const intentos = (ev.intentos || 0) + 1;
      const reintentable =
        error.status !== 400 && error.status !== 401 && error.status !== 403;
      await evidenciaRepo.marcarEstado(
        ev.clientUuid,
        reintentable ? ESTADO_SYNC.PENDIENTE : ESTADO_SYNC.ERROR,
        {
          intentos,
          nextRetryAt: reintentable
            ? Date.now() + calcularBackoffMs(intentos)
            : 0,
          ultimoError: error.message || "FALLO_CONEXION",
        },
      );
    }
  }

  return { subidas, errores };
}

/**
 * El servidor no devolvió el id de la incidencia, así que la evidencia no se
 * puede subir a ninguna parte. Se marca con error (no reintentable) para que el
 * docente la vea en el historial y no quede colgada "sin enviar" para siempre.
 */
async function marcarEvidenciasSinDestino(incidenciaClientUuid) {
  const evidencias = await evidenciaRepo.porIncidencia(incidenciaClientUuid);
  for (const ev of evidencias) {
    if (ev.syncStatus === ESTADO_SYNC.SINCRONIZADO) continue;
    await evidenciaRepo.marcarEstado(ev.clientUuid, ESTADO_SYNC.ERROR, {
      ultimoError:
        "El servidor no devolvió el id de la incidencia, así que la foto no se pudo subir.",
    });
  }
}

/**
 * Reintenta las evidencias cuya incidencia ya está en el servidor (por ejemplo
 * si la subida falló después de sincronizar la incidencia).
 */
export async function sincronizarEvidenciasPendientes({
  tamanoLote = 20,
} = {}) {
  const lote = await evidenciaRepo.pendientes(Math.max(1, tamanoLote));
  let subidas = 0;
  let errores = 0;

  // Una evidencia por incidencia: la función de subida ya recorre todas las
  // evidencias de la incidencia, así que no hay que repetirla por cada una.
  const incidenciasVistas = new Set();
  for (const ev of lote) {
    if (incidenciasVistas.has(ev.incidenciaClientUuid)) continue;
    incidenciasVistas.add(ev.incidenciaClientUuid);
    const incidencia = await db.incidencias_pendientes.get(
      ev.incidenciaClientUuid,
    );
    const idIncidencia = incidencia?.idIncidencia;
    if (!idIncidencia) continue; // Aún no sincronizó la incidencia: se reintenta luego.
    const res = await subirEvidenciasDeIncidencia(
      ev.incidenciaClientUuid,
      idIncidencia,
    );
    subidas += res.subidas;
    errores += res.errores;
  }

  return {
    subidas,
    errores,
    pendientesRestantes: await evidenciaRepo.contarPendientes(),
  };
}

/**
 * Sincroniza los ingresos excepcionales autorizados offline (HU21). Cada
 * registro viaja en su propia petición multipart porque incluye el respaldo.
 */
export async function sincronizarIngresosExcepcionalesPendientes({
  tamanoLote = 20,
} = {}) {
  const lote = await ingresoExcepcionalRepo.pendientes(Math.max(1, tamanoLote));
  let procesados = 0;
  let duplicados = 0;
  let errores = 0;

  for (const item of lote) {
    await ingresoExcepcionalRepo.marcarEstado(
      item.clientUuid,
      ESTADO_SYNC.SYNCING,
    );
    const formData = new FormData();
    formData.append("idAmbiente", item.idAmbiente);
    formData.append("codSis", item.codSis);
    formData.append("motivo", item.motivo);
    formData.append("observacion", item.observacion);
    if (item.registradoEn) formData.append("registradoEn", item.registradoEn);
    // Clave de solicitud: hace idempotente el reintento en el servidor (HU21).
    if (item.clientUuid) formData.append("clientUuid", item.clientUuid);
    if (item.respaldo)
      formData.append(
        "respaldo",
        item.respaldo,
        item.nombreRespaldo || "respaldo.jpg",
      );

    let respuesta = null;
    try {
      const token = obtenerToken();
      const resp = await fetch(
        `${strApiBaseUrl}${URL_SYNC_INGRESOS_EXCEPCIONALES}`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      );
      if (!resp.ok) {
        const error = new Error(
          `Error ${resp.status} al sincronizar el ingreso excepcional.`,
        );
        error.status = resp.status;
        throw error;
      }
      respuesta = await resp.json();
    } catch (error) {
      errores++;
      const intentos = (item.intentos || 0) + 1;
      const reintentable =
        error.status !== 400 && error.status !== 401 && error.status !== 403;
      await ingresoExcepcionalRepo.marcarEstado(
        item.clientUuid,
        reintentable ? ESTADO_SYNC.PENDIENTE : ESTADO_SYNC.ERROR,
        {
          intentos,
          nextRetryAt: reintentable
            ? Date.now() + calcularBackoffMs(intentos)
            : 0,
          ultimoError: error.message || "FALLO_CONEXION",
        },
      );
      if (error.status === 401) {
        notificar({
          estado: "auth",
          pendientesRestantes: await ingresoExcepcionalRepo.contarPendientes(),
        });
        throw error;
      }
      continue;
    }

    const estado = respuesta?.estado;
    if (
      estado === STATUS_ITEM_SYNC.PROCESADO ||
      estado === STATUS_ITEM_SYNC.DUPLICADO
    ) {
      await ingresoExcepcionalRepo.marcarEstado(
        item.clientUuid,
        estado === STATUS_ITEM_SYNC.DUPLICADO
          ? ESTADO_SYNC.DUPLICADO
          : ESTADO_SYNC.SINCRONIZADO,
        { idIngreso: respuesta?.idIngreso || null, ultimoError: null },
      );
      if (estado === STATUS_ITEM_SYNC.PROCESADO) procesados++;
      else duplicados++;
    } else {
      errores++;
      const intentos = (item.intentos || 0) + 1;
      const reintentable =
        estado !== "ERROR_VALIDACION" && estado !== "NO_AUTORIZADO";
      await ingresoExcepcionalRepo.marcarEstado(
        item.clientUuid,
        reintentable ? ESTADO_SYNC.PENDIENTE : ESTADO_SYNC.ERROR,
        {
          intentos,
          nextRetryAt: reintentable
            ? Date.now() + calcularBackoffMs(intentos)
            : 0,
          ultimoError:
            respuesta?.mensaje || estado || "ITEM_NO_DEVUELTO_POR_SERVIDOR",
        },
      );
    }
  }

  if (procesados > 0 || duplicados > 0) {
    try {
      window.dispatchEvent(new Event("incidencias:actualizadas"));
    } catch {
      // Ignorar si window no está disponible.
    }
  }
  return {
    procesados,
    duplicados,
    errores,
    pendientesRestantes: await ingresoExcepcionalRepo.contarPendientes(),
  };
}

/** Sincroniza revocaciones offline (incidencias y/o expulsiones). */
export async function sincronizarRevocacionesPendientes({
  tamanoLote = 50,
} = {}) {
  const deviceId = await obtenerDeviceId();
  let procesados = 0;
  let errores = 0;

  while (true) {
    const lote = await revocacionRepo.pendientes(Math.max(1, tamanoLote));
    if (lote.length === 0) break;

    for (const item of lote) {
      await revocacionRepo.marcarEstado(item.clientUuid, ESTADO_SYNC.SYNCING);
    }

    for (const item of lote) {
      try {
        const token = obtenerToken();
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        if (item.idExpulsion) {
          const params = new URLSearchParams({ motivo: item.motivo || "" });
          const resp = await fetch(
            `${strApiBaseUrl}/api/examenes/${item.idExamen}/expulsiones/${item.idExpulsion}/revocar?${params.toString()}`,
            { method: "PUT", headers },
          );
          if (!resp.ok) {
            const e = new Error(`Error ${resp.status}`);
            e.status = resp.status;
            throw e;
          }
        }

        if (item.idIncidencia) {
          const resp = await fetch(
            `${strApiBaseUrl}/api/incidencias/${item.idIncidencia}/cierre`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({ resolucion: item.motivo || "Revocada" }),
            },
          );
          if (!resp.ok) {
            const e = new Error(`Error ${resp.status}`);
            e.status = resp.status;
            throw e;
          }
        }

        await revocacionRepo.marcarEstado(
          item.clientUuid,
          ESTADO_SYNC.SINCRONIZADO,
          { sincronizadoEn: Date.now() },
        );
        procesados++;
      } catch (error) {
        errores++;
        const intentos = (item.intentos || 0) + 1;
        await revocacionRepo.marcarEstado(
          item.clientUuid,
          ESTADO_SYNC.PENDIENTE,
          {
            intentos,
            nextRetryAt:
              error.status === 401
                ? 0
                : Date.now() + calcularBackoffMs(intentos),
            ultimoError: error.message || "FALLO_CONEXION",
          },
        );
        if (error.status === 401) {
          for (const item of lote) {
            await revocacionRepo.marcarEstado(
              item.clientUuid,
              ESTADO_SYNC.PENDIENTE,
              {
                nextRetryAt: 0,
              },
            );
          }
          notificar({
            estado: "auth",
            pendientesRestantes: await revocacionRepo.contarPendientes(),
          });
          break;
        }
      }
    }
  }

  if (procesados > 0) {
    try {
      window.dispatchEvent(new Event("incidencias:actualizadas"));
    } catch {}
  }
  return {
    procesados,
    errores,
    pendientesRestantes: await revocacionRepo.contarPendientes(),
  };
}
