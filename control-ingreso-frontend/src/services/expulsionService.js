/**
 * expulsionService.js
 *
 * Capa de servicios para la HU14: Registro de Expulsados.
 * Conecta con el backend para registrar, autorizar y listar expulsiones.
 *
 * Endpoints (todos bajo /api/examenes/{idExamen}/expulsiones):
 *   POST  registrar expulsión
 *   GET   listar expulsiones (historial)
 *   GET   /pendientes
 *   GET   /pendientes/total
 *   PUT   /{idExpulsion}/autorizar
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

async function fetchAutenticado(strRuta, objOpciones = {}) {
  const strToken = obtenerToken();
  const esFormData = objOpciones.body instanceof FormData;

  const headers = {
    ...(esFormData ? {} : { "Content-Type": "application/json" }),
    ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    ...(objOpciones.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}${strRuta}`, {
      ...objOpciones,
      headers,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
  }

  if (response.status === 401) {
    cerrarSesion();
    sessionStorage.setItem(
      "mensajeSesion",
      "Tu sesión expiró, vuelve a iniciar sesión"
    );
    window.location.href = "/login";
    throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
  }

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(
      objError?.mensaje ||
        objError?.error ||
        `Error ${response.status} en el servidor.`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/** Ruta base para las expulsiones de un examen. */
function rutaExamen(idExamen) {
  return `/api/examenes/${idExamen}/expulsiones`;
}

/**
 * Obtiene el total de expulsiones pendientes de autorización (para el badge).
 * @param {number} idExamen - ID del examen
 */
export async function obtenerTotalExpulsionesPendientes(idExamen) {
  const data = await fetchAutenticado(`${rutaExamen(idExamen)}/pendientes/total`);
  // El backend responde con el número directamente (Long), no con { total }.
  if (typeof data === "number") return data;
  return data?.total ?? 0;
}

/**
 * Registra una nueva expulsión (queda en estado PENDIENTE).
 * Envía multipart/form-data para poder adjuntar la foto de evidencia (opcional).
 * @param {number} idExamen - ID del examen
 * @param {object} objDatos - { idIngreso, motivoExpulsion, observacion }
 * @param {File|null} archivoEvidencia - Foto JPG/PNG opcional (máx. 5 MB)
 */
export async function registrarExpulsion(idExamen, objDatos, archivoEvidencia = null) {
  const objFormulario = new FormData();
  objFormulario.append("idIngreso", objDatos.idIngreso);
  objFormulario.append("motivoExpulsion", objDatos.motivoExpulsion);
  objFormulario.append("observacion", objDatos.observacion ?? "");
  if (archivoEvidencia) {
    objFormulario.append("evidencia", archivoEvidencia);
  }

  return await fetchAutenticado(rutaExamen(idExamen), {
    method: "POST",
    body: objFormulario,
  });
}

/**
 * Lista las expulsiones pendientes de TODOS los exámenes del usuario
 * autenticado (docente), sin necesidad de indicar un idExamen.
 */
export async function listarPendientesDocente() {
  return await fetchAutenticado("/api/expulsiones/pendientes");
}

/**
 * Lista las expulsiones pendientes de autorización (para el docente).
 * @param {number} idExamen - ID del examen
 */
export async function listarExpulsionesPendientes(idExamen) {
  return await fetchAutenticado(`${rutaExamen(idExamen)}/pendientes`);
}

/**
 * Autoriza una expulsión (cambia estado a AUTORIZADA y bloquea al estudiante).
 * @param {number} idExamen - ID del examen
 * @param {number} idExpulsion - ID de la expulsión a autorizar
 */
export async function autorizarExpulsion(idExamen, idExpulsion) {
  return await fetchAutenticado(`${rutaExamen(idExamen)}/${idExpulsion}/autorizar`, {
    method: "PUT",
  });
}

/**
 * Deniega una expulsión (queda sin efecto, NO bloquea el reingreso).
 * @param {number} idExamen - ID del examen
 * @param {number} idExpulsion - ID de la expulsión a denegar
 */
export async function denegarExpulsion(idExamen, idExpulsion) {
  return await fetchAutenticado(`${rutaExamen(idExamen)}/${idExpulsion}/denegar`, {
    method: "PUT",
  });
}

/**
 * Busca un estudiante por CI/SIS en un examen para expulsión.
 * @param {number} idExamen - ID del examen
 * @param {string} ci - C.I. o Código SIS del estudiante
 */
export async function buscarEstudiante(idExamen, ci) {
  return await fetchAutenticado(`${rutaExamen(idExamen)}/buscar-estudiante?ci=${encodeURIComponent(ci)}`);
}

/**
 * Lista el historial de expulsiones de todos los exámenes del usuario autenticado.
 * @param {string|null} asignatura - Filtro opcional por nombre de materia (contiene)
 * @param {string|null} estado - Filtro opcional: PENDIENTE | AUTORIZADA | DENEGADA
 */
export async function listarHistorialDocente(asignatura = null, estado = null) {
  const params = new URLSearchParams();
  if (asignatura) params.append("asignatura", asignatura);
  if (estado) params.append("estado", estado);
  const query = params.toString() ? `?${params.toString()}` : "";
  return await fetchAutenticado(`/api/expulsiones/historial${query}`);
}
