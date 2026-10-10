/**
 * Utilidades compartidas por la sección y los modales de la HU06.
 * El backend manda fechas/horas en hora de Bolivia y sin zona
 * ("2026-10-04" y "2026-10-04T08:19:30"): se muestran tal cual, sin convertir.
 */

const TAMANIO_MAXIMO_IMAGEN = 5 * 1024 * 1024;
const TIPOS_IMAGEN = ["image/jpeg", "image/png"];

/** "2026-10-04" o "2026-10-04T08:19:30" → "04/10/2026" */
export function formatearFecha(strFecha) {
  if (!strFecha) return "Sin fecha";
  const [anio, mes, dia] = String(strFecha).substring(0, 10).split("-");
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : String(strFecha);
}

/** "2026-10-04T08:19:30" → "08:19" (sin pasar por Date, para no cambiar la zona) */
export function formatearHora(strFechaHora) {
  if (!strFechaHora) return "--:--";
  const strTexto = String(strFechaHora);
  const partes = strTexto.split("T");
  return (partes.length > 1 ? partes[1] : strTexto).substring(0, 5);
}

/** Devuelve el mensaje de error, o null si la imagen es válida. */
export function validarImagen(archivo) {
  if (!archivo) return null;
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    return "La imagen debe ser JPG o PNG.";
  }
  if (archivo.size > TAMANIO_MAXIMO_IMAGEN) {
    return "La imagen supera los 5 MB permitidos.";
  }
  return null;
}

/** Texto del selector: "Aula 601 · Cálculo I · 04/10/2026" */
export function etiquetaAula(aula) {
  if (!aula) return "";
  return `${aula.aula || "Aula"} · ${aula.asignatura || "Examen"} · ${formatearFecha(aula.fechaExamen)}`;
}

/** Texto del aforo: "56 / 60 · quedan 4" o "56 presentes (sin capacidad registrada)" */
export function textoAforo(aforo) {
  if (!aforo) return "";
  if (aforo.capacidad == null) {
    return `${aforo.ocupados} presentes (sin capacidad registrada)`;
  }
  return `${aforo.ocupados} / ${aforo.capacidad} · quedan ${aforo.disponibles}`;
}
