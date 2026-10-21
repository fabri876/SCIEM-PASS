import { useState, useCallback, useEffect } from 'react';
import { pinService } from './pinService';

/**
 * Hook para bloqueo por inactividad y desbloqueo con PIN offline.
 *
 * @param {Object} opciones
 * @param {number} opciones.minutos - Minutos de inactividad para bloquear (default 5)
 * @param {number|string} opciones.idUsuario - ID del usuario actual
 * @param {Function} opciones.onBloquear - Callback cuando se bloquea por inactividad
 * @param {Function} opciones.onDesbloquear - Callback cuando se desbloquea correctamente
 *
 * @returns {Object}
 *   {boolean} bloqueada - true si la sesión está bloqueada por inactividad
 *   {number} ultimaInteraccion - timestamp de la última interacción
 *   {Function} fnRegistrarInteraccion - llamar en cada clic/scroll/tecla para resetear temporizador
 *   {Function} fnDesbloquear(pin) - valida PIN y desbloquea si coincide
 *   {boolean} pinInvalido - true si el último intento de PIN fue incorrecto
 */
export function useInactividad({ minutos = 5, idUsuario, onBloquear, onDesbloquear }) {
  const [bloqueada, setBloqueada] = useState(false);
  const [pinInvalido, setPinInvalido] = useState(false);
  const [ultimaInteraccion, setUltimaInteraccion] = useState(Date.now());

  const fnRegistrarInteraccion = useCallback(() => {
    const ahora = Date.now();
    setUltimaInteraccion(ahora);
    if (idUsuario) {
      pinService.actualizarInteraccion(idUsuario).catch(() => {});
    }
  }, [idUsuario]);

  useEffect(() => {
    if (!idUsuario) return;

    const timer = setInterval(() => {
      const ahora = Date.now();
      const diff = ahora - ultimaInteraccion;
      if (diff >= minutos * 60 * 1000 && !bloqueada) {
        setBloqueada(true);
        if (onBloquear) onBloquear();
        pinService.bloquearSesion(idUsuario).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [idUsuario, minutos, ultimaInteraccion, bloqueada, onBloquear]);

  const fnDesbloquear = useCallback(async (pin) => {
    if (!pin || pin.length !== 4) {
      setPinInvalido(true);
      return false;
    }

    try {
      const row = await pinService.obtenerConfig(idUsuario);
      if (!row || !row.pinHash) {
        setPinInvalido(true);
        return false;
      }

      const coincide = await compararHash(pin, row.pinHash);

      if (coincide) {
        setBloqueada(false);
        setPinInvalido(false);
        await pinService.desbloquearSesion(idUsuario);
        if (onDesbloquear) onDesbloquear();
        return true;
      } else {
        const bloqueado = await pinService.registrarIntentoFallido(idUsuario);
        setPinInvalido(true);
        if (bloqueado) {
          // Ya bloqueado por intentos, la UI puede mostrar mensaje adicional
        }
        return false;
      }
    } catch (err) {
      console.warn('[useInactividad] Error validando PIN:', err);
      setPinInvalido(true);
      return false;
    }
  }, [idUsuario, pinService]);

  return {
    bloqueada,
    ultimaInteraccion,
    fnRegistrarInteraccion,
    fnDesbloquear,
    pinInvalido
  };
}

/**
 * Compara un texto plano contra un hash SHA-256 hexadecimal.
 */
async function compararHash(textoPlano, hashHex) {
  const encoder = new TextEncoder();
  const data = encoder.encode(textoPlano);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashCalculado = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashCalculado === hashHex;
}
