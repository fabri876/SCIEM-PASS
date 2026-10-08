import { db } from './db.js';

export const CONFIG_DEFAULTS = {
  syncAutomatico: true,
  modoOfflineForzado: false
};

export const configRepo = {
  /**
   * Obtiene un valor de configuración de la tabla meta.
   * Si no existe, retorna el valor por defecto indicado.
   */
  async obtenerConfig(clave, defecto = undefined) {
    const valorDefecto = defecto !== undefined ? defecto : CONFIG_DEFAULTS[clave];
    const registro = await db.meta.get(clave);
    if (!registro || registro.valor === undefined) {
      return valorDefecto;
    }
    return registro.valor;
  },

  /**
   * Guarda un parámetro de configuración en la tabla meta.
   */
  async guardarConfig(clave, valor) {
    return await db.meta.put({
      clave,
      valor,
      actualizadoEn: new Date().toISOString()
    });
  }
};
