// Formatos de fecha para la credencial QR
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const pad = (n) => String(n).padStart(2, "0");

// "2026-10-09" → "Hoy" | "Mañana" | "Ayer" | "lun 12 oct"
export function fechaCorta(strFecha) {
  const m = strFecha ? String(strFecha).match(/(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dif = Math.round((d - hoy) / 86400000);
  if (dif === 0) return "Hoy";
  if (dif === 1) return "Mañana";
  if (dif === -1) return "Ayer";
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

// Date | ISO → "jue 8 oct, 00:00"
export function fechaHora(valor) {
  if (!valor) return "";
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d)) return "";
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Días que faltan para la fecha del examen (negativo = ya pasó)
export function diasHasta(strFecha) {
  const m = strFecha ? String(strFecha).match(/(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((d - hoy) / 86400000);
}

// Cuánto falta para el examen: "Empieza en 2 h 15 min" | "En curso" | "Finalizado" | "En 3 días"
export function cuentaRegresiva(strFecha, strInicio, strFin) {
  if (!strFecha || !strInicio) return "";
  const ini = new Date(`${strFecha}T${strInicio}:00`);
  const fin = strFin ? new Date(`${strFecha}T${strFin}:00`) : null;
  const ahora = new Date();
  if (fin && ahora > fin) return "Finalizado";
  if (ahora >= ini) return "En curso";
  const numMin = Math.round((ini - ahora) / 60000);
  if (numMin < 60) return `Empieza en ${numMin} min`;
  if (numMin < 24 * 60) {
    const h = Math.floor(numMin / 60);
    const m = numMin % 60;
    return `Empieza en ${h} h${m ? ` ${m} min` : ""}`;
  }
  const d = diasHasta(strFecha);
  return d === 1 ? "Mañana" : `En ${d} días`;
}
