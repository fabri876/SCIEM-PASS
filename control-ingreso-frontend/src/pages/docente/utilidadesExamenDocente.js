// Reglas de tiempo de los exámenes del docente (usadas en Inicio y en Mis Exámenes).

// El botón "Control de ingreso" se habilita desde esta cantidad de minutos
// antes del inicio del examen. Para cambiar la regla, basta con editar este valor.
export const MINUTOS_ANTES_CONTROL_INGRESO = 15;

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

// "EN_CURSO" | "PROXIMO" | "FINALIZADO" | "SIN_FECHA" | "CANCELADO"
// Un examen cancelado se reconoce antes de mirar la hora.
export function estadoExamen(examen, ahora = new Date()) {
  if (examen?.cancelado) return "CANCELADO";
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
  if (examen?.esExamenReal === false || examen?.cancelado) return false;
  const { inicio, fin } = rangoExamen(examen);
  if (!inicio) return false;
  const apertura = new Date(inicio.getTime() - MINUTOS_ANTES_CONTROL_INGRESO * 60000);
  return ahora >= apertura && ahora <= fin;
}

// Hora en que se habilita el control de ingreso (Date o null)
export function aperturaControl(examen) {
  const { inicio } = rangoExamen(examen);
  return inicio ? new Date(inicio.getTime() - MINUTOS_ANTES_CONTROL_INGRESO * 60000) : null;
}

// Un examen se puede cancelar hasta 15 minutos antes de su inicio
// (cuando se abre el control de ingreso). El servidor vuelve a validarlo.
export const MINUTOS_LIMITE_CANCELACION = MINUTOS_ANTES_CONTROL_INGRESO;
export function puedeCancelarExamen(examen, ahora = new Date()) {
  if (!examen || examen.cancelado || examen.esExamenReal === false) return false;
  const { inicio } = rangoExamen(examen);
  if (!inicio) return false;
  return ahora < new Date(inicio.getTime() - MINUTOS_LIMITE_CANCELACION * 60000);
}

// Marca de tiempo para ordenar
export function marcaTiempo(examen) {
  const { inicio } = rangoExamen(examen);
  return inicio ? inicio.getTime() : Number.MAX_SAFE_INTEGER;
}