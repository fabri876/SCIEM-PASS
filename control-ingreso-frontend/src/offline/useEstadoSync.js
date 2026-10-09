import { useState, useEffect, useCallback } from 'react';
import { suscribirSync } from './syncQueueService.js';
import { asistenciaRepo } from './asistenciaRepo.js';
import {
  sincronizarAhora,
  reanudarSync,
  obtenerEstadoScheduler,
  suscribirScheduler
} from './syncScheduler.js';

/**
 * Hook reactivo del estado de sincronización.
 * Sin ningún efecto secundario al montarse (no dispara envíos ni pings).
 */
export function useEstadoSync() {
  const schedInicial = obtenerEstadoScheduler();
  const [estadoSync, setEstadoSync] = useState('inactivo');
  const [pendientesRestantes, setPendientesRestantes] = useState(0);
  const [pausadoPorAuth, setPausadoPorAuth] = useState(schedInicial.pausadoPorAuth);
  const [ultimaSync, setUltimaSync] = useState(schedInicial.ultimaSync);
  const [ultimoResultado, setUltimoResultado] = useState(schedInicial.ultimoResultado);

  useEffect(() => {
    let montado = true;

    asistenciaRepo
      .contarPendientes()
      .then((c) => {
        if (montado) setPendientesRestantes(c);
      })
      .catch(() => {});

    const cancelarSync = suscribirSync((info) => {
      if (!montado) return;
      if (info.estado) {
        setEstadoSync(info.estado);
      }
      if (typeof info.pendientesRestantes === 'number') {
        setPendientesRestantes(info.pendientesRestantes);
      }
    });

    const cancelarSched = suscribirScheduler((sched) => {
      if (!montado) return;
      setPausadoPorAuth(sched.pausadoPorAuth);
      setUltimaSync(sched.ultimaSync);
      if (sched.ultimoResultado && !sched.ultimoResultado.omitido && !sched.ultimoResultado.sinConexion) {
        setUltimoResultado(sched.ultimoResultado);
      }
    });

    return () => {
      montado = false;
      cancelarSync();
      cancelarSched();
    };
  }, []);

  const handleSincronizarAhora = useCallback(async (opts) => {
    setEstadoSync('enviando');
    let res = null;

    try {
      res = await sincronizarAhora(opts);
      const sched = obtenerEstadoScheduler();

      setPausadoPorAuth(sched.pausadoPorAuth);
      setUltimaSync(sched.ultimaSync);

      // No guardar como ultimoResultado los resultados con omitido o sinConexion
      if (!res?.omitido && !res?.sinConexion) {
        setUltimoResultado(res);
      }

      if (res?.pausadaPorAuth) {
        setEstadoSync('auth');
      } else if (res?.omitido || res?.sinConexion) {
        setEstadoSync('inactivo');
      } else if (res?.errores > 0 || res?.itemsConFalloDeLote > 0 || res?.huboFalloDeRed) {
        setEstadoSync('error');
      } else {
        setEstadoSync('ok');
      }

      return res;
    } catch (err) {
      setEstadoSync('error');
      throw err;
    } finally {
      // Garantiza que estadoSync nunca quede atascado en 'enviando'
      setEstadoSync((prev) => (prev === 'enviando' ? 'inactivo' : prev));
    }
  }, []);

  const handleReanudarSync = useCallback(() => {
    reanudarSync();
    const sched = obtenerEstadoScheduler();
    setPausadoPorAuth(sched.pausadoPorAuth);
  }, []);

  return {
    estadoSync,
    pendientesRestantes,
    pausadoPorAuth,
    ultimaSync,
    ultimoResultado,
    sincronizarAhora: handleSincronizarAhora,
    reanudarSync: handleReanudarSync
  };
}
