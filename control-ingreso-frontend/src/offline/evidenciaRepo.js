/**
 * Evidencias (fotos) de incidencias registradas sin conexión (HU21, CA11/CA25).
 *
 * La imagen se guarda como Blob en IndexedDB, vinculada al clientUuid de la
 * incidencia pendiente. Cuando la incidencia ya existe en el servidor, la
 * evidencia se sube con su propio reintento y backoff.
 */
import Dexie from 'dexie';
import { db } from './db.js';
import { ESTADO_SYNC } from './constantes.js';
import { generarUuid } from './uuid.js';

export const evidenciaRepo = {
  /**
   * Guarda la foto de una incidencia pendiente.
   * @param {string} incidenciaClientUuid
   * @param {File|Blob} archivo
   */
  async guardar(incidenciaClientUuid, archivo) {
    if (!archivo) return null;
    const clientUuid = generarUuid();
    await db.evidencias_pendientes.add({
      clientUuid,
      incidenciaClientUuid,
      nombre: archivo.name || `evidencia-${clientUuid}.jpg`,
      mime: archivo.type || 'image/jpeg',
      blob: archivo,
      tamano: archivo.size || 0,
      syncStatus: ESTADO_SYNC.PENDIENTE,
      intentos: 0,
      nextRetryAt: 0,
      ultimoError: null,
      creadoEn: new Date().toISOString(),
    });
    return clientUuid;
  },

  async porIncidencia(incidenciaClientUuid) {
    return await db.evidencias_pendientes
      .where('incidenciaClientUuid')
      .equals(incidenciaClientUuid)
      .toArray();
  },

  /** Cuenta evidencias aún no confirmadas por el servidor. */
  async contarPendientes() {
    return await db.evidencias_pendientes
      .where('syncStatus')
      .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
      .count();
  },

  /** Evidencias listas para subir (respetando el backoff). */
  async pendientes(limite = 20) {
    const ahora = Date.now();
    return await db.evidencias_pendientes
      .where('[syncStatus+nextRetryAt]')
      .between([ESTADO_SYNC.PENDIENTE, Dexie.minKey], [ESTADO_SYNC.PENDIENTE, ahora])
      .limit(limite)
      .toArray();
  },

  async marcarEstado(clientUuid, nuevoEstado, extras = {}) {
    return await db.evidencias_pendientes.update(clientUuid, { syncStatus: nuevoEstado, ...extras });
  },

  /** Borra las evidencias vinculadas a una incidencia cancelada localmente. */
  async eliminarPorIncidencia(incidenciaClientUuid) {
    const evidencias = await this.porIncidencia(incidenciaClientUuid);
    for (const ev of evidencias) {
      await db.evidencias_pendientes.delete(ev.clientUuid);
    }
    return evidencias.length;
  },

  async revertirSyncingHuerfanos() {
    await db.evidencias_pendientes
      .where('syncStatus')
      .equals(ESTADO_SYNC.SYNCING)
      .modify({ syncStatus: ESTADO_SYNC.PENDIENTE, nextRetryAt: 0 });
  },
};
