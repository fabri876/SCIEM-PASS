import { db } from './db.js';

/**
 * Capa de acceso a IndexedDB para configuración de PIN y sesión por usuario.
 * Tabla: configUsuario (idUsuario PK)
 */
export const pinService = {
  /**
   * Guarda o actualiza la configuración de PIN de un usuario.
   * @param {Object} datos
   * @param {number} datos.idUsuario
   * @param {string} datos.pinHash - hash SHA-256 del PIN
   * @param {number} [datos.intentosFallidos=0]
   * @param {boolean} [datos.sesionBloqueada=false]
   * @param {string|null} [datos.bloqueadoHasta=null]
   */
  async guardarConfig({ idUsuario, pinHash, intentosFallidos = 0, sesionBloqueada = false, bloqueadoHasta = null }) {
    await db.configUsuario.put({
      idUsuario,
      pinHash,
      fechaCreacion: new Date().toISOString(),
      intentosFallidos,
      sesionBloqueada,
      bloqueadoHasta,
      ultimaInteraccion: new Date().toISOString()
    });
  },

  /**
   * Obtiene la fila completa de configuración de un usuario.
   */
  async obtenerConfig(idUsuario) {
    return await db.configUsuario.get(idUsuario);
  },

  /**
   * Obtiene solo el pinHash de un usuario.
   */
  async obtenerPinHash(idUsuario) {
    const row = await db.configUsuario.get(idUsuario);
    return row ? row.pinHash : null;
  },

  /**
   * Actualiza la marca de tiempo de última interacción.
   */
  async actualizarInteraccion(idUsuario) {
    await db.configUsuario.update(idUsuario, {
      ultimaInteraccion: new Date().toISOString()
    });
  },

  /**
   * Marca la sesión como bloqueada por inactividad.
   */
  async bloquearSesion(idUsuario) {
    await db.configUsuario.update(idUsuario, { sesionBloqueada: true });
  },

  /**
   * Desbloquea la sesión y reinicia contadores.
   */
  async desbloquearSesion(idUsuario) {
    await db.configUsuario.update(idUsuario, {
      sesionBloqueada: false,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      ultimaInteraccion: new Date().toISOString()
    });
  },

  /**
   * Registra un intento fallido de PIN. Retorna true si se alcanzó el límite de bloqueo.
   */
  async registrarIntentoFallido(idUsuario) {
    const row = await db.configUsuario.get(idUsuario);
    const intentos = (row ? row.intentosFallidos : 0) + 1;
    const bloqueadoHasta = intentos >= 3
      ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
      : null;
    await db.configUsuario.update(idUsuario, {
      intentosFallidos: intentos,
      bloqueadoHasta
    });
    return intentos >= 3;
  }
};
