import { createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const BackButtonContext = createContext(null);

/**
 * Proveedor centralizado para la pila del botón Atrás de Android.
 * Permite que modales, paneles o escáneres registren su función de cierre (LIFO).
 * Si la pila está vacía, navega atrás o pide confirmación para salir en la raíz.
 */
export function BackButtonProvider({ children, onExitRequest, navigate, pathname }) {
  // Pila de funciones de cierre (último abierto, primero en cerrarse)
  const stackRef = useRef([]);

  const registerHandler = useCallback((closeFn) => {
    stackRef.current.push(closeFn);
    return () => {
      // Cleanup: remueve la función al desmontarse el modal o componente
      stackRef.current = stackRef.current.filter((fn) => fn !== closeFn);
    };
  }, []);

  useEffect(() => {
    // GUARDIA NATIVA: en navegador web o SSR no registra listener ni interactúa con Capacitor
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle = null;

    async function setupListener() {
      try {
        listenerHandle = await App.addListener('backButton', ({ canGoBack }) => {
          // 1. Jerarquía superior: cerrar el último modal/panel abierto en la pila
          if (stackRef.current.length > 0) {
            const topHandler = stackRef.current.pop();
            if (typeof topHandler === 'function') {
              topHandler();
              return;
            }
          }

          // 2. Si no hay modales y estamos en una pantalla interna con historial
          if (canGoBack && pathname !== '/login' && pathname !== '/') {
            if (typeof navigate === 'function') {
              navigate(-1);
              return;
            }
          }

          // 3. Si estamos en la pantalla raíz o login, solicitar salida segura
          if (typeof onExitRequest === 'function') {
            onExitRequest();
          } else {
            App.exitApp();
          }
        });
      } catch (err) {
        console.warn('[BackButton] Error al registrar listener nativo:', err);
      }
    }

    setupListener();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove();
      }
    };
  }, [navigate, pathname, onExitRequest]);

  return (
    <BackButtonContext.Provider value={{ registerHandler }}>
      {children}
    </BackButtonContext.Provider>
  );
}

/**
 * Hook para registrar un modal o panel en la jerarquía del botón Atrás.
 * @param {boolean} isOpen Indica si el modal está actualmente visible.
 * @param {Function} onClose Callback para cerrar el modal.
 */
export function useRegisterBackHandler(isOpen, onClose) {
  const context = useContext(BackButtonContext);

  useEffect(() => {
    if (!context || !isOpen || typeof onClose !== 'function') return;
    return context.registerHandler(onClose);
  }, [context, isOpen, onClose]);
}
