/**
 * HOOK DE INACTIVIDAD — F3-05
 *
 * Detecta inactividad del usuario y dispara callback de bloqueo.
 * No depende de React Context; recibe callbacks como parámetros.
 *
 * Eventos que reinician el timer: click, keydown, touchstart, mousemove, scroll
 */

const EVENTOS_POR_DEFECTO = [
  "click",
  "keydown",
  "touchstart",
  "mousemove",
  "scroll",
];

const INACTIVIDAD_DEFAULTS = {
  tiempoMaximoMs: 5 * 60 * 1000, // 5 minutos
  advertenciaMs: 60 * 1000, // 1 minuto antes
  eventos: EVENTOS_POR_DEFECTO,
};

/**
 * Hook de inactividad (sin dependencias de React Context).
 *
 * @param {Object} opciones
 * @param {number} opciones.tiempoMaximoMs - Tiempo sin actividad antes de bloquear (default: 5 min)
 * @param {number} opciones.advertenciaMs - Cuánto antes mostrar advertencia (default: 1 min)
 * @param {string[]} opciones.eventos - Eventos DOM que reinician el timer
 * @param {Function} opciones.onAdvertencia - Callback cuando falta 1 min (ej. toast)
 * @param {Function} opciones.onBloquear - Callback al bloquear (ej. abrir modal PIN)
 * @returns {{ resetear: Function, bloquearAhora: Function, destruir: Function }}
 */
export function useInactividad(opciones = {}) {
  const config = { ...INACTIVIDAD_DEFAULTS, ...opciones };
  const { tiempoMaximoMs, advertenciaMs, eventos, onAdvertencia, onBloquear } =
    config;

  let timerId = null;
  let advertenciaId = null;
  let destruido = false;

  const limpiarTimers = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (advertenciaId) {
      clearTimeout(advertenciaId);
      advertenciaId = null;
    }
  };

  const dispararAdvertencia = () => {
    if (typeof onAdvertencia === "function") {
      try {
        onAdvertencia();
      } catch (e) {
        console.warn("[useInactividad] error en onAdvertencia:", e);
      }
    }
  };

  const dispararBloqueo = () => {
    if (typeof onBloquear === "function") {
      try {
        onBloquear();
      } catch (e) {
        console.warn("[useInactividad] error en onBloquear:", e);
      }
    }
  };

  const programar = () => {
    limpiarTimers();
    if (destruido) return;

    const tiempoAdvertencia = Math.max(
      0,
      config.tiempoMaximoMs - config.advertenciaMs,
    );

    if (tiempoAdvertencia > 0) {
      advertenciaId = setTimeout(dispararAdvertencia, tiempoAdvertencia);
    }

    timerId = setTimeout(dispararBloqueo, config.tiempoMaximoMs);
  };

  const handlerActividad = () => {
    if (!destruido) programar();
  };

  // Iniciar
  if (typeof window !== "undefined") {
    config.eventos.forEach((evt) =>
      window.addEventListener(evt, handlerActividad, { passive: true }),
    );
    programar();
  }

  // API pública
  const api = {
    /**
     * Reinicia el timer manualmente (útil tras desbloquear con PIN correcto)
     */
    resetear() {
      if (!destruido) programar();
    },

    /**
     * Fuerza el bloqueo inmediato (útil para logout manual)
     */
    bloquearAhora() {
      limpiarTimers();
      dispararBloqueo();
    },

    /**
     * Limpia listeners y timers. Llamar en cleanup de useEffect o al desmontar.
     */
    destruir() {
      if (destruido) return;
      destruido = true;
      limpiarTimers();
      if (typeof window !== "undefined") {
        config.eventos.forEach((evt) =>
          window.removeEventListener(evt, handlerActividad),
        );
      }
    },

    /** Tiempo restante en ms (útil para mostrar countdown en UI) */
    obtenerTiempoRestante() {
      if (!timerId) return 0;
      // No hay forma nativa de saber tiempo restante de un timeout,
      // pero se puede aproximar guardando timestamp de inicio.
      return -1; // no implementado
    },

    /** Si el sistema está destruido */
    estaDestruido() {
      return destruido;
    },
  };

  return api;
}

/**
 * Versión standalone (sin hook de React) para usar en vanilla JS o fuera de React.
 * Útil si se quiere usar en OperadorProvider sin hook o en main.tsx.
 *
 * @param {Object} config - Mismos parámetros que useInactividad
 * @returns {Object} Misma API que useInactividad
 */
export function crearInactividad(config) {
  return useInactividad(config);
}

export default { useInactividad, crearInactividad };
