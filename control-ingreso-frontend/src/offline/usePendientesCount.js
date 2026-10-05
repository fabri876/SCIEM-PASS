import { useState, useEffect } from 'react';
import { liveQuery } from 'dexie';
import { db } from './db.js';
import { ESTADO_SYNC } from './constantes.js';

export function usePendientesCount(examenId = null) {
  const [conteo, setConteo] = useState(0);

  useEffect(() => {
    const observable = liveQuery(() => {
      let coleccion = db.asistencias_pendientes
        .where('syncStatus')
        .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING);

      if (examenId !== null && examenId !== undefined) {
        coleccion = coleccion.and(r => r.examenId === Number(examenId));
      }

      return coleccion.count();
    });

    const sub = observable.subscribe({
      next: (val) => setConteo(val),
      error: (err) => console.error('[usePendientesCount] Error en liveQuery:', err)
    });

    return () => sub.unsubscribe();
  }, [examenId]);

  return conteo;
}
