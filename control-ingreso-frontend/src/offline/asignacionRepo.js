import { db } from './db.js';
import { ERROR_ASISTENCIA } from './constantes.js';

export const asignacionRepo = {
  /**
   * Guarda o actualiza un lote de asignaciones de operadores para un examen.
   * Cada asignación: { idExamen, idAmbiente, idUsuario, apellidoDesde, apellidoHasta, modoAsignacion, nombreOperador? }
   */
  async guardarAsignaciones(examenId, asignaciones) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      const error = new Error('El examenId debe ser un número entero positivo.');
      error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
      throw error;
    }

    if (!Array.isArray(asignaciones) || asignaciones.length === 0) {
      return { guardados: 0 };
    }

    const ahora = Date.now();
    const aGuardar = asignaciones.map((a) => ({
      idExamen: exId,
      idAmbiente: Number(a.idAmbiente),
      idUsuario: Number(a.idUsuario),
      apellidoDesde: a.apellidoDesde || null,
      apellidoHasta: a.apellidoHasta || null,
      modoAsignacion: a.modoAsignacion || 'SUBDIVISION',
      nombreOperador: a.nombreOperador || '',
      actualizadoEn: ahora,
    }));

    return await db.transaction('rw', db.asignacionesOperadores, async () => {
      await db.asignacionesOperadores.bulkPut(aGuardar);
      return { guardados: aGuardar.length };
    });
  },

  /**
   * Obtiene el rango de apellidos y modo de asignación de un operador
   * para un examen y aula específicos.
   * Devuelve: { idExamen, idAmbiente, idUsuario, apellidoDesde, apellidoHasta, modoAsignacion, nombreOperador } o null
   */
  async obtenerRangoOperador(examenId, idUsuario, idAmbiente = null) {
    const exId = Number(examenId);
    const uId = Number(idUsuario);
    if (!Number.isInteger(exId) || exId <= 0 || !Number.isInteger(uId) || uId <= 0) {
      return null;
    }

    if (idAmbiente != null) {
      const ambId = Number(idAmbiente);
      if (!Number.isInteger(ambId) || ambId <= 0) return null;
      return await db.asignacionesOperadores
        .where('[idExamen+idAmbiente+idUsuario]')
        .equals([exId, ambId, uId])
        .first();
    }

    // Si no se pasa ambiente, devolver la primera asignación del operador en ese examen
    return await db.asignacionesOperadores
      .where('idExamen')
      .equals(exId)
      .filter((a) => a.idUsuario === uId)
      .first();
  },

  /**
   * Obtiene todas las asignaciones de un examen (para todos los operadores y aulas).
   */
  async obtenerAsignacionesExamen(examenId) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) return [];
    return await db.asignacionesOperadores.where('idExamen').equals(exId).toArray();
  },

  /**
   * Verifica si un operador tiene alguna asignación activa en un examen.
   */
  async existeAsignacion(examenId, idUsuario) {
    const exId = Number(examenId);
    const uId = Number(idUsuario);
    if (!Number.isInteger(exId) || exId <= 0 || !Number.isInteger(uId) || uId <= 0) {
      return false;
    }
    const cuenta = await db.asignacionesOperadores
      .where('idExamen')
      .equals(exId)
      .filter((a) => a.idUsuario === uId)
      .count();
    return cuenta > 0;
  },

  /**
   * Elimina todas las asignaciones de un examen.
   */
  async limpiarAsignacionesExamen(examenId) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      const error = new Error('El examenId debe ser un número entero positivo.');
      error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
      throw error;
    }
    return await db.asignacionesOperadores.where('idExamen').equals(exId).delete();
  },
};
