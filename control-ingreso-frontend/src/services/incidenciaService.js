/**
 * incidenciaService.js
 *
 * Capa de servicios para la HU06: Incidencias.
 * Conecta directamente con IncidenciaController del backend (/api/incidencias).
 * Cumple estrictamente con el contrato REST definido para HU06.
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

// Sin timeout un fetch contra un servidor inalcanzable puede quedar colgado
// varios minutos (por ejemplo, con Wi-Fi conectado pero sin internet).
const TIMEOUT_LECTURA_MS = 10000;
const TIMEOUT_ESCRITURA_MS = 30000;
const TIMEOUT_EXPORTACION_MS = 60000;

/** Error de red/timeout marcado para que la UI pueda caer al modo offline. */
function errorSinConexion(strMensaje) {
  const error = new Error(strMensaje);
  error.offline = true;
  return error;
}

/**
 * Cliente HTTP autenticado con manejo de sesión vencida (401),
 * timeout configurable y soporte transparente para multipart/form-data y JSON.
 */
async function fetchAutenticado(strRuta, objOpciones = {}) {
  const { timeoutMs, ...opcionesFetch } = objOpciones;
  const strToken = obtenerToken();
  const esFormData = opcionesFetch.body instanceof FormData;

  const headers = {
    ...(esFormData ? {} : { "Content-Type": "application/json" }),
    ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    ...(opcionesFetch.headers || {}),
  };

  const esEscritura = String(opcionesFetch.method || "GET").toUpperCase() !== "GET";
  const tiempoMaximo = timeoutMs ?? (esEscritura ? TIMEOUT_ESCRITURA_MS : TIMEOUT_LECTURA_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), tiempoMaximo);

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}${strRuta}`, {
      ...opcionesFetch,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError" || controller.signal.aborted) {
      throw errorSinConexion(
        "No se pudo conectar con el servidor a tiempo. Revisa tu conexión e intenta de nuevo; no se guardó nada."
      );
    }
    // Sin red o servidor caído: el backend no llegó a guardar nada.
    throw errorSinConexion(
      "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo; no se guardó nada."
    );
  } finally {
    clearTimeout(timer);
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

/**
 * Catálogos de tipos, severidades, estados y motivos de excepción.
 * GET /api/incidencias/catalogos
 * Roles: ADMINISTRADOR, DOCENTE, OPERADOR
 */
export async function obtenerCatalogosIncidencia() {
  return fetchAutenticado("/api/incidencias/catalogos");
}

/**
 * Aulas de los exámenes del día (o de la fecha indicada) que el usuario puede operar.
 * GET /api/incidencias/ambientes?fecha=
 * Roles: ADMINISTRADOR, DOCENTE, OPERADOR
 */
export async function obtenerAmbientesDelDia(strFecha) {
  const params = new URLSearchParams();
  if (strFecha) params.set("fecha", strFecha);
  const strQuery = params.toString() ? `?${params.toString()}` : "";
  return fetchAutenticado(`/api/incidencias/ambientes${strQuery}`, { timeoutMs: 20000 });
}

/**
 * Aulas de TODOS los exámenes asignados al usuario que ya se tomaron o se toman
 * hoy (más recientes primero). Las incidencias se pueden registrar después del
 * examen, así que esta es la lista para la sección Incidencias.
 * GET /api/incidencias/aulas-asignadas
 * Roles: ADMINISTRADOR, DOCENTE (exámenes de los que es responsable),
 *        OPERADOR (aulas asignadas en la HU05)
 */
export async function obtenerAulasAsignadas() {
  return fetchAutenticado("/api/incidencias/aulas-asignadas", { timeoutMs: 20000 });
}

/** Avisa al menú lateral (contador de abiertas) que algo cambió. */
export function notificarCambioIncidencias() {
  window.dispatchEvent(new Event("incidencias:actualizadas"));
}

/**
 * Consulta a un estudiante involucrado en una incidencia.
 * GET /api/incidencias/estudiante?idAmbiente=&q=
 * Roles: ADMINISTRADOR, DOCENTE, OPERADOR
 */
export async function consultarEstudianteIncidencia(idAmbiente, strBusqueda) {
  const params = new URLSearchParams();
  if (idAmbiente) params.set("idAmbiente", idAmbiente);
  if (strBusqueda) params.set("q", strBusqueda.trim());

  // La búsqueda se usa desde un formulario: si el servidor no responde,
  // conviene fallar rápido y caer a la nómina local.
  return fetchAutenticado(`/api/incidencias/estudiante?${params.toString()}`, {
    timeoutMs: 8000,
  });
}

/**
 * Registra una nueva incidencia durante el examen (multipart/form-data).
 * POST /api/incidencias
 * Roles: ADMINISTRADOR, DOCENTE, OPERADOR
 *
 * Parámetros obligatorios:
 *  - claveSolicitud (UUID v4 generado con crypto.randomUUID() al abrir el formulario)
 *  - idAmbiente (número)
 *  - tipo (código: SUPLANTACION, OBJETO_PROHIBIDO, etc.)
 *  - severidad (código: BAJA, MEDIA, ALTA)
 *  - descripcion (15 a 500 caracteres)
 *  - codSisEstudiante (opcional)
 *  - retirarEstudiante (boolean, opcional)
 *  - evidencia (archivo JPG/PNG máx 5 MB, opcional)
 */
export async function registrarIncidencia({
  claveSolicitud,
  idAmbiente,
  tipo,
  severidad,
  descripcion,
  codSisEstudiante = null,
  retirarEstudiante = false,
  evidencia = null,
}) {
  const formData = new FormData();
  formData.append("claveSolicitud", claveSolicitud || crypto.randomUUID());
  formData.append("idAmbiente", idAmbiente);
  formData.append("tipo", tipo);
  formData.append("severidad", severidad);
  formData.append("descripcion", descripcion);
  formData.append("retirarEstudiante", Boolean(retirarEstudiante));

  if (codSisEstudiante) {
    formData.append("codSisEstudiante", codSisEstudiante);
  }

  if (evidencia) {
    formData.append("evidencia", evidencia);
  }

  return fetchAutenticado("/api/incidencias", {
    method: "POST",
    body: formData,
  });
}

/**
 * Adjunta la evidencia de una incidencia ya registrada (se usa al sincronizar
 * una incidencia creada offline cuya foto quedó guardada en el dispositivo).
 * POST /api/incidencias/{id}/evidencia (multipart)
 * Roles: ADMINISTRADOR, DOCENTE, OPERADOR
 */
export async function subirEvidenciaIncidencia(idIncidencia, archivo, strNombre = "evidencia.jpg") {
  const formData = new FormData();
  formData.append("evidencia", archivo, strNombre);
  return fetchAutenticado(`/api/incidencias/${idIncidencia}/evidencia`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Lista las incidencias filtradas por examen, aula, materia, tipo y estado.
 * GET /api/incidencias?idExamen=&idAmbiente=&idAsignatura=&tipo=&estado=
 * Roles: ADMINISTRADOR, DOCENTE
 * Devuelve IncidenciaListaDto: { totales: { abiertas, enRevision, cerradas }, incidencias: [...] }
 */
export async function listarIncidencias({ idExamen, idAmbiente, idAsignatura, tipo, estado } = {}) {
  const params = new URLSearchParams();
  if (idExamen) params.set("idExamen", idExamen);
  if (idAmbiente && idAmbiente !== "TODAS") params.set("idAmbiente", idAmbiente);
  if (idAsignatura && idAsignatura !== "TODAS") params.set("idAsignatura", idAsignatura);
  if (tipo && tipo !== "TODOS") params.set("tipo", tipo);
  if (estado && estado !== "TODOS") params.set("estado", estado);

  const strQuery = params.toString() ? `?${params.toString()}` : "";
  return fetchAutenticado(`/api/incidencias${strQuery}`);
}

/**
 * Descarga las incidencias filtradas como Excel (.xlsx).
 * GET /api/incidencias/exportar?idExamen=&idAmbiente=&idAsignatura=&tipo=&estado=&soloExpulsiones=
 * Roles: ADMINISTRADOR, DOCENTE
 * Devuelve el Blob del archivo .xlsx.
 */
export async function exportarIncidenciasExcel({ idExamen, idAmbiente, idAsignatura, tipo, estado, soloExpulsiones } = {}) {
  const params = new URLSearchParams();
  if (idExamen) params.set("idExamen", idExamen);
  if (idAmbiente && idAmbiente !== "TODAS") params.set("idAmbiente", idAmbiente);
  if (idAsignatura && idAsignatura !== "TODAS") params.set("idAsignatura", idAsignatura);
  if (tipo && tipo !== "TODOS") params.set("tipo", tipo);
  if (estado && estado !== "TODOS") params.set("estado", estado);
  if (soloExpulsiones) params.set("soloExpulsiones", "true");

  const strToken = obtenerToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_EXPORTACION_MS);
  let response;
  try {
    response = await fetch(`${strApiBaseUrl}/api/incidencias/exportar?${params.toString()}`, {
      headers: { ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}) },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError" || controller.signal.aborted) {
      throw errorSinConexion("El servidor no respondió a tiempo para exportar. Revisa tu conexión.");
    }
    throw errorSinConexion("No se pudo conectar con el servidor para exportar.");
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
    window.location.href = "/login";
    throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
  }

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(
      objError?.mensaje || objError?.error || `Error ${response.status} al exportar.`
    );
  }

  return response.blob();
}

/**
 * Obtiene el total de incidencias abiertas para el badge del menú lateral.
 * GET /api/incidencias/abiertas/total
 * Roles: ADMINISTRADOR, DOCENTE
 * Devuelve: { total: number }
 */
export async function obtenerTotalIncidenciasAbiertas() {
  return fetchAutenticado("/api/incidencias/abiertas/total");
}

/**
 * Detalle completo de una incidencia con su línea de tiempo.
 * GET /api/incidencias/{id}
 * Roles: ADMINISTRADOR, DOCENTE
 */
export async function obtenerDetalleIncidencia(idIncidencia) {
  return fetchAutenticado(`/api/incidencias/${idIncidencia}`);
}

/**
 * Cambia el estado de ABIERTA a EN_REVISION.
 * PATCH /api/incidencias/{id}/revision
 * Roles: ADMINISTRADOR, DOCENTE
 */
export async function marcarEnRevisionIncidencia(idIncidencia) {
  return fetchAutenticado(`/api/incidencias/${idIncidencia}/revision`, {
    method: "PATCH",
  });
}

/**
 * Cierra la incidencia con su resolución obligatoria.
 * PATCH /api/incidencias/{id}/cierre
 * Roles: ADMINISTRADOR, DOCENTE
 * Body JSON: { "resolucion": "..." }
 */
export async function cerrarIncidencia(idIncidencia, strResolucion) {
  return fetchAutenticado(`/api/incidencias/${idIncidencia}/cierre`, {
    method: "PATCH",
    body: JSON.stringify({
      resolucion: strResolucion,
    }),
  });
}

/**
 * Revoca una expulsión autorizada (solo Docente).
 * PUT /api/examenes/{idExamen}/expulsiones/{idExpulsion}/revocar
 */
export async function revocarExpulsion(idExamen, idExpulsion, strMotivo) {
  const params = new URLSearchParams();
  if (strMotivo) params.set("motivo", strMotivo);
  const strQuery = params.toString() ? `?${params.toString()}` : "";
  return fetchAutenticado(`/api/examenes/${idExamen}/expulsiones/${idExpulsion}/revocar${strQuery}`, {
    method: "PUT",
  });
}

// Re-exportamos los servicios de ingresos excepcionales para máxima compatibilidad
export {
  consultarEstudianteExcepcional,
  autorizarIngresoExcepcional,
  listarIngresosExcepcionales,
} from "./ingresoExcepcionalService";
