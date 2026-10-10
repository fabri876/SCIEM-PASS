import { obtenerExamenesProximos, obtenerCambiosExamenes } from "./examenService";

/** Avisos derivados del calendario real; no representan mensajes personales ni estados de lectura. */
export function crearAvisosExamenes(examenes, ahora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(ahora);
  const valor = tipo => partes.find(p => p.type === tipo).value;
  const hoy = Date.UTC(Number(valor("year")), Number(valor("month")) - 1, Number(valor("day")));
  return examenes.flatMap(examen => {
    const [anio, mes, dia] = examen.strFecha.split("-").map(Number);
    const dias = Math.round((Date.UTC(anio, mes - 1, dia) - hoy) / 86400000);
    if (dias < 0 || dias > 7) return [];
    const fecha = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
    return [{
      intId: `${examen.intId}-${examen.idAmbiente ?? "sin-aula"}`,
      strTipo: "examen",
      strTitulo: dias === 0 ? "Examen hoy" : dias === 1 ? "Examen mañana" : "Examen próximo",
      strDescripcion: `${examen.strNombre} · ${examen.strDocente || "Docente por confirmar"} · ${examen.strAmbiente || "Aula por confirmar"}.`,
      strHace: `${fecha} · ${examen.strHoraInicio && examen.strHoraFin ? `${examen.strHoraInicio} - ${examen.strHoraFin}` : "Horario por confirmar"}`,
    }];
  });
}

export async function obtenerAvisosExamenes() {
  const [examenes, cambios] = await Promise.all([obtenerExamenesProximos(), obtenerCambiosExamenes()]);
  return [...crearAvisosCambios(cambios), ...crearAvisosExamenes(examenes)];
}

export function crearAvisosCambios(cambios) {
 return cambios.map(cambio => ({
  intId: `cambio-${cambio.id}`, strTipo: "examen",
  strTitulo: cambio.tipo === "AULA" ? "Cambió de aula" : "Cambió de horario",
  strDescripcion: `${cambio.asignatura} · Antes: ${cambio.anterior}. Ahora: ${cambio.actual}.`,
  strHace: new Intl.DateTimeFormat("es-BO", {timeZone:"America/La_Paz",dateStyle:"short",timeStyle:"short"}).format(new Date(cambio.fecha)),
 }));
}
