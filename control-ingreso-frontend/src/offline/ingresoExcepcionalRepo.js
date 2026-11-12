/**
 * Ingresos excepcionales registrados sin conexión (HU21).
 *
 * El respaldo fotográfico se guarda como Blob y se envía en la misma petición
 * de sincronización. Al encolar se marca al estudiante como ingresado en la
 * nómina local para que el control de ingreso y la validación offline lo vean
 * de inmediato.
 */
import Dexie from 'dexie';
import { db } from './db.js';
import { ESTADO_SYNC } from './constantes.js';
import { generarUuid } from './uuid.js';
import { normalizarCodigo } from './normalize.js';

export const ingresoExcepcionalRepo = {
  async encolar({
    idExamen,
    idAmbiente,
    codSis,
    motivo,
    observacion,
    respaldo = null,
    registradoEn = null,
    autorizadoPor = null,
    nombreEstudiante = null,
    aula = null,
    asignatura = null,
  }) {
    const clientUuid = generarUuid();
    const hora = registradoEn || new Date().toISOString();
    const exId = Number(idExamen);
    const sis = normalizarCodigo(codSis);

    await db.transaction('rw', [db.ingresos_excepcionales_pendientes, db.nominas], async () => {
      await db.ingresos_excepcionales_pendientes.add({
        clientUuid,
        idExamen: Number.isInteger(exId) && exId > 0 ? exId : null,
        idAmbiente: idAmbiente != null ? Number(idAmbiente) : null,
        codSis: codSis != null ? Number(codSis) : null,
        motivo,
        observacion,
        respaldo,
        nombreRespaldo: respaldo?.name || null,
        mimeRespaldo: respaldo?.type || null,
        registradoEn: hora,
        autorizadoPor,
        nombreEstudiante,
        aula,
        asignatura,
        syncStatus: ESTADO_SYNC.PENDIENTE,
        intentos: 0,
        nextRetryAt: 0,
        ultimoError: null,
        sincronizadoEn: null,
      });

      if (Number.isInteger(exId) && exId > 0 && sis) {
        await db.nominas.update([exId, sis], {
          marcadoLocal: 1,
          marcadoEn: hora,
          marcadoPor: autorizadoPor,
        });
      }
    });
    return clientUuid;
  },

  async pendientes(limite = 20) {
    const ahora = Date.now();
    return await db.ingresos_excepcionales_pendientes
      .where('[syncStatus+nextRetryAt]')
      .between([ESTADO_SYNC.PENDIENTE, Dexie.minKey], [ESTADO_SYNC.PENDIENTE, ahora])
      .limit(limite)
      .toArray();
  },

  async contarPendientes() {
    return await db.ingresos_excepcionales_pendientes
      .where('syncStatus')
      .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
      .count();
  },

  /** Registros locales aún no confirmados (pendientes, en envío o con error). */
  async listarLocales({ idExamen = null, idAmbiente = null } = {}) {
    const todos = await db.ingresos_excepcionales_pendientes.toArray();
    return todos
      .filter((item) => item.syncStatus !== ESTADO_SYNC.SINCRONIZADO && item.syncStatus !== ESTADO_SYNC.DUPLICADO)
      .filter((item) => !idExamen || Number(item.idExamen) === Number(idExamen))
      .filter((item) => !idAmbiente || Number(item.idAmbiente) === Number(idAmbiente))
      .sort((a, b) => String(b.registradoEn).localeCompare(String(a.registradoEn)));
  },

  async marcarEstado(clientUuid, nuevoEstado, extras = {}) {
    const actualizacion = { syncStatus: nuevoEstado, ...extras };
    if (nuevoEstado === ESTADO_SYNC.SINCRONIZADO || nuevoEstado === ESTADO_SYNC.DUPLICADO) {
      actualizacion.sincronizadoEn = Date.now();
    }
    return await db.ingresos_excepcionales_pendientes.update(clientUuid, actualizacion);
  },

  async revertirSyncingHuerfanos() {
    return await db.ingresos_excepcionales_pendientes
      .where('syncStatus')
      .equals(ESTADO_SYNC.SYNCING)
      .modify({ syncStatus: ESTADO_SYNC.PENDIENTE, nextRetryAt: 0 });
  },
};
