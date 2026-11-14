import { useState, useEffect } from 'react';
import { liveQuery } from 'dexie';
import { db } from './db.js';
import { ESTADO_SYNC } from './constantes.js';
import { contarPendientesFaciales, suscribirColaFacial } from './facialSqliteDb.js';

/**
 * Pendientes totales del operador: asistencias/incidencias en Dexie más la cola
 * facial cifrada. La cola facial no participa de liveQuery, así que se suscribe
 * a los cambios de la base facial y recalcula el conteo.
 */
export function usePendientesCount(examenId = null) {
  const [conteo, setConteo] = useState(0);
  const [faciales, setFaciales] = useState(0);

  useEffect(() => {
    const observable = liveQuery(async () => {
      let coleccion = db.asistencias_pendientes
        .where('syncStatus')
        .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING);

      if (examenId !== null && examenId !== undefined) {
        coleccion = coleccion.and(r => r.examenId === Number(examenId));
      }

      const asistencias = await coleccion.count();
      // Las incidencias no guardan idExamen (solo idAmbiente), así que no se
      // pueden filtrar por examen; se suman únicamente al total global.
      if (examenId !== null && examenId !== undefined) return asistencias;

      const [incidencias, expulsiones, revocaciones, evidencias, excepcionales] = await Promise.all([
        db.incidencias_pendientes
          .where('syncStatus')
          .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
          .count(),
        db.expulsiones_pendientes
          .where('syncStatus')
          .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
          .count(),
        db.revocaciones_pendientes
          .where('syncStatus')
          .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
          .count(),
        db.evidencias_pendientes
          .where('syncStatus')
          .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
          .count(),
        db.ingresos_excepcionales_pendientes
          .where('syncStatus')
          .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
          .count()
      ]);

      return asistencias + incidencias + expulsiones + revocaciones + evidencias + excepcionales;
    });

    const sub = observable.subscribe({
      next: (val) => setConteo(val),
      error: (err) => console.error('[usePendientesCount] Error en liveQuery:', err)
    });

    return () => sub.unsubscribe();
  }, [examenId]);

  useEffect(() => {
    let activo = true;
    let temporizador = null;

    const actualizar = async () => {
      try {
        const total = await contarPendientesFaciales({ idExamen: examenId });
        if (activo) setFaciales(total);
      } catch {
        if (activo) setFaciales(0);
      }
    };

    // Pequeño retardo para agrupar el intento y el ingreso de una misma
    // verificación en un solo recálculo.
    const refrescar = () => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(actualizar, 250);
    };

    const cancelar = suscribirColaFacial(refrescar);
    actualizar();

    return () => {
      activo = false;
      cancelar();
      if (temporizador) clearTimeout(temporizador);
    };
  }, [examenId]);

  return conteo + faciales;
}
