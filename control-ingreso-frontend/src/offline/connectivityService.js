import { strApiBaseUrl } from '../services/apiConfig.js';
import { configRepo } from './configRepo.js';

export const URL_HEALTH = '/api/v1/health';
export const UMBRAL_DESFASE_MS = 5 * 60 * 1000; // 5 minutos
export const TIMEOUT_PING_MS = 3000;
export const INTERVALO_ONLINE_MS = 20000;
export const INTERVALO_OFFLINE_MS = 10000;
export const REINTENTO_RAPIDO_MS = 4000; // 4 s tras el primer fallo
export const DEFECTO_UMBRAL_DEGRADADO_MS = 1500;

// Estado interno en memoria (inmutable para useSyncExternalStore)
let estadoConexion = {
  estado: 'verificando',
  latenciaMs: null,
  ultimaVerificacion: null,
  clockOffsetMs: 0,
  relojDesfasado: false,
  sinDatoDeReloj: true,
  forzado: false
};

let ultimoEstadoNotificado = null;
let fallosConsecutivos = 0;
let temporizadorPing = null;
let pingActivo = false;
let pingEnCursoPromise = null;
let pingInyectado = null;
let intervaloConfiguradoMs = null;
let umbralDegradadoActualMs = DEFECTO_UMBRAL_DEGRADADO_MS;
let ultimoForzadoConocido = false;
let muestrasReloj = []; // Almacena hasta 5 muestras: { rtt, offset }

const suscriptores = new Set();

