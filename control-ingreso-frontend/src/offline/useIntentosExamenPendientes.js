import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { db } from './db.js';

export function useIntentosExamenPendientes(operadorId) {
  const [estado, setEstado] = useState({ pendientes: 0, revision: 0, revisiones: [] });
  useEffect(() => {
    const id = Number(operadorId);
    if (!Number.isSafeInteger(id) || id <= 0) { setEstado({ pendientes: 0, revision: 0, revisiones: [] }); return undefined; }
    const consulta = liveQuery(async () => {
      const items = await db.intentos_examen_pendientes.where('operadorId').equals(id).toArray();
      const revisiones = items.filter((i) => i.estado === 'revision');
      return { pendientes: items.filter((i) => i.estado === 'pendiente').length,
        revision: revisiones.length, revisiones };
    }).subscribe({ next: setEstado });
    return () => consulta.unsubscribe();
  }, [operadorId]);
  return estado;
}
