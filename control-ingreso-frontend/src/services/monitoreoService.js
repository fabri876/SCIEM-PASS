/**
 * monitoreoService.js
 *
 * HU10 · Dashboard de monitoreo de asistencia y control de aulas.
 * Conecta con MonitoreoController (/api/monitoreo). Solo DOCENTE (exámenes
 * asignados) y ADMINISTRADOR. "Reubicar y Autorizar" es exclusivo del docente.
 *
 * Mismo patrón que incidenciaService (HU06): fetch + JWT en el header
 * Authorization, 401 → cerrar sesión y volver al login.
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

/** Error con el status HTTP, para que la pantalla distinga 403 / 409 / red. */
export class ErrorMonitoreo extends Error {
  constructor(strMensaje, intStatus = 0) {
    super(strMensaje);
    this.name = "ErrorMonitoreo";
    this.status = intStatus; // 0 = sin conexión con el servidor
  }
}

async function peticionAutenticada(strRuta, objOpciones = {}) {
  const strToken = obtenerToken();
  const headers = {
    "Content-Type": "application/json",
    ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    ...(objOpciones.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}${strRuta}`, { ...objOpciones, headers });
  } catch (err) {
    if (err?.name === "AbortError") throw err; // cancelado por la pantalla: no es un error
    throw new ErrorMonitoreo("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.", 0);
  }

  if (response.status === 401) {
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
    window.location.href = "/login";
    throw new ErrorMonitoreo("Tu sesión expiró, vuelve a iniciar sesión", 401);
  }

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    const strPorDefecto =
      response.status === 403
        ? "No tienes permiso para ver este examen."
        : `Error ${response.status} en el servidor.`;
    throw new ErrorMonitoreo(objError?.mensaje || objError?.error || strPorDefecto, response.status);
  }
  return response;
}

async function fetchAutenticado(strRuta, objOpciones = {}) {
  const response = await peticionAutenticada(strRuta, objOpciones);
  const strTexto = await response.text();
  return strTexto ? JSON.parse(strTexto) : {}; // PATCH/204 pueden venir sin cuerpo
}

/** true si el backend todavía no publica ese endpoint (404 / 405 / 501). */
export function esEndpointNoDisponible(err) {
  return [404, 405, 501].includes(err?.status);
}

/** Exámenes que el usuario puede monitorear (el de hoy primero). GET /api/monitoreo/examenes */
export async function obtenerExamenesMonitoreo({ signal } = {}) {
  return fetchAutenticado("/api/monitoreo/examenes", { signal });
}

/**
 * Métricas, aulas y alertas de un examen. Se consulta cada 15 s.
 * GET /api/monitoreo/examenes/{idExamen}/tablero
 */
export async function obtenerTableroMonitoreo(idExamen, { signal } = {}) {
  return fetchAutenticado(`/api/monitoreo/examenes/${idExamen}/tablero`, { signal });
}

/**
 * "Reubicar y Autorizar" (solo docente): reubica al estudiante de la alerta al
 * aula donde se presentó y registra su ingreso.
 * POST /api/monitoreo/reubicaciones  { idIntento }
 */
export async function reubicarYAutorizar(idIntento) {
  return fetchAutenticado("/api/monitoreo/reubicaciones", {
    method: "POST",
    body: JSON.stringify({ idIntento }),
  });
}

/* =============================================================================
 * CONTRATO PROPUESTO (HU10 del Sprint 2) — pendiente de confirmar con Marcela.
 * Estas 4 llamadas siguen el HTML del sprint. Si Marcela cambia una ruta o un
 * campo, se ajusta SOLO aquí y en normalizarLlegadas / normalizarAsistentes
 * (utilidadesMonitoreo.js). Mientras el endpoint no exista (404/405/501) la
 * pantalla muestra "se activará cuando el backend lo publique", sin romperse.
 * ========================================================================== */

/** Curva de llegada, un punto cada N minutos. GET /api/monitoreo/examenes/{idExamen}/llegadas?intervalo=5 */
export async function obtenerLlegadas(idExamen, intIntervalo = 5, { signal } = {}) {
  return fetchAutenticado(`/api/monitoreo/examenes/${idExamen}/llegadas?intervalo=${intIntervalo}`, { signal });
}

/** Lista de asistentes de un aula. GET /api/monitoreo/ambientes/{idAmbiente}/asistentes?idExamen= */
export async function obtenerAsistentesAula(idAmbiente, idExamen, { signal } = {}) {
  return fetchAutenticado(`/api/monitoreo/ambientes/${idAmbiente}/asistentes?idExamen=${idExamen}`, { signal });
}

/**
 * Exportación CSV (queda auditada como EXPORTACION_ASISTENCIA).
 * GET /api/monitoreo/ambientes/{idAmbiente}/asistentes.csv?idExamen=
 * Se descarga con fetch (lleva el JWT); un <a href> no podría enviarlo.
 */
export async function descargarAsistentesCsv(idAmbiente, idExamen) {
  const response = await peticionAutenticada(`/api/monitoreo/ambientes/${idAmbiente}/asistentes.csv?idExamen=${idExamen}`, {
    headers: { Accept: "text/csv" },
  });
  return response.blob();
}

/** Cierra (false) o reabre (true) el ingreso de un aula. PATCH /api/monitoreo/ambientes/{idAmbiente}/ingreso {abierto} */
export async function cambiarIngresoAula(idAmbiente, boolAbierto) {
  return fetchAutenticado(`/api/monitoreo/ambientes/${idAmbiente}/ingreso`, {
    method: "PATCH",
    body: JSON.stringify({ abierto: boolAbierto }),
  });
}