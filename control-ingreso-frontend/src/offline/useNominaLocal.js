import { useState, useEffect, useRef, useCallback } from 'react';
import { liveQuery } from 'dexie';
import { db } from './db.js';
import { ERROR_NOMINA } from './constantes.js';
import {
  obtenerEstadoNomina,
  descargarNomina,
  eliminarNominaLocal
} from './nominaLoader.js';

export function useNominaLocal(examenId) {
  const [estado, setEstado] = useState({
    lista: false,
    descargadaEn: null,
    totalLocal: 0,
    fotosLocales: 0,
    descargaCompleta: false,
    desactualizada: false
  });

  const [descargando, setDescargando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  // Consulta reactiva liviana: solo escucha db.meta y conteo de db.nominas
  useEffect(() => {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      setEstado({
        lista: false,
        descargadaEn: null,
        totalLocal: 0,
        fotosLocales: 0,
        descargaCompleta: false,
        desactualizada: false
      });
      return;
    }

    const claveMeta = `nomina:${exId}`;
    const observable = liveQuery(async () => {
      await db.meta.get(claveMeta);
      await db.nominas.where('examenId').equals(exId).count();
      return await obtenerEstadoNomina(exId);
    });

    const sub = observable.subscribe({
      next: (val) => setEstado(val),
      error: (err) => console.error('[useNominaLocal] Error en liveQuery:', err)
    });

    return () => sub.unsubscribe();
  }, [examenId]);

  const cancelar = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const ejecutarDescarga = useCallback(async (completa, opciones = {}) => {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      return { ok: false, error: new Error('examenId inválido') };
    }

    cancelar();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setDescargando(true);
    setError(null);
    setProgreso({ fase: 'nomina', descargados: 0, total: 0, porcentaje: 0 });

    try {
      const res = await descargarNomina({
        examenId: exId,
        completa,
        signal: controller.signal,
        onProgreso: (p) => setProgreso(p),
        ...opciones
      });

      if (res?.omitido) {
        setDescargando(false);
        return { ok: false, omitido: true };
      }

      return { ok: true, ...res };
    } catch (err) {
      if (err.codigo === ERROR_NOMINA.CANCELADO) {
        setError(null);
      } else {
        setError(err);
      }
      return { ok: false, error: err };
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setDescargando(false);
    }
  }, [examenId, cancelar]);

  const descargar = useCallback((opts) => ejecutarDescarga(true, opts), [ejecutarDescarga]);
  const actualizar = useCallback((opts) => ejecutarDescarga(false, opts), [ejecutarDescarga]);

  const eliminar = useCallback(async () => {
    cancelar();
    setError(null);
    try {
      const borrados = await eliminarNominaLocal(examenId);
      return { ok: true, borrados };
    } catch (err) {
      setError(err);
      return { ok: false, error: err };
    }
  }, [examenId, cancelar]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    estado,
    descargando,
    progreso,
    error,
    descargar,
    actualizar,
    eliminar,
    cancelar
  };
}
