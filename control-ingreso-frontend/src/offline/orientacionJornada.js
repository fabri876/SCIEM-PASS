// Resolucion pura: nunca convierte una coincidencia offline en autorizacion de ingreso.
// Los limites son instantes epoch calculados al descargar la jornada.
export function buscarDestinoJornada({ candidatos, tipo, identificador, examenActual, ahora = Date.now() }) {
  const clase = String(tipo || '').toUpperCase();
  const valor = String(identificador || '').trim();
  if (!['SIS', 'CI', 'QR_HASH'].includes(clase) || !valor || !Number.isFinite(ahora)) {
    return { estado: 'SIN_DATOS', destino: null };
  }
  const clave = clase === 'SIS' ? 'sis' : clase === 'CI' ? 'ci' : 'qrHash';
  const coincidencias = (Array.isArray(candidatos) ? candidatos : []).filter((c) => {
    if (!c || String(c[clave] ?? '').trim() !== valor || String(c.idExamen) === String(examenActual)) return false;
    if (!Number.isFinite(c.apertura) || !Number.isFinite(c.cierre) || c.apertura > c.cierre) return false;
    if (clase === 'QR_HASH' && (!Number.isFinite(c.qrDesde) || !Number.isFinite(c.qrHasta)
        || ahora < c.qrDesde || ahora > c.qrHasta)) return false;
    return ahora >= c.apertura && ahora <= c.cierre;
  });
  const examenes = new Map();
  for (const c of coincidencias) {
    const id = `${c.idAsignatura}:${c.idExamen}`;
    if (!c.idAsignatura || !c.idExamen) continue;
    // Dos filas del mismo examen con destinos diferentes no autorizan escoger una.
    const anterior = examenes.get(id);
    if (anterior && JSON.stringify(anterior) !== JSON.stringify(c)) {
      return { estado: 'AMBIGUO', destino: null };
    }
    examenes.set(id, c);
  }
  if (examenes.size > 1) return { estado: 'AMBIGUO', destino: null };
  if (!examenes.size) return { estado: 'SIN_COINCIDENCIA', destino: null };
  return { estado: 'ENCONTRADO', destino: examenes.values().next().value };
}
