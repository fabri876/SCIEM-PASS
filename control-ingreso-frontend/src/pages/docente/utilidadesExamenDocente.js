// Reglas de tiempo de los exámenes del docente (usadas en Inicio y en Mis Exámenes).

// El botón "Control de ingreso" se habilita desde esta cantidad de minutos
// antes del inicio del examen. Para cambiar la regla, basta con editar este valor.
export const MINUTOS_ANTES_CONTROL_INGRESO = 60;

function armarFecha(strFecha, strHora, boolFinDeDia = false) {
  const f = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!f) return null;
  const h = String(strHora || "").match(/(\d{1,2}):(\d{2})/);
  if (h) return new Date(Number(f[1]), Number(f[2]) - 1, Number(f[3]), Number(h[1]), Number(h[2]), 0, 0);
  if (boolFinDeDia) {
    return new Date(Number(f[1]), Number(f[2]) - 1, Number(f[3]), 23, 59, 59, 999);
  }
  return new Date(Number(f[1]), Number(f[2]) - 1, Number(f[3]), 0, 0, 0, 0);
}

export function rangoExamen(examen) {
  return {
    inicio: armarFecha(examen?.fechaExamen, examen?.horaInicio),
    fin: armarFecha(examen?.fechaExamen, examen?.horaFin, true),
  };
}

// "EN_CURSO" | "PROXIMO" | "FINALIZADO" | "SIN_FECHA"
export function estadoExamen(examen, ahora = new Date()) {
  const { inicio, fin } = rangoExamen(examen);
  if (!inicio) return "SIN_FECHA";
  if (ahora > fin) return "FINALIZADO";
  if (ahora >= inicio) return "EN_CURSO";
  return "PROXIMO";
}

export function esHoy(examen, ahora = new Date()) {
  const { inicio } = rangoExamen(examen);
  return Boolean(inicio) && inicio.toDateString() === ahora.toDateString();
}

// true desde (inicio - MINUTOS_ANTES_CONTROL_INGRESO) hasta el fin del examen
export function puedeControlarIngreso(examen, ahora = new Date()) {
  if (examen?.esExamenReal === false) return false;
  const { inicio, fin } = rangoExamen(examen);
  if (!inicio) return false;
  const apertura = new Date(inicio.getTime() - MINUTOS_ANTES_CONTROL_INGRESO * 60000);
  return ahora >= apertura && ahora <= fin;
}

// Marca de tiempo para ordenar
export function marcaTiempo(examen) {
  const { inicio } = rangoExamen(examen);
  return inicio ? inicio.getTime() : Number.MAX_SAFE_INTEGER;
}