import { db } from "./db.js";
import { ESTADO_SYNC } from "./constantes.js";

/**
 * PURGA DE REGISTROS ANTIGUOS (>72h) — F1-06
 *
 * Limpia IndexedDB para evitar:
 * - Cuota de almacenamiento excedida
 * - Rendimiento degradado por miles de registros
 * - Retención innecesaria de datos personales (CI, fotos, QR)
 *
 * NO borra:
 * - Marcas PENDIENTES / SYNCING (aún deben sincronizarse)
 * - Nóminas completas (se necesitan para validación offline)
 * - Configuración / metadatos del dispositivo
 */

/** Umbral en horas (72h = 3 días) */
export const PURGA_HORAS = 72;

/** Milisegundos por hora */
const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Calcula el timestamp de corte: ahora - PURGA_HORAS horas
 * @returns {number} timestamp en milisegundos (epoch ms)
 */
function calcularCorte() {
  return Date.now() - PURGA_HORAS * MS_POR_HORA;
}

/**
 * Purga asistencias pendientes ya procesadas (sincronizado, duplicado, error)
 * que tengan más de 72h.
 *
 * Criterio:
 * - syncStatus IN ('sincronizado', 'duplicado', 'error')
 * - sincronizadoEn < corte  (cuando se marcó como finalizado)
 *
 * NO borra:
 * - 'pendiente'  → aún debe ir al servidor
 * - 'syncing'    → en proceso de envío
 */
export async function purgarAsistenciasProcesadas() {
  const corte = calcularCorte();

  // Estados que SÍ se pueden purgar (ya llegaron al servidor o son definitivos)
  const estadosPurgables = [
    ESTADO_SYNC.SINCRONIZADO,
    ESTADO_SYNC.DUPLICADO,
    ESTADO_SYNC.ERROR,
  ];

  let eliminados = 0;

  // Usar transacción para atomicidad
  await db.transaction(
    "rw",
    [db.asistencias_pendientes, db.logs_sincronizacion],
    async () => {
      // 1. Buscar IDs a eliminar usando filter (no hay índice compuesto para [syncStatus, sincronizadoEn])
      const idsAEliminar = await db.asistencias_pendientes
        .filter(
          (item) =>
            estadosPurgables.includes(item.syncStatus) &&
            item.sincronizadoEn &&
            new Date(item.sincronizadoEn).getTime() < corte,
        )
        .toArray()
        .then((rows) => rows.map((r) => r.clientUuid));

      if (idsAEliminar.length > 0) {
        await db.asistencias_pendientes.bulkDelete(idsAEliminar);
        eliminados = idsAEliminar.length;
      }

      // 2. Log de auditoría de la purga
      const { syncLogRepo } = await import("./syncLogRepo.js");
      await syncLogRepo.registrarLog({
        batchId: `purga-${Date.now()}`,
        total: eliminados,
        exitosos: eliminados,
        mensaje: `Purga asistencias procesadas >${PURGA_HORAS}h (corte: ${new Date(corte).toISOString()})`,
      });
    },
  );

  return eliminados;
}

/**
 * Purga logs de sincronización antiguos (>72h).
 * Los logs se usan solo para auditoría/debug, no son críticos.
 */
export async function purgarLogsSincronizacion() {
  const corte = calcularCorte();
  const corteISO = new Date(corte).toISOString();

  let eliminados = 0;

  await db.transaction("rw", db.logs_sincronizacion, async () => {
    const ids = await db.logs_sincronizacion
      .where("timestamp")
      .below(corteISO)
      .primaryKeys();

    if (ids.length > 0) {
      await db.logs_sincronizacion.bulkDelete(ids);
      eliminados = ids.length;
    }
  });

  return eliminados;
}

/**
 * Purga fotos de estudiantes ya sincronizados.
 * Las fotos ocupan mucho espacio; se conservan solo mientras la marca está pendiente.
 */
export async function purgarFotosHuerfanas() {
  const corte = calcularCorte();
  let eliminados = 0;

  await db.transaction("rw", [db.fotos, db.nominas], async () => {
    // Buscar códigos SIS de estudiantes ya sincronizados (marcadoLocal=1 y marcadoEn < corte)
    // Usar filter porque no hay índice compuesto para [marcadoLocal, marcadoEn]
    const sisSincronizados = await db.nominas
      .filter(
        (item) =>
          item.marcadoLocal === 1 &&
          item.marcadoEn &&
          new Date(item.marcadoEn).getTime() < corte,
      )
      .toArray();

    // Extraer solo los códigos SIS (el segundo elemento de la PK compuesta)
    const codigosSIS = [...new Set(sisSincronizados.map((pk) => pk[1]))];

    if (codigosSIS.length > 0) {
      // Eliminar fotos de esos códigos
      const fotosAEliminar = await db.fotos
        .where("codigoSis")
        .anyOf(codigosSIS)
        .primaryKeys();

      if (fotosAEliminar.length > 0) {
        await db.fotos.bulkDelete(fotosAEliminar);
        eliminados = fotosAEliminar.length;
      }
    }
  });

  return eliminados;
}

