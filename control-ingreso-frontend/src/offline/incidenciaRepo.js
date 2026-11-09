import Dexie from 'dexie';
import { db } from './db.js';
import { ESTADO_SYNC } from './constantes.js';
import { generarUuid } from './uuid.js';

export const incidenciaRepo = {
  async encolar({ idAmbiente, tipo, severidad, descripcion, codSisEstudiante, retirarEstudiante, registradoEn }) {
    const clientUuid = generarUuid();
    await db.incidencias_pendientes.add({
      clientUuid,
      idAmbiente: Number(idAmbiente),
      tipo,
      severidad,
      descripcion,
      codSisEstudiante: codSisEstudiante ? Number(codSisEstudiante) : null,
      retirarEstudiante: Boolean(retirarEstudiante),
      registradoEn: registradoEn || new Date().toISOString(),
      syncStatus: ESTADO_SYNC.PENDIENTE,
      intentos: 0,
      nextRetryAt: 0,
      ultimoError: null,
    });
    return clientUuid;
  },

  async encolarExpulsion({ incidenciaClientUuid, codSisEstudiante, examenId }) {
    const clientUuid = generarUuid();
    const codigoSis = String(codSisEstudiante).trim();
    const idExamen = Number(examenId);
    await db.transaction('rw', [db.expulsiones_pendientes, db.nominas], async () => {
      await db.expulsiones_pendientes.add({
        clientUuid,
        incidenciaClientUuid,
        codSisEstudiante: Number(codSisEstudiante),
        examenId: Number.isInteger(idExamen) && idExamen > 0 ? idExamen : null,
        syncStatus: ESTADO_SYNC.PENDIENTE,
        intentos: 0,
        nextRetryAt: 0,
        ultimoError: null,
      });

      if (Number.isInteger(idExamen) && idExamen > 0 && codigoSis) {
        await db.nominas.update([idExamen, codigoSis], {
          habilitado: false,
          motivoBloqueo: 'EXPULSADO',
        });
      }
    });
    return clientUuid;
  },

  async pendientes(limite = 50) {
    const ahora = Date.now();
    return await db.incidencias_pendientes
      .where('[syncStatus+nextRetryAt]')
      .between([ESTADO_SYNC.PENDIENTE, Dexie.minKey], [ESTADO_SYNC.PENDIENTE, ahora])
      .limit(limite)
      .toArray();
  },

  async contarPendientes() {
    return await db.incidencias_pendientes
      .where('syncStatus')
      .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
      .count();
  },

  async marcarEstado(clientUuid, nuevoEstado, extras = {}) {
    return await db.incidencias_pendientes.update(clientUuid, { syncStatus: nuevoEstado, ...extras });
  },

  async expulsionesPendientesDe(incidenciaClientUuid) {
    return await db.expulsiones_pendientes
      .where('incidenciaClientUuid')
      .equals(incidenciaClientUuid)
      .toArray();
  },

  async marcarEstadoExpulsion(clientUuid, nuevoEstado, extras = {}) {
    return await db.expulsiones_pendientes.update(clientUuid, { syncStatus: nuevoEstado, ...extras });
  },

  async revertirSyncingHuerfanos() {
    await db.transaction('rw', [db.incidencias_pendientes, db.expulsiones_pendientes], async () => {
      await db.incidencias_pendientes.where('syncStatus').equals(ESTADO_SYNC.SYNCING).modify({
        syncStatus: ESTADO_SYNC.PENDIENTE,
        nextRetryAt: 0,
      });
      await db.expulsiones_pendientes.where('syncStatus').equals(ESTADO_SYNC.SYNCING).modify({
        syncStatus: ESTADO_SYNC.PENDIENTE,
        nextRetryAt: 0,
      });
    });
  },
};
