import { db } from './db.js';
import { ESTADO_SYNC, ERROR_ASISTENCIA } from './constantes.js';
import { obtenerEstadoConexion } from './connectivityService.js';

// Memoria volátil para seguimiento del origen de la última carga
const mapaUltimoOrigen = new Map();
const suscriptoresOrigen = new Set();

function construirClaveMeta(consulta, usuarioId) {
  if (consulta === 'proximos') return 'examenes:proximos:publico';
  if (!usuarioId) return null;
  return `examenes:${consulta}:${String(usuarioId)}`;
}

function notificarOrigen(consulta, usuarioId, estado) {
  const uId = consulta === 'proximos' ? 'publico' : (usuarioId ? String(usuarioId) : 'sin-usuario');
  const claveInterna = `${consulta}:${uId}`;
  mapaUltimoOrigen.set(claveInterna, estado);

  suscriptoresOrigen.forEach((cb) => {
    try {
      cb({ consulta, usuarioId: uId, ...estado });
    } catch {
      // Un suscriptor roto no rompe a los demás
    }
  });
}

function estaSinConexion() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  try {
    const conn = obtenerEstadoConexion();
    if (conn && conn.forzado === true) {
      return true;
    }
  } catch {
    // Si no está inicializado, nos basamos en navigator.onLine
  }
  return false;
}

export const examenRepo = {
  /**
   * Obtiene la lista original de exámenes del snapshot en db.meta (o []).
   * No transforma ni reordena ningún elemento.
   */
  async listarExamenes({ clave, usuarioId = null } = {}) {
    if (!clave) return [];
    if (clave !== 'proximos' && !usuarioId) return [];
    const claveMeta = construirClaveMeta(clave, usuarioId);
    const snapshot = await db.meta.get(claveMeta);
    return Array.isArray(snapshot?.items) ? snapshot.items : [];
  },

  /**
   * Busca en el snapshot 'mis-examenes' de ese usuario el elemento cuyo idExamen
   * sea exactamente id (evaluando solo idExamen, nunca idAsignatura ni intId).
   */
  async obtenerExamen(id, { usuarioId = null } = {}) {
    if (id === null || id === undefined) return null;
    if (!usuarioId) return null;
    const claveMeta = construirClaveMeta('mis-examenes', usuarioId);
    const snapshot = await db.meta.get(claveMeta);
    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];

    return items.find((item) => item && item.idExamen !== undefined && String(item.idExamen) === String(id)) || null;
  },

  /**
   * Borra los snapshots de un usuario SOLO si no hay marcas pendientes ni 'syncing' en el dispositivo.
   */
  async limpiarExamenesDeUsuario(usuarioId) {
    if (!usuarioId) return 0;
    const uId = String(usuarioId);

    const pendientes = await db.asistencias_pendientes
      .where('syncStatus')
      .anyOf([ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING])
      .count();

    if (pendientes > 0) {
      const error = new Error('No se pueden limpiar los exámenes del usuario: existen marcas pendientes.');
      error.codigo = ERROR_ASISTENCIA.TIENE_MARCAS_PENDIENTES;
      throw error;
    }

    const todos = await db.meta.toArray();
    const aBorrar = todos.filter((m) => m.clave?.startsWith('examenes:') && m.usuarioId === uId);

    let borrados = 0;
    for (const item of aBorrar) {
      await db.meta.delete(item.clave);
      borrados++;
    }
    return borrados;
  },

  /**
   * Borra snapshots de OTROS usuarios (no el actual ni 'publico') con más de `dias` días,
   * solo si no hay marcas pendientes en el dispositivo.
   */
  async limpiarExamenes({ usuarioId = null, dias = 30 } = {}) {
    const pendientes = await db.asistencias_pendientes
      .where('syncStatus')
      .anyOf([ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING])
      .count();

    if (pendientes > 0) {
      return 0;
    }

    const uIdActual = usuarioId ? String(usuarioId) : null;
    const limiteMs = Date.now() - dias * 24 * 60 * 60 * 1000;
    const todos = await db.meta.toArray();

    const aBorrar = todos.filter((m) => {
      if (!m.clave?.startsWith('examenes:')) return false;
      if (m.usuarioId === 'publico' || m.usuarioId === null) return false;
      if (uIdActual && m.usuarioId === uIdActual) return false;
      return m.guardadoEn && m.guardadoEn < limiteMs;
    });

    let borrados = 0;
    for (const item of aBorrar) {
      await db.meta.delete(item.clave);
      borrados++;
    }
    return borrados;
  },
};

/**
 * Consulta y orquesta la carga de exámenes con snapshot local en db.meta.
 */
