import { registerSW } from 'virtual:pwa-register';

let actualizacionPendiente = false;
let listoOffline = false;
let ejecutarActualizacion = null;
let registradorIniciado = false;
let registrationRef = null;
let timerChequeo = null;

const suscriptoresActualizacion = new Set();
const suscriptoresListoOffline = new Set();

function notificar(conjunto) {
  conjunto.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error('[SW] Error en callback de suscriptor:', err);
    }
  });
}

/**
 * Consulta al Service Worker por una versión más reciente SOLO si hay conexión activa
 */
async function comprobarActualizacionSiHayRed() {
  if (typeof navigator === 'undefined' || !navigator.onLine) {
    return;
  }
  if (registrationRef && typeof registrationRef.update === 'function') {
    try {
      await registrationRef.update();
    } catch (err) {
      console.warn('[SW] No se pudo verificar actualización en segundo plano:', err);
    }
  }
}

function iniciarMonitoreoActualizaciones() {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        comprobarActualizacionSiHayRed();
      }
    });
  }

  // Chequeo recurrente cada 60 minutos
  const SESENTA_MINUTOS_MS = 60 * 60 * 1000;
  if (timerChequeo) clearInterval(timerChequeo);
  timerChequeo = setInterval(() => {
    comprobarActualizacionSiHayRed();
  }, SESENTA_MINUTOS_MS);
}

/**
 * Registra el Service Worker de forma idempotente.
 * Solo opera en producción (import.meta.env.PROD) y si el navegador tiene soporte.
 */
export function registrarSW() {
  if (!import.meta.env.PROD) {
    return;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (registradorIniciado) {
    return;
  }

  registradorIniciado = true;

  try {
    ejecutarActualizacion = registerSW({
      immediate: true,
      onNeedRefresh() {
        actualizacionPendiente = true;
        notificar(suscriptoresActualizacion);
      },
      onOfflineReady() {
        listoOffline = true;
        notificar(suscriptoresListoOffline);
      },
      onRegisteredSW(_swScriptUrl, registration) {
        if (registration) {
          registrationRef = registration;
          iniciarMonitoreoActualizaciones();
        }
      },
      onRegisterError(error) {
        console.error('[SW] Error al registrar Service Worker:', error);
      },
    });
  } catch (err) {
    console.error('[SW] Error al invocar registerSW:', err);
  }
}

/**
 * Suscribe un callback ante la detección de una nueva versión disponible.
 * Devuelve función de desuscripción. Si ya hay una pendiente, invoca el callback de inmediato.
 */
export function suscribirActualizacionSW(cb) {
  if (typeof cb !== 'function') return () => {};

  suscriptoresActualizacion.add(cb);

  if (actualizacionPendiente) {
    try {
      cb();
    } catch (err) {
      console.error('[SW] Error en ejecución inmediata de actualización:', err);
    }
  }

  return () => {
    suscriptoresActualizacion.delete(cb);
  };
}

/**
 * Suscribe un callback para cuando los recursos de la app estén listos para funcionar offline.
 * Devuelve función de desuscripción. Si ya está listo, invoca el callback de inmediato.
 */
export function suscribirListoOffline(cb) {
  if (typeof cb !== 'function') return () => {};

  suscriptoresListoOffline.add(cb);

  if (listoOffline) {
    try {
      cb();
    } catch (err) {
      console.error('[SW] Error en ejecución inmediata de offline ready:', err);
    }
  }

  return () => {
    suscriptoresListoOffline.delete(cb);
  };
}

/**
 * Aplica la actualización pendiente y recarga la aplicación solo cuando el usuario lo decide.
 */
export async function aplicarActualizacionSW() {
  if (typeof ejecutarActualizacion === 'function') {
    await ejecutarActualizacion(true);
  }
}

/**
 * Devuelve true si hay una nueva versión del Service Worker esperando activación.
 */
export function hayActualizacionPendiente() {
  return actualizacionPendiente;
}
