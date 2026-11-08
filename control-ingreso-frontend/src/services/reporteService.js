// HU12: descarga del reporte de asistencia de un examen finalizado (PDF o Excel).
// El archivo lo genera el backend:
//   GET /api/reportes/examenes/{idExamen}/asistencia?formato=pdf|xlsx&secciones=resumen,asistentes,ausentes,inhabilitados
// Debe responder el archivo (application/pdf o
// application/vnd.openxmlformats-officedocument.spreadsheetml.sheet) con su nombre en Content-Disposition.
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

// Nombre del archivo que manda el backend en Content-Disposition (si lo manda)
function nombreDesdeCabecera(strCabecera) {
  if (!strCabecera) return "";
  const objUtf8 = strCabecera.match(/filename\*=UTF-8''([^;]+)/i);
  if (objUtf8) {
    try { return decodeURIComponent(objUtf8[1]); } catch { return objUtf8[1]; }
  }
  const objSimple = strCabecera.match(/filename="?([^";]+)"?/i);
  return objSimple ? objSimple[1] : "";
}

export async function descargarReporteAsistencia(idExamen, strFormato, listSecciones) {
  const strToken = obtenerToken();
  const objParams = new URLSearchParams({ formato: strFormato, secciones: listSecciones.join(",") });

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}/api/reportes/examenes/${idExamen}/asistencia?${objParams}`, {
      headers: strToken ? { Authorization: `Bearer ${strToken}` } : {},
    });
  } catch {
    throw new Error("No se pudo generar el reporte. Revisa tu conexión e intenta de nuevo.");
  }

  // Sesión vencida: se pide iniciar sesión otra vez
  if (response.status === 401) {
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Sesión expirada. Por favor, inicia sesión nuevamente.");
    window.location.href = "/login";
    throw new Error("Sesión expirada.");
  }
  if (response.status === 403) {
    throw new Error("No tienes permiso para generar el reporte de este examen.");
  }
  if (response.status === 404 || response.status === 405) {
    throw new Error("La generación de reportes todavía no está disponible en el servidor.");
  }
  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || "No se pudo generar el reporte. Intenta de nuevo.");
  }

  const blobArchivo = await response.blob();
  if (!blobArchivo || blobArchivo.size === 0) {
    throw new Error("El servidor devolvió un archivo vacío. Intenta de nuevo.");
  }
  return {
    blobArchivo,
    strNombre: nombreDesdeCabecera(response.headers.get("Content-Disposition")),
  };
}
