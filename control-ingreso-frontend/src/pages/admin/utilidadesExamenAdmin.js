// Utilidades de la pantalla "Gestión de Exámenes" del administrador.
// Reutiliza la lógica de estados del docente (Próximo / En curso / Finalizado),
// que se calcula con la fecha, la hora de inicio y la hora de fin del examen.
import {
  estadoExamen,
  rangoExamen,
  MINUTOS_ANTES_CONTROL_INGRESO,
} from "../docente/utilidadesExamenDocente";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const ESTILOS_ESTADO = {
  PROXIMO: { texto: "Próximo", clase: "bg-[#EFF6FF] text-[#003770] border-[#BFDBFE]" },
  EN_CURSO: { texto: "En curso", clase: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
  FINALIZADO: { texto: "Finalizado", clase: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]" },
};

function aFecha(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function hhmm(strHora) {
  return strHora ? String(strHora).slice(0, 5) : "";
}

// Fecha y horas del examen. La hora vive en los ambientes (aulas) del examen:
// se toma la hora de inicio más temprana y la hora de fin más tardía.
export function tiempoDeExamen(ex) {
  const ambientes = Array.isArray(ex?.ambientes) ? ex.ambientes : [];
  const inicios = ambientes.map((a) => hhmm(a.horaInicio)).filter(Boolean).sort();
  const fines = ambientes.map((a) => hhmm(a.horaFin)).filter(Boolean).sort();
  return {
    fechaExamen: ex?.fechaExamen,
    horaInicio: inicios[0] || "",
    horaFin: fines.length ? fines[fines.length - 1] : "",
  };
}

// "PROXIMO" | "EN_CURSO" | "FINALIZADO"
export function estadoDeExamen(ex, ahora = new Date()) {
  const e = estadoExamen(tiempoDeExamen(ex), ahora);
  return e === "SIN_FECHA" ? "PROXIMO" : e;
}

export function marcaDeExamen(ex) {
  const { inicio } = rangoExamen(tiempoDeExamen(ex));
  if (inicio) return inicio.getTime();
  const d = aFecha(ex?.fechaExamen);
  return d ? d.getTime() : 0;
}

// "Lun 12 oct · 14:15"
export function fechaCorta(ex) {
  const d = aFecha(ex?.fechaExamen);
  if (!d) return "Sin fecha";
  const { horaInicio } = tiempoDeExamen(ex);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}${horaInicio ? ` · ${horaInicio}` : ""}`;
}

// "Lunes 12 de octubre"
export function fechaLarga(ex) {
  const d = aFecha(ex?.fechaExamen);
  if (!d) return "Sin fecha";
  const strAnio = d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : "";
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}${strAnio}`;
}

// "14:15 – 15:45"
export function rangoHorario(ex) {
  const { horaInicio, horaFin } = tiempoDeExamen(ex);
  if (horaInicio && horaFin) return `${horaInicio} – ${horaFin}`;
  return horaInicio || "";
}

// "Grupo 1" (solo si el backend ya manda el grupo del examen)
export function nombreGrupo(ex) {
  const g = ex?.numeroGrupo ?? ex?.nombreGrupo ?? ex?.grupo;
  if (g === undefined || g === null || g === "") return "";
  return /grupo/i.test(String(g)) ? String(g) : `Grupo ${g}`;
}

// Hora desde la que se habilita el control de ingreso ("13:15") o "" si no hay hora
export function horaAperturaControl(ex) {
  const { inicio } = rangoExamen(tiempoDeExamen(ex));
  if (!inicio) return "";
  const t = new Date(inicio.getTime() - MINUTOS_ANTES_CONTROL_INGRESO * 60000);
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

// El control de ingreso se abre desde 60 minutos antes del examen
export function controlDisponible(ex, ahora = new Date()) {
  const { inicio } = rangoExamen(tiempoDeExamen(ex));
  if (!inicio) return true;
  return ahora >= new Date(inicio.getTime() - MINUTOS_ANTES_CONTROL_INGRESO * 60000);
}

// strOrden: "proximos" → primero lo que aún no terminó (el más cercano arriba) y
// después los finalizados, del más reciente al más antiguo.
//           "antiguos" → orden cronológico, del más antiguo al más nuevo.
// Cada examen debe traer _estado y _marca.
export function ordenarPorFecha(lista, strOrden) {
  const copia = [...lista];
  if (strOrden === "antiguos") return copia.sort((a, b) => a._marca - b._marca);
  const vigentes = copia.filter((e) => e._estado !== "FINALIZADO").sort((a, b) => a._marca - b._marca);
  const pasados = copia.filter((e) => e._estado === "FINALIZADO").sort((a, b) => b._marca - a._marca);
  return [...vigentes, ...pasados];
}

export function sinAcentos(str) {
  return String(str || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