export async function cargarExamenesConRespaldo({
  clave,
  fetcher,
  usuarioId = null,
  timeoutMs = 5000,
}) {
  if (!clave || typeof fetcher !== 'function') {
    throw new Error('cargarExamenesConRespaldo requiere "clave" y una función "fetcher".');
  }

  const esClaveUsuario = clave !== 'proximos';
  const usuarioSnapshot = clave === 'proximos' ? 'publico' : (usuarioId ? String(usuarioId) : null);
  const sinUsuarioEnClaveUsuario = esClaveUsuario && !usuarioId;

  const claveMeta = construirClaveMeta(clave, usuarioSnapshot);

  // 1. Salta la petición SOLO si navigator.onLine === false o modo offline forzado está activo
  if (estaSinConexion()) {
    if (sinUsuarioEnClaveUsuario) {
      return {
        examenes: [],
        origen: 'local',
        sinUsuario: true,
      };
    }

    const snapshot = await db.meta.get(claveMeta);
    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    const guardadoEn = snapshot?.guardadoEn || null;

    notificarOrigen(clave, usuarioSnapshot, { origen: 'local', guardadoEn, sesionExpirada: false });

    return {
      examenes: items,
      origen: 'local',
      guardadoEn,
    };
  }

  // 2. Ajuste de timeout: si el ping está 'offline' pero navigator.onLine es true, timeout de 2500 ms
  let timeoutEfectivo = timeoutMs;
  try {
    const conn = obtenerEstadoConexion();
    if (conn && conn.estado === 'offline' && !conn.forzado && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      timeoutEfectivo = Math.min(timeoutMs, 2500);
    }
  } catch {
    // Mantener timeoutMs por defecto
  }

  // 3. Ejecución de Red con Timeout (try / finally)
  const controller = new AbortController();
  let timerId = null;

  try {
    const promesaTimeout = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        controller.abort();
        const err = new Error(`Timeout de red (${timeoutEfectivo} ms)`);
        err.name = 'TimeoutError';
        reject(err);
      }, timeoutEfectivo);
    });

    const res = await Promise.race([
      fetcher({ signal: controller.signal }),
      promesaTimeout,
    ]);

    clearTimeout(timerId);
    timerId = null;

    // Acepta arreglo directo, { content: [...] } o { items: [...] }
    let items = [];
    if (Array.isArray(res)) {
      items = res;
    } else if (res && typeof res === 'object') {
      if (Array.isArray(res.content)) items = res.content;
      else if (Array.isArray(res.items)) items = res.items;
    }

    const ahora = Date.now();

    // Si es clave de usuario pero no hay usuarioId: SÍ devolvemos los datos de red, SIN guardar snapshot
    if (sinUsuarioEnClaveUsuario) {
      return {
        examenes: items,
        origen: 'red',
        guardadoEn: ahora,
      };
    }

    // Guardar snapshot en db.meta en su propio try/catch
    let respaldoFallo = false;
    try {
      await db.meta.put({
        clave: claveMeta,
        consulta: clave,
        usuarioId: usuarioSnapshot,
        items,
        guardadoEn: ahora,
      });
    } catch {
      respaldoFallo = true;
    }

    notificarOrigen(clave, usuarioSnapshot, { origen: 'red', guardadoEn: ahora, sesionExpirada: false });

    return {
      examenes: items,
      origen: 'red',
      guardadoEn: ahora,
      ...(respaldoFallo ? { respaldoFallo: true } : {}),
    };
  } catch (error) {
    const status = error?.status;

    // Cae a lo local SOLO ante:
    // - Error sin status (error de red o timeout)
    // - Timeout (name === 'TimeoutError' o controller abortado)
    // - 5xx (error de servidor)
    // - 401 (sesión expirada)
    // Cualquier otro 4xx (400, 404...) y el 403 se PROPAGAN (lanza el error).
    const esTimeout = error?.name === 'TimeoutError' || (controller.signal.aborted && !status);
    const esErrorRedSinStatus = status === undefined || status === null;
    const es5xx = typeof status === 'number' && status >= 500 && status <= 599;
    const es401 = status === 401;

    if (esTimeout || esErrorRedSinStatus || es5xx || es401) {
      if (sinUsuarioEnClaveUsuario) {
        return {
          examenes: [],
          origen: 'local',
          sinUsuario: true,
        };
      }

      const snapshot = await db.meta.get(claveMeta);
      const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
      const guardadoEn = snapshot?.guardadoEn || null;

      notificarOrigen(clave, usuarioSnapshot, {
        origen: 'local',
        guardadoEn,
        sesionExpirada: es401,
      });

      const resultado = {
        examenes: items,
        origen: 'local',
        guardadoEn,
      };

      if (es401) {
        resultado.sesionExpirada = true;
      }
      if (esTimeout || esErrorRedSinStatus || es5xx) {
        resultado.errorRed = error?.message || 'Error de conexión';
      }

      return resultado;
    }

    // 403 y otros 4xx se propagan directamente
    throw error;
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
}

/**
 * Obtiene el estado de origen de la última carga para una consulta y usuario.
 */
export function obtenerOrigenExamenes(clave, usuarioId = null) {
  const uId = clave === 'proximos' ? 'publico' : (usuarioId ? String(usuarioId) : 'sin-usuario');
  return mapaUltimoOrigen.get(`${clave}:${uId}`) || {
    origen: null,
    guardadoEn: null,
    sesionExpirada: false,
  };
}

/**
 * Suscribe un callback ante cambios de origen de los exámenes.
 * Devuelve función de desuscripción.
 */
export function suscribirOrigenExamenes(cb) {
  if (typeof cb !== 'function') return () => {};
  suscriptoresOrigen.add(cb);
  return () => {
    suscriptoresOrigen.delete(cb);
  };
}