function esPestanaVisible() {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

function notificarSuscriptores() {
  const actual = estadoConexion;
  const huboCambio =
    !ultimoEstadoNotificado ||
    ultimoEstadoNotificado.estado !== actual.estado ||
    ultimoEstadoNotificado.latenciaMs !== actual.latenciaMs ||
    ultimoEstadoNotificado.clockOffsetMs !== actual.clockOffsetMs ||
    ultimoEstadoNotificado.relojDesfasado !== actual.relojDesfasado ||
    ultimoEstadoNotificado.sinDatoDeReloj !== actual.sinDatoDeReloj ||
    ultimoEstadoNotificado.forzado !== actual.forzado;

  if (huboCambio) {
    ultimoEstadoNotificado = actual;
    for (const fn of suscriptores) {
      try {
        fn(actual);
      } catch (err) {
        console.warn('[connectivityService] Error en suscriptor:', err);
      }
    }
  }
}

async function leerModoOfflineForzado() {
  try {
    const val = await configRepo.obtenerConfig('modoOfflineForzado', false);
    ultimoForzadoConocido = Boolean(val);
    return ultimoForzadoConocido;
  } catch (err) {
    console.warn('[connectivityService] Error al leer modoOfflineForzado de configRepo:', err);
    return ultimoForzadoConocido;
  }
}

/**
 * Ping HTTP por defecto con HEAD sin credenciales y timeout de 3 s.
 */
export async function pingHttpPorDefecto(timeoutMs = TIMEOUT_PING_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();

  try {
    const resp = await fetch(`${strApiBaseUrl}${URL_HEALTH}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    });
    const t1 = Date.now();
    clearTimeout(timer);

    const latenciaMs = Math.max(0, t1 - t0);
    if (resp.status >= 500) {
      return { ok: false, status: resp.status, latenciaMs, dateHeader: null };
    }

    return {
      ok: true,
      status: resp.status,
      latenciaMs,
      dateHeader: resp.headers.get('date')
    };
  } catch (err) {
    clearTimeout(timer);
    const t1 = Date.now();
    return {
      ok: false,
      status: null,
      latenciaMs: Math.max(0, t1 - t0),
      dateHeader: null,
      error: err.message
    };
  }
}

/**
 * Prueba si existe conexión real sin modificar el estado mostrado ni los contadores.
 * Utilizado por sincronizarAhora cuando el modo offline forzado está activo.
 */
export async function probarConexionReal() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, latenciaMs: null };
  }

  const fnPing = pingInyectado || pingHttpPorDefecto;
  const t0 = Date.now();
  try {
    const res = await fnPing();
    const t1 = Date.now();
    const ok = Boolean(res && (res.ok || (typeof res === 'boolean' && res)));
    const latencia = typeof res?.latenciaMs === 'number' ? res.latenciaMs : Math.max(0, t1 - t0);
    return { ok, latenciaMs: ok ? latencia : null };
  } catch (err) {
    return { ok: false, latenciaMs: null };
  }
}

/**
 * Establece o revierte el modo offline forzado por el usuario.
 * Guarda en configRepo, actualiza el estado y notifica de inmediato.
 * Si se desactiva, dispara un ping inmediato.
 */
export async function establecerModoOfflineForzado(valor) {
  const boolVal = Boolean(valor);
  ultimoForzadoConocido = boolVal;

  try {
    await configRepo.guardarConfig('modoOfflineForzado', boolVal);
  } catch (err) {
    console.warn('[connectivityService] Error al guardar modoOfflineForzado:', err);
  }

  if (boolVal) {
    fallosConsecutivos = 2;
    estadoConexion = {
      ...estadoConexion,
      estado: 'offline',
      latenciaMs: null,
      ultimaVerificacion: Date.now(),
      forzado: true
    };
    notificarSuscriptores();
    programarSiguientePing();
    return estadoConexion;
  }

  estadoConexion = {
    ...estadoConexion,
    forzado: false
  };
  notificarSuscriptores();

  return await verificarAhora();
}

/**
 * Actualiza la estimación del desfase del reloj.
 * Si no hay encabezado Date, NO marca sinDatoDeReloj: true si ya existe un offset guardado válido.
 */
function procesarDesfaseReloj(dateHeader, t0, t1) {
  const rtt = t1 - t0;

  if (!dateHeader) {
    const yaTieneDatoValido = !estadoConexion.sinDatoDeReloj;
    if (!yaTieneDatoValido && muestrasReloj.length === 0) {
      estadoConexion = { ...estadoConexion, sinDatoDeReloj: true };
    }
    return;
  }

  if (rtt > 3000) {
    return;
  }

  const serverMs = new Date(dateHeader).getTime();
  if (Number.isNaN(serverMs)) {
    const yaTieneDatoValido = !estadoConexion.sinDatoDeReloj;
    if (!yaTieneDatoValido && muestrasReloj.length === 0) {
      estadoConexion = { ...estadoConexion, sinDatoDeReloj: true };
    }
    return;
  }

  const offsetEstimado = Math.round(serverMs + 500 - (t0 + rtt / 2));
  muestrasReloj.push({ rtt, offset: offsetEstimado });
  if (muestrasReloj.length > 5) {
    muestrasReloj.shift();
  }

  const mejorMuestra = muestrasReloj.reduce(
    (min, m) => (m.rtt < min.rtt ? m : min),
    muestrasReloj[0]
  );

  const nuevoOffset = mejorMuestra.offset;
  const relojDesfasado = Math.abs(nuevoOffset) > UMBRAL_DESFASE_MS;

  estadoConexion = {
    ...estadoConexion,
    clockOffsetMs: nuevoOffset,
    relojDesfasado,
    sinDatoDeReloj: false
  };

  configRepo.guardarConfig('clockOffsetMs', nuevoOffset).catch(() => {});
  configRepo.guardarConfig('clockOffsetActualizadoEn', Date.now()).catch(() => {});
}

/**
 * Cadena de temporizadores. Tras el primer fallo programa en 4 s (REINTENTO_RAPIDO_MS).
 */
function programarSiguientePing() {
  if (!pingActivo) return;
  if (temporizadorPing) {
    clearTimeout(temporizadorPing);
    temporizadorPing = null;
  }

  if (!esPestanaVisible()) {
    return;
  }

  let intervaloBase;
  if (intervaloConfiguradoMs != null) {
    intervaloBase = intervaloConfiguradoMs;
  } else if (fallosConsecutivos === 1) {
    intervaloBase = REINTENTO_RAPIDO_MS;
  } else if (estadoConexion.estado === 'offline') {
    intervaloBase = INTERVALO_OFFLINE_MS;
  } else {
    intervaloBase = INTERVALO_ONLINE_MS;
  }

  temporizadorPing = setTimeout(() => {
    verificarAhora().catch((err) => {
      console.warn('[connectivityService] Error en ciclo de ping:', err);
    });
  }, intervaloBase);
}

/**
 * Ejecuta la verificación de conexión inmediatamente.
 */
export async function verificarAhora() {
  if (pingEnCursoPromise) {
    return await pingEnCursoPromise;
  }

  pingEnCursoPromise = (async () => {
    const forzado = await leerModoOfflineForzado();

    if (forzado) {
      fallosConsecutivos = 2;
      estadoConexion = {
        ...estadoConexion,
        estado: 'offline',
        latenciaMs: null,
        ultimaVerificacion: Date.now(),
        forzado: true
      };
      notificarSuscriptores();
      programarSiguientePing();
      return estadoConexion;
    }

    const sinRedNavegador = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (sinRedNavegador) {
      fallosConsecutivos = 2;
      estadoConexion = {
        ...estadoConexion,
        estado: 'offline',
        latenciaMs: null,
        ultimaVerificacion: Date.now(),
        forzado: false
      };
      notificarSuscriptores();
      programarSiguientePing();
      return estadoConexion;
    }

    const fnPing = pingInyectado || pingHttpPorDefecto;
    const t0 = Date.now();
    let resultado;
    try {
      resultado = await fnPing();
    } catch (err) {
      resultado = { ok: false, latenciaMs: Date.now() - t0, dateHeader: null };
    }
    const t1 = Date.now();

    const ok = Boolean(resultado && (resultado.ok || (typeof resultado === 'boolean' && resultado)));
    const latencia = typeof resultado?.latenciaMs === 'number' ? resultado.latenciaMs : Math.max(0, t1 - t0);

    if (ok) {
      fallosConsecutivos = 0;
      const nuevoEstado = latencia > umbralDegradadoActualMs ? 'degraded' : 'online';

      estadoConexion = {
        ...estadoConexion,
        estado: nuevoEstado,
        latenciaMs: latencia,
        ultimaVerificacion: Date.now(),
        forzado: false
      };

      if (resultado?.dateHeader) {
        procesarDesfaseReloj(resultado.dateHeader, t0, t1);
      }
    } else {
      fallosConsecutivos += 1;
      const nuevoEstado = fallosConsecutivos >= 2 ? 'offline' : estadoConexion.estado;

      estadoConexion = {
        ...estadoConexion,
        estado: nuevoEstado,
        latenciaMs: null,
        ultimaVerificacion: Date.now(),
        forzado: false
      };
    }

    notificarSuscriptores();
    programarSiguientePing();
    return estadoConexion;
  })();

  try {
    return await pingEnCursoPromise;
  } finally {
    pingEnCursoPromise = null;
  }
}

function handleWindowOnline() {
  verificarAhora().catch(() => {});
}

function handleWindowOffline() {
  fallosConsecutivos = 2;
  estadoConexion = {
    ...estadoConexion,
    estado: 'offline',
    latenciaMs: null,
    ultimaVerificacion: Date.now()
  };
  notificarSuscriptores();
  programarSiguientePing();
}

function handleVisibilityChange() {
  if (esPestanaVisible()) {
    verificarAhora().catch(() => {});
  } else if (temporizadorPing) {
    clearTimeout(temporizadorPing);
    temporizadorPing = null;
  }
}

/**
 * Inicia el monitoreo de conectividad de forma idempotente.
 * Restablece fallosConsecutivos y estado a 'verificando'.
 */
export async function iniciarConectividad({ ping, intervaloMs } = {}) {
  if (pingActivo) {
    return detenerConectividad;
  }

  pingActivo = true;
  pingInyectado = ping || null;
  intervaloConfiguradoMs = intervaloMs || null;
  fallosConsecutivos = 0;

  // Carga de configuración inicial
  let offsetGuardado = 0;
  let fechaOffsetGuardado = null;
  try {
    offsetGuardado = await configRepo.obtenerConfig('clockOffsetMs', 0);
    fechaOffsetGuardado = await configRepo.obtenerConfig('clockOffsetActualizadoEn', null);
  } catch (err) {
    console.warn('[connectivityService] Error al leer configuración de reloj:', err);
  }

  try {
    umbralDegradadoActualMs =
      Number(await configRepo.obtenerConfig('umbralDegradadoMs', DEFECTO_UMBRAL_DEGRADADO_MS)) ||
      DEFECTO_UMBRAL_DEGRADADO_MS;
  } catch (err) {
    umbralDegradadoActualMs = DEFECTO_UMBRAL_DEGRADADO_MS;
  }

  const forzado = await leerModoOfflineForzado();
  const numOffset = Number(offsetGuardado) || 0;
  const sinDatoDeReloj = fechaOffsetGuardado == null;

  estadoConexion = {
    ...estadoConexion,
    estado: 'verificando',
    latenciaMs: null,
    clockOffsetMs: numOffset,
    relojDesfasado: Math.abs(numOffset) > UMBRAL_DESFASE_MS,
    sinDatoDeReloj,
    forzado: Boolean(forzado)
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('offline', handleWindowOffline);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  verificarAhora().catch(() => {});

  return detenerConectividad;
}

/**
 * Detiene el monitoreo y limpia temporizadores y listeners.
 * Restablece fallosConsecutivos y estado a 'verificando' y notifica a los suscriptores.
 */
export function detenerConectividad() {
  pingActivo = false;
  fallosConsecutivos = 0;

  if (temporizadorPing) {
    clearTimeout(temporizadorPing);
    temporizadorPing = null;
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleWindowOnline);
    window.removeEventListener('offline', handleWindowOffline);
  }

  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  estadoConexion = {
    ...estadoConexion,
    estado: 'verificando',
    latenciaMs: null
  };

  notificarSuscriptores();
}

export function obtenerEstadoConexion() {
  return estadoConexion;
}

export function obtenerClockOffsetMs() {
  return estadoConexion.clockOffsetMs || 0;
}

export function suscribirConectividad(callback) {
  if (typeof callback === 'function') {
    suscriptores.add(callback);
  }
  return () => {
    suscriptores.delete(callback);
  };
}
