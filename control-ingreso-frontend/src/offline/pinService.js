import { db } from "./db.js";

/**
 * SERVICIO DE PIN LOCAL — SCIEM-PASS
 *
 * Capa de persistencia local en IndexedDB (tabla `configUsuario`)
 * para la configuración y estado del PIN de desbloqueo de pantalla por operador.
 */
export const pinService = {
  /**
   * Guarda o actualiza la configuración de PIN de un operador.
   *
   * @param {Object} datos
   * @param {number|string} datos.idUsuario - Identificador del operador
   * @param {string} datos.pinHash - Hash PBKDF2 del PIN
   * @param {number} [datos.intentosFallidos=0]
   * @param {boolean} [datos.sesionBloqueada=false]
   * @param {string|null} [datos.bloqueadoHasta=null]
   */
  async guardarConfig({
    idUsuario,
    pinHash,
    intentosFallidos = 0,
    sesionBloqueada = false,
    bloqueadoHasta = null,
  }) {
    if (!idUsuario) return;
    await db.configUsuario.put({
      idUsuario: String(idUsuario),
      pinHash,
      fechaCreacion: new Date().toISOString(),
      intentosFallidos,
      sesionBloqueada,
      bloqueadoHasta,
      ultimaInteraccion: new Date().toISOString(),
    });
  },

  /**
   * Obtiene la configuración de un usuario en IndexedDB.
   *
   * @param {number|string} idUsuario
   * @returns {Promise<Object|null>}
   */
  async obtenerConfig(idUsuario) {
    if (!idUsuario) return null;
    return (await db.configUsuario.get(String(idUsuario))) || null;
  },

  /**
   * Obtiene exclusivamente el hash del PIN almacenado para el usuario.
   *
   * @param {number|string} idUsuario
   * @returns {Promise<string|null>}
   */
  async obtenerPinHash(idUsuario) {
    const config = await this.obtenerConfig(idUsuario);
    return config?.pinHash || null;
  },

  /**
   * Indica si el usuario ya tiene un PIN configurado localmente.
   *
   * @param {number|string} idUsuario
   * @returns {Promise<boolean>}
   */
  async tienePinConfigurado(idUsuario) {
    const hash = await this.obtenerPinHash(idUsuario);
    return Boolean(hash);
  },

  /**
   * Actualiza la fecha/hora de última interacción del usuario.
   */
  async actualizarInteraccion(idUsuario) {
    if (!idUsuario) return;
    try {
      await db.configUsuario.update(String(idUsuario), {
        ultimaInteraccion: new Date().toISOString(),
      });
    } catch {}
  },

  /**
   * Marca la pantalla del usuario como bloqueada por inactividad.
   */
  async bloquearSesion(idUsuario) {
    if (!idUsuario) return;
    try {
      await db.configUsuario.update(String(idUsuario), {
        sesionBloqueada: true,
      });
    } catch {}
  },

  /**
   * Desbloquea la sesión y reinicia los contadores de fallos.
   */
  async desbloquearSesion(idUsuario) {
    if (!idUsuario) return;
    try {
      await db.configUsuario.update(String(idUsuario), {
        sesionBloqueada: false,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimaInteraccion: new Date().toISOString(),
      });
    } catch {}
  },

  /**
   * Registra un fallo de PIN y calcula el tiempo de bloqueo si supera los intentos.
   */
  async registrarIntentoFallido(idUsuario) {
    if (!idUsuario) return { intentos: 1, bloqueado: false };
    const row = await this.obtenerConfig(idUsuario);
    const intentos = (row ? row.intentosFallidos || 0 : 0) + 1;
    let bloqueadoHasta = null;

    if (intentos === 3) {
      bloqueadoHasta = new Date(Date.now() + 30 * 1000).toISOString();
    } else if (intentos === 4) {
      bloqueadoHasta = new Date(Date.now() + 60 * 1000).toISOString();
    } else if (intentos >= 5) {
      bloqueadoHasta = new Date(Date.now() + 300 * 1000).toISOString();
    }

    try {
      await db.configUsuario.update(String(idUsuario), {
        intentosFallidos: intentos,
        bloqueadoHasta,
      });
    } catch {}

    return {
      intentos,
      bloqueado: Boolean(bloqueadoHasta),
      bloqueadoHasta,
    };
  },
};
