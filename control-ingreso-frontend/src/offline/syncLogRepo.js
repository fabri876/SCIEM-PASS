import { db } from './db.js';
import { generarUuid } from './uuid.js';

export const syncLogRepo = {
  /**
   * Registra el resultado de un lote de sincronización o purga utilizando generarUuid().
   */
  async registrarLog({ batchId, total, exitosos, duplicados = 0, fallidos = 0, mensaje = '' }) {
    return await db.logs_sincronizacion.add({
      batchId: batchId || generarUuid(),
      timestamp: new Date().toISOString(),
      total,
      exitosos,
      duplicados,
      fallidos,
      mensaje
    });
  },

  /**
   * Devuelve los últimos N logs de auditoría ordenados por más reciente.
   */
  async obtenerUltimosLogs(limite = 20) {
    return await db.logs_sincronizacion
      .orderBy('id')
      .reverse()
      .limit(limite)
      .toArray();
  }
};
