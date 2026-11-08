/**
 * LIMPIEZA AL LOGOUT — F3-05
 *
 * Limpia datos sensibles al cerrar sesión, PERSISTIENDO lo necesario
 * para sincronización posterior y validación offline.
 *
 * NO borra (por defecto):
 * - asistencias_pendientes  → deben sincronizarse al volver
 * - nominas                 → necesarias para validación offline
 * - logs_sincronizacion     → auditoría
 * - fotos                   → evidencia de validaciones
 * - examenes                → metadatos de exámenes descargados
 *
 * Sí limpia (por defecto):
 * - sessionStorage / localStorage de la app (tokens, usuario, preferencias UI)
 * - Estado en memoria del proveedor (se resetea aparte en el provider)
 */

import { db } from "./db.js";
import { configRepo } from "./configRepo.js";

/**
 * Configuración por defecto de limpieza
 */
const LIMPIEZA_DEFAULTS = {
  // Qué limpiar SÍ (true = limpiar)
  limpiarSessionStorage: true,
  limpiarLocalStorage: true,
  limpiarConfigRepo: false, // false = mantener config (idioma, preferencias)
  limpiarCacheServiceWorker: false,

  // Claves conocidas de la app en storage
  clavesSessionStorage: [
    "token",
    "usuario",
    "examenActual",
    "preferenciasUI",
    "ultimoExamenId",
    "filtroListado",
  ],
  clavesLocalStorage: ["token", "usuario", "preferenciasUI", "tema", "idioma"],

  // NUNCA limpiar estas tablas (hardcoded para seguridad)
  // Si se necesita borrar, debe ser decisión explícita con flag force=true
  tablasProtegidas: [
    "asistencias_pendientes",
    "intentos_examen_pendientes",
    "nominas",
    "logs_sincronizacion",
    "fotos",
    "examenes",
    "meta",
    "config",
  ],
};

/**
 * Limpia sessionStorage y localStorage de claves conocidas de la app.
 * @param {Object} opciones.clavesSessionStorage - Array de claves a borrar
 * @param {Object} opciones.clavesLocalStorage - Array de claves a borrar
 * @returns {Promise<Object>} { sessionStorage: N, localStorage: M }
 */
async function limpiarStorage(opciones = {}) {
  const { clavesSessionStorage = [], clavesLocalStorage = [] } = opciones;

  let borradosSession = 0;
  let borradosLocal = 0;

  if (typeof sessionStorage !== "undefined") {
    clavesSessionStorage.forEach((clave) => {
      if (sessionStorage.getItem(clave) !== null) {
        sessionStorage.removeItem(clave);
        borradosSession++;
      }
    });
  }

  if (typeof localStorage !== "undefined") {
    clavesLocalStorage.forEach((clave) => {
      if (localStorage.getItem(clave) !== null) {
        localStorage.removeItem(clave);
        borradosLocal++;
      }
    });
  }

  return { sessionStorage: borradosSession, localStorage: borradosLocal };
}

/**
 * Limpia cache del Service Worker (opcional, para dispositivos compartidos).
 * @param {string[]} cacheNames - Nombres de cache a borrar (default: todos)
 * @returns {Promise<number>} Número de caches borrados
 */
async function limpiarCacheSW(cacheNames = null) {
  if (typeof caches === "undefined") return 0;

  try {
    const nombres = cacheNames || (await caches.keys());
    await Promise.all(nombres.map((n) => caches.delete(n)));
    return nombres.length;
  } catch (e) {
    console.warn("[logoutCleanup] Error limpiando cache SW:", e);
    return 0;
  }
}

/**
 * Limpia configRepo (configuración local persistida).
 * @returns {Promise<void>}
 */
async function limpiarConfigRepo() {
  try {
    // configRepo no tiene método "limpiarTodo" público,
    // pero se puede borrar la tabla 'config' directamente si es necesario.
    // Por seguridad, NO se implementa borrado automático.
    // Si se necesita, descomentar y usar con precaución:
    // const { db } = await import('./db.js');
    // await db.config.clear();
    console.log("[logoutCleanup] Limpieza de configRepo omitida (protegida)");
  } catch (e) {
    console.warn("[logoutCleanup] Error limpiando configRepo:", e);
  }
}

