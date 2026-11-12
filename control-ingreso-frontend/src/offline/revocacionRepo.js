import Dexie from 'dexie';
import { db } from './db.js';
import { ESTADO_SYNC } from './constantes.js';
import { generarUuid } from './uuid.js';

export const revocacionRepo = {
  async encolar({ idIncidencia, idExpulsion, idExamen, motivo }) {
    const clientUuid = generarUuid();
    await db.revocaciones_pendientes.add({
      clientUuid,
      idIncidencia: idIncidencia ? Number(idIncidencia) : null,
      idExpulsion: idExpulsion ? Number(idExpulsion) : null,
      idExamen: idExamen ? Number(idExamen) : null,
      motivo: motivo || '',
      syncStatus: ESTADO_SYNC.PENDIENTE,
      intentos: 0,
      nextRetryAt: 0,
      ultimoError: null,
      sincronizadoEn: null,
    });
    return clientUuid;
  },

  async pendientes(limite = 50) {
    const ahora = Date.now();
    return await db.revocaciones_pendientes
      .where('[syncStatus+nextRetryAt]')
      .between([ESTADO_SYNC.PENDIENTE, Dexie.minKey], [ESTADO_SYNC.PENDIENTE, ahora])
      .limit(limite)
      .toArray();
  },

  async contarPendientes() {
    return await db.revocaciones_pendientes
      .where('syncStatus')
      .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
      .count();
  },

  async marcarEstado(clientUuid, nuevoEstado, extras = {}) {
    const actualizacion = { syncStatus: nuevoEstado, ...extras };
    if (nuevoEstado === ESTADO_SYNC.SINCRONIZADO || nuevoEstado === ESTADO_SYNC.DUPLICADO) {
      actualizacion.sincronizadoEn = Date.now();
    }
    return await db.revocaciones_pendientes.update(clientUuid, actualizacion);
  },

  async revertirSyncingHuerfanos() {
    return await db.revocaciones_pendientes
      .where('syncStatus')
      .equals(ESTADO_SYNC.SYNCING)
      .modify({ syncStatus: ESTADO_SYNC.PENDIENTE, nextRetryAt: 0 });
  },
};