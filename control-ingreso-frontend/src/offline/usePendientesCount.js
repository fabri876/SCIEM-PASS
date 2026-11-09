import { useState, useEffect } from 'react';
import { liveQuery } from 'dexie';
import { db } from './db.js';
import { ESTADO_SYNC } from './constantes.js';

export function usePendientesCount(examenId = null) {
  const [conteo, setConteo] = useState(0);

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

      const [incidencias, expulsiones] = await Promise.all([
        db.incidencias_pendientes
          .where('syncStatus')
          .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
          .count(),
        db.expulsiones_pendientes
          .where('syncStatus')
          .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
          .count(),
      ]);

      return asistencias + incidencias + expulsiones;
    });

    const sub = observable.subscribe({
      next: (val) => setConteo(val),
      error: (err) => console.error('[usePendientesCount] Error en liveQuery:', err)
    });

    return () => sub.unsubscribe();
  }, [examenId]);

  return conteo;
}
