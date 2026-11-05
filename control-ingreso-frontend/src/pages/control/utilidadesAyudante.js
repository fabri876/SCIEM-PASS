// Reglas de tiempo y textos de los exámenes del ayudante.
// Usa las mismas reglas que el docente (utilidadesExamenDocente): el registro se habilita
// 15 minutos antes del inicio y se cierra cuando termina el examen.
import { estadoExamen, esHoy, puedeControlarIngreso, aperturaControl, marcaTiempo } from "../docente/utilidadesExamenDocente";
import { textoGrupoExamen } from "../../components/examenes/textoGrupoExamen";

// El examen del ayudante trae "fecha"; las reglas del docente esperan "fechaExamen"
const aDocente = (e) => ({ fechaExamen: e?.fecha, horaInicio: e?.horaInicio, horaFin: e?.horaFin, esExamenReal: true });

// "EN_CURSO" | "PROXIMO" | "FINALIZADO"
export function estadoAyudante(examen, ahora = new Date()) {
  const str = estadoExamen(aDocente(examen), ahora);
  return str === "SIN_FECHA" ? (examen?.estado || "PROXIMO") : str;
}

export const esHoyAyudante = (examen, ahora = new Date()) => esHoy(aDocente(examen), ahora);
export const puedeRegistrar = (examen, ahora = new Date()) => puedeControlarIngreso(aDocente(examen), ahora);
export const aperturaRegistro = (examen) => aperturaControl(aDocente(examen));
export const marcaTiempoAyudante = (examen) => marcaTiempo(aDocente(examen));

export const horaCorta = (date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

// "691A" o "Aula 691A" → "Aula 691A" (sin repetir la palabra)
export function textoAula(strAula) {
  const str = String(strAula || "").replace(/^aula\s*/i, "").trim();
  return str ? `Aula ${str}` : "";
}

// "C1" → "Grupo C1". Exámenes antiguos sin grupo ("A, B, C1") → "" (ver textoGrupoExamen)
export function textoGrupo(strGrupo) {
  return textoGrupoExamen(strGrupo);
}

// Orden: en curso → próximos (el más cercano primero) → finalizados (el más reciente primero)
const ORDEN = { EN_CURSO: 0, PROXIMO: 1, FINALIZADO: 2 };
export function ordenarExamenes(list, ahora = new Date()) {
  return [...(list || [])]
    .map((e) => ({ e, strEstado: estadoAyudante(e, ahora) }))
    .sort((a, b) => {
      if (ORDEN[a.strEstado] !== ORDEN[b.strEstado]) return (ORDEN[a.strEstado] ?? 1) - (ORDEN[b.strEstado] ?? 1);
      return a.strEstado === "FINALIZADO"
        ? marcaTiempoAyudante(b.e) - marcaTiempoAyudante(a.e)
        : marcaTiempoAyudante(a.e) - marcaTiempoAyudante(b.e);
    });
}
