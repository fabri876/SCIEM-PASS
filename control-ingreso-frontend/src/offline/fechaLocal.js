/**
 * El backend facial usa `LocalDateTime`, no `OffsetDateTime`. Enviar
 * `toISOString()` (con sufijo `Z`) puede ser rechazado o interpretado como UTC;
 * este helper devuelve la hora local del equipo en formato ISO sin zona.
 */
export function aHoraLocalIso(valor = new Date()) {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 23);
}