/**
 * Opcional: purga nóminas de exámenes finalizados hace >72h
 * Solo si se quiere ahorrar espacio y no se necesita consultar offline.
 * Por defecto NO se ejecuta (las nóminas son necesarias para validación offline).
 */
export async function purgarNominasAntiguas() {
  const corte = calcularCorte();
  let eliminados = 0;

  await db.transaction("rw", db.nominas, async () => {
    // Solo exámenes con fechaExamen < corte Y todos sus estudiantes sincronizados
    // Esto es agresivo; descomentar si se necesita ahorrar espacio crítico
    /*
    const examenesViejos = await db.examenes
      .where('fechaExamen')
      .below(new Date(corte).toISOString())
      .primaryKeys();

    if (examenesViejos.length > 0) {
      // Verificar que todos los estudiantes de esos exámenes estén sincronizados
      for (const exId of examenesViejos) {
        const sinSync = await db.nominas
          .where('examenId')
          .equals(exId)
          .and(e => e.marcadoLocal === 1 && !e.sincronizadoEn)
          .count();

        if (sinSync === 0) {
          // Todos sincronizados → borrar nómina completa del examen
          await db.nominas.where('examenId').equals(exId).delete();
          eliminados++;
        }
      }
    }
    */
  });

  return eliminados;
}

/**
 * EJECUCIÓN PRINCIPAL — Purga completa
 *
 * @param {Object} opciones
 * @param {boolean} opciones.incluirFotos - Si purgar fotos (default: true)
 * @param {boolean} opciones.incluirLogs - Si purgar logs (default: true)
 * @param {boolean} opciones.incluirNominas - Si purgar nóminas antiguas (default: false, agresivo)
 * @returns {Promise<Object>} Resumen de lo purgado
 */
export async function ejecutarPurgaCompleta(opciones = {}) {
  const {
    incluirFotos = true,
    incluirLogs = true,
    incluirNominas = false,
  } = opciones;

  const inicio = Date.now();
  const resultados = {
    asistenciasProcesadas: 0,
    logsSincronizacion: 0,
    fotos: 0,
    nominas: 0,
    duracionMs: 0,
    errores: [],
  };

  try {
    // 1. Asistencias procesadas (lo más importante)
    resultados.asistenciasProcesadas = await purgarAsistenciasProcesadas();

    // 2. Logs de sincronización
    if (incluirLogs) {
      resultados.logsSincronizacion = await purgarLogsSincronizacion();
    }

    // 3. Fotos huérfanas
    if (incluirFotos) {
      resultados.fotos = await purgarFotosHuerfanas();
    }

    // 4. Nóminas antiguas (opcional, agresivo)
    if (incluirNominas) {
      resultados.nominas = await purgarNominasAntiguas();
    }

    resultados.duracionMs = Date.now() - inicio;

    // Log final de purga
    const { syncLogRepo } = await import("./syncLogRepo.js");
    await syncLogRepo.registrarLog({
      batchId: `purga-total-${Date.now()}`,
      total:
        resultados.asistenciasProcesadas +
        resultados.logsSincronizacion +
        resultados.fotos +
        resultados.nominas,
      exitosos:
        resultados.asistenciasProcesadas +
        resultados.logsSincronizacion +
        resultados.fotos +
        resultados.nominas,
      mensaje: `Purga completa >${PURGA_HORAS}h (${resultados.duracionMs}ms)`,
    });
  } catch (err) {
    resultados.errores.push(err.message);
    console.error("[purgeJob] Error en purga:", err);
  }

  return resultados;
}

/**
 * PROGRAMAR PURGA PERIÓDICA
 *
 * @param {Object} opciones
 * @param {number} opciones.intervaloHoras - Cada cuántas horas ejecutar (default: 6)
 * @param {boolean} opciones.ejecutarAlInicio - Ejecutar inmediatamente al cargar (default: true)
 * @returns {Function} Función para cancelar el intervalo (cleanup)
 */
export function programarPurgaPeriodica(opciones = {}) {
  const {
    intervaloHoras = 6,
    ejecutarAlInicio = true,
    ...opcionesPurga
  } = opciones;

  let timerId = null;

  const ejecutar = async () => {
    try {
      await ejecutarPurgaCompleta(opcionesPurga);
    } catch (err) {
      console.warn("[purgeJob] Error en purga programada:", err);
    }
  };

  if (ejecutarAlInicio) {
    // Ejecutar en microtask para no bloquear arranque
    Promise.resolve().then(ejecutar);
  }

  timerId = setInterval(ejecutar, intervaloHoras * 60 * 60 * 1000);

  // Retornar función de cleanup
  return () => {
    if (timerId) clearInterval(timerId);
  };
}

export default {
  PURGA_HORAS,
  ejecutarPurgaCompleta,
  programarPurgaPeriodica,
  purgarAsistenciasProcesadas,
  purgarLogsSincronizacion,
  purgarFotosHuerfanas,
  purgarNominasAntiguas,
};
