import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { verificarAhora } from '../offline/connectivityService.js';

/**
 * Hook para gestionar el ciclo de vida nativo de la app (appStateChange).
 * 
 * - En segundo plano (isActive: false): invoca onAppBackground (ej. apagar cámara).
 * - En primer plano (isActive: true): fuerza chequeo de conectividad inmediato
 *   y ejecuta onAppForeground si se define.
 */
export function useNativeLifecycle({ onAppBackground, onAppForeground } = {}) {
  useEffect(() => {
    // GUARDIA NATIVA: en navegador web o SSR no registra listener ni interactúa con Capacitor
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle = null;

    async function setupStateListener() {
      try {
        listenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            // App pasó a segundo plano (bloqueo de pantalla o cambio de app)
            if (typeof onAppBackground === 'function') {
              onAppBackground();
            }
          } else {
            // App volvió al primer plano: forzar comprobación de red inmediata
            verificarAhora().catch(() => {});
            if (typeof onAppForeground === 'function') {
              onAppForeground();
            }
          }
        });
      } catch (err) {
        console.warn('[Lifecycle] Error en listener de ciclo de vida nativo:', err);
      }
    }

    setupStateListener();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, [onAppBackground, onAppForeground]);
}
