/**
 * monitoreoService.js
 *
 * HU10 · Dashboard de monitoreo de asistencia y control de aulas.
 * Conecta con MonitoreoController (/api/monitoreo). Solo DOCENTE (exámenes
 * asignados) y ADMINISTRADOR. "Reubicar y Autorizar" es exclusivo del docente.
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

async function fetchAutenticado(strRuta, objOpciones = {}) {
  const strToken = obtenerToken();
  const headers = {
    "Content-Type": "application/json",
    ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    ...(objOpciones.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}${strRuta}`, { ...objOpciones, headers });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
  }

  if (response.status === 401) {
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
    window.location.href = "/login";
    throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
  }

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || objError?.error || `Error ${response.status} en el servidor.`);
  }
  return response.json();
}

/** Exámenes que el usuario puede monitorear (hoy primero). GET /api/monitoreo/examenes */
export async function obtenerExamenesMonitoreo() {
  return fetchAutenticado("/api/monitoreo/examenes");
}

/**
 * Métricas, aulas y alertas de un examen. Se consulta cada 15 s.
 * GET /api/monitoreo/examenes/{idExamen}/tablero
 */
export async function obtenerTableroMonitoreo(idExamen) {
  return fetchAutenticado(`/api/monitoreo/examenes/${idExamen}/tablero`);
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
