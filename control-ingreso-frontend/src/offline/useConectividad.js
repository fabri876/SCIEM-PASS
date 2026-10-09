import { useSyncExternalStore } from 'react';
import { suscribirConectividad, obtenerEstadoConexion } from './connectivityService.js';

/**
 * Hook reactivo de conectividad.
 * Devuelve: { estado, latenciaMs, ultimaVerificacion, clockOffsetMs, relojDesfasado, sinDatoDeReloj, forzado }
 */
export function useConectividad() {
  return useSyncExternalStore(
    suscribirConectividad,
    obtenerEstadoConexion,
    obtenerEstadoConexion
  );
}