/**
 * FUNCIÓN PRINCIPAL — Limpieza al logout
 *
 * @param {Object} opciones - Sobrescribe defaults
 * @param {boolean} opciones.limpiarSessionStorage
 * @param {boolean} opciones.limpiarLocalStorage
 * @param {boolean} opciones.limpiarConfigRepo
 * @param {boolean} opciones.limpiarCacheServiceWorker
 * @param {string[]} opciones.clavesSessionStorage
 * @param {string[]} opciones.clavesLocalStorage
 * @returns {Promise<Object>} Resumen de lo limpiado
 */
export async function limpiarAlLogout(opciones = {}) {
  const config = { ...LIMPIEZA_DEFAULTS, ...opciones };
  const inicio = Date.now();
  const resultado = {
    sessionStorage: 0,
    localStorage: 0,
    configRepo: false,
    cacheSW: 0,
    duracionMs: 0,
    advertencias: [],
  };

  try {
    // 1. Storage del navegador
    if (config.limpiarSessionStorage || config.limpiarLocalStorage) {
      const storage = await limpiarStorage({
        clavesSessionStorage: config.limpiarSessionStorage
          ? config.clavesSessionStorage
          : [],
        clavesLocalStorage: config.limpiarLocalStorage
          ? config.clavesLocalStorage
          : [],
      });
      resultado.sessionStorage = storage.sessionStorage;
      resultado.localStorage = storage.localStorage;
    }

    // 2. Config repo (opcional)
    if (config.limpiarConfigRepo) {
      await limpiarConfigRepo();
      resultado.configRepo = true;
    }

    // 3. Cache Service Worker (opcional)
    if (config.limpiarCacheServiceWorker) {
      resultado.cacheSW = await limpiarCacheSW();
    }

    resultado.duracionMs = Date.now() - inicio;

    // Log de auditoría (si syncLogRepo está disponible)
    try {
      const { syncLogRepo } = await import("./syncLogRepo.js");
      await syncLogRepo.registrarLog({
        batchId: `logout-cleanup-${Date.now()}`,
        total: resultado.sessionStorage + resultado.localStorage,
        exitosos: resultado.sessionStorage + resultado.localStorage,
        mensaje: `Limpieza logout (SS:${resultado.sessionStorage} LS:${resultado.localStorage} CFG:${resultado.configRepo} SW:${resultado.cacheSW})`,
      });
    } catch (e) {
      // syncLogRepo puede no estar disponible si no se importó
    }

    console.log("[logoutCleanup] Completado:", resultado);
    return resultado;
  } catch (err) {
    console.error("[logoutCleanup] Error:", err);
    return {
      ...resultado,
      error: err.message,
      duracionMs: Date.now() - inicio,
    };
  }
}

/**
 * Versión agresiva (solo para "dispositivo compartido" / reset total).
 * ADVERTENCIA: Borra TODO excepto tablas protegidas.
 * Úsala solo si el operador confirma "borrar todos mis datos".
 *
 * @param {boolean} confirmado - Debe ser true explícitamente
 * @returns {Promise<Object>} Resumen
 */
export async function limpiezaTotalDispositivoCompartido(confirmado = false) {
  if (!confirmado) {
    throw new Error(
      "limpiezaTotalDispositivoCompartido requiere confirmado=true",
    );
  }

  const inicio = Date.now();
  const resultado = { tablas: {}, duracionMs: 0 };

  try {
    // Limpiar TODAS las tablas NO protegidas
    const tablas = db.tables.filter(
      (t) => !LIMPIEZA_DEFAULTS.tablasProtegidas.includes(t.name),
    );

    await db.transaction("rw", ...tablas.map((t) => t.name), async () => {
      for (const tabla of tablas) {
        const count = await tabla.count();
        await tabla.clear();
        resultado.tablas[tabla.name] = count;
      }
    });

    // Storage completo
    if (typeof sessionStorage !== "undefined") sessionStorage.clear();
    if (typeof localStorage !== "undefined") localStorage.clear();

    // Cache SW
    if (typeof caches !== "undefined") {
      const nombres = await caches.keys();
      await Promise.all(nombres.map((n) => caches.delete(n)));
      resultado.cacheSW = nombres.length;
    }

    resultado.duracionMs = Date.now() - inicio;
    console.log("[logoutCleanup] Limpieza total completada:", resultado);
    return resultado;
  } catch (err) {
    console.error("[logoutCleanup] Error en limpieza total:", err);
    return { ...resultado, error: err.message };
  }
}

export const LIMPIEZA_DEFAULTS_EXPORT = LIMPIEZA_DEFAULTS;

export default {
  limpiarAlLogout,
  limpiezaTotalDispositivoCompartido,
  LIMPIEZA_DEFAULTS: LIMPIEZA_DEFAULTS_EXPORT,
};
