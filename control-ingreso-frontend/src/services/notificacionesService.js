import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken } from "./authService";

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
  const token=obtenerToken();
  if(!token) return [];
  const respuesta=await fetch(`${strApiBaseUrl}/api/notificaciones`,{headers:{Authorization:`Bearer ${token}`}})
    .catch(()=>{throw new Error("No se pudieron cargar sus notificaciones. Revisa tu conexión.");});
  if(!respuesta.ok) throw new Error(respuesta.status===401?"Inicie sesión para ver sus notificaciones.":"No se pudieron cargar sus notificaciones.");
  const {examenes,cambios,eventos}=await respuesta.json();
  if(Array.isArray(eventos)) return [...eventos].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha) || String(b.intId).localeCompare(String(a.intId),undefined,{numeric:true}))
    .map(e=>({...e,strDescripcion:formatearDescripcion(e.strDescripcion),strHace:formatearFechaAviso(e.fecha)}));
  return [...crearAvisosCambios(cambios), ...crearAvisosExamenes(examenes)];
}

export function formatearFechaAviso(fecha) {
 return new Intl.DateTimeFormat("es-BO",{timeZone:"America/La_Paz",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(fecha));
}

export function formatearDescripcion(texto="") {
 const [materia,...detalle]=texto.split(" · ");
 // Presentación del catálogo SAGA en mayúsculas; la BD conserva el nombre original.
 const acentos={introduccion:"introducción",programacion:"programación",calculo:"cálculo",algebra:"álgebra",fisica:"física",quimica:"química",administracion:"administración",investigacion:"investigación",computacion:"computación",metodos:"métodos",analisis:"análisis",diseno:"diseño",teoria:"teoría",matematica:"matemática",ingenieria:"ingeniería",mecanica:"mecánica",electronica:"electrónica",estadistica:"estadística",logica:"lógica"};
 const nombre=materia===materia.toLocaleUpperCase("es") ? materia.toLocaleLowerCase("es").replace(/[a-záéíóúñ]+/g,p=>acentos[p]??p) : materia;
 const resultado=[nombre.charAt(0).toLocaleUpperCase("es")+nombre.slice(1),...detalle].join(" · ");
 return resultado.replace(/\s*\(#\d+\)/g,"").replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,"$3/$2/$1");
}

export function crearAvisosCambios(cambios) {
 return cambios.map(cambio => ({
  intId: `cambio-${cambio.id}`, strTipo: "examen",
  strTitulo: cambio.tipo === "AULA" ? "Cambio de aula" : "Cambio de horario",
  strDescripcion: formatearDescripcion(`${cambio.asignatura} · Antes: ${cambio.anterior}. Ahora: ${cambio.actual}.`),
  strHace: formatearFechaAviso(cambio.fecha),
 }));
}
