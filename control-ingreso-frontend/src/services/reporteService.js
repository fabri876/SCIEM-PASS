// HU12 y HU13: generación y descarga de reportes oficiales de asistencia e intentos incorrectos.
// El backend provee los endpoints oficiales en Spring Boot.
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

// Tiempo máximo de espera por el archivo. Si el servidor no responde antes, se avisa que está ocupado
// en lugar de dejar al usuario esperando sin respuesta.
const ESPERA_MAXIMA_MS = 45000;
const MENSAJE_SERVIDOR_OCUPADO = "El servidor está ocupado en este momento. Espera unos minutos e intenta de nuevo.";

export async function descargarReporteAsistencia(idExamen, strFormato, listSecciones) {
  const strToken = obtenerToken();
  const objParams = new URLSearchParams({ formato: strFormato, secciones: listSecciones.join(",") });

  const objControl = new AbortController();
  const idEspera = setTimeout(() => objControl.abort(), ESPERA_MAXIMA_MS);

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}/api/reportes/examenes/${idExamen}/asistencia?${objParams}`, {
      headers: strToken ? { Authorization: `Bearer ${strToken}` } : {},
      signal: objControl.signal,
    });
  } catch (err) {
    clearTimeout(idEspera);
    if (err?.name === "AbortError") throw new Error(MENSAJE_SERVIDOR_OCUPADO);
    throw new Error("No se pudo generar el reporte. Revisa tu conexión e intenta de nuevo.");
  }

  // Sesión vencida: se pide iniciar sesión otra vez
  if (response.status === 401) {
    clearTimeout(idEspera);
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Sesión expirada. Por favor, inicia sesión nuevamente.");
    window.location.href = "/login";
    throw new Error("Sesión expirada.");
  }
  if (response.status === 403) {
    clearTimeout(idEspera);
    throw new Error("No tienes permiso para generar el reporte de este examen.");
  }
  if (response.status === 404 || response.status === 405) {
    clearTimeout(idEspera);
    throw new Error("La generación de reportes todavía no está disponible en el servidor.");
  }
  // Servidor saturado o con falla temporal: mensaje claro, sin detalles técnicos
  if (response.status === 429 || response.status >= 500) {
    clearTimeout(idEspera);
    throw new Error(MENSAJE_SERVIDOR_OCUPADO);
  }
  if (!response.ok) {
    clearTimeout(idEspera);
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || "No se pudo generar el reporte. Intenta de nuevo.");
  }

  let blobArchivo;
  try {
    blobArchivo = await response.blob();
  } catch (err) {
    if (err?.name === "AbortError") throw new Error(MENSAJE_SERVIDOR_OCUPADO);
    throw new Error("No se pudo generar el reporte. Revisa tu conexión e intenta de nuevo.");
  } finally {
    clearTimeout(idEspera);
  }
  if (!blobArchivo || blobArchivo.size === 0) {
    throw new Error("El servidor devolvió un archivo vacío. Intenta de nuevo.");
  }
  return {
    blobArchivo,
    strNombre: nombreDesdeCabecera(response.headers.get("Content-Disposition")),
  };
}

// Re-exportación de servicios de HU13 (Reporte de Intentos de Ingreso Incorrectos)
export {
  listarReporteIntentosIncorrectos,
  calcularEstadisticasIntentos,
  exportarIntentosExcelCsv,
  generarReporteOficialPdf,
  DATOS_SEMILLA_INTENTOS,
} from "./reporteIntentosService";