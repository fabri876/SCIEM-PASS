/**
 * expulsionService.js
 *
 * Capa de servicios para la HU14: Registro de Expulsados.
 * Conecta con el backend para registrar y consultar expulsiones.
 *
 * Endpoints:
 *   POST /api/examenes/{idExamen}/expulsiones            -> registrar expulsión
 *   GET  /api/examenes/{idExamen}/expulsiones/buscar-estudiante?ci=
 *   GET  /api/expulsiones/historial?asignatura=&estado=
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
 * Registra una nueva expulsión. El Docente la deja autorizada de inmediato.
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
