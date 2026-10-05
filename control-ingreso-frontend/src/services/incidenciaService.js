/**
 * incidenciaService.js
 *
 * Capa de servicios para la HU06: Incidencias.
 * Conecta directamente con IncidenciaController del backend (/api/incidencias).
 * Cumple estrictamente con el contrato REST definido para HU06.
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

/**
 * Cliente HTTP autenticado con manejo de sesión vencida (401)
 * y soporte transparente para multipart/form-data y JSON.
 */
async function fetchAutenticado(strRuta, objOpciones = {}) {
  const strToken = obtenerToken();
  const esFormData = objOpciones.body instanceof FormData;

  const headers = {
    ...(esFormData ? {} : { "Content-Type": "application/json" }),
    ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    ...(objOpciones.headers || {}),
  };

  const response = await fetch(`${strApiBaseUrl}${strRuta}`, {
    ...objOpciones,
    headers,
  });

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
  return fetchAutenticado(`/api/incidencias/ambientes${strQuery}`);
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

  return fetchAutenticado(`/api/incidencias/estudiante?${params.toString()}`);
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
 * Lista las incidencias filtradas por examen, aula, tipo y estado.
 * GET /api/incidencias?idExamen=&idAmbiente=&tipo=&estado=
 * Roles: ADMINISTRADOR, DOCENTE
 * Devuelve IncidenciaListaDto: { totales: { abiertas, enRevision, cerradas }, incidencias: [...] }
 */
export async function listarIncidencias({ idExamen, idAmbiente, tipo, estado } = {}) {
  const params = new URLSearchParams();
  if (idExamen) params.set("idExamen", idExamen);
  if (idAmbiente && idAmbiente !== "TODAS") params.set("idAmbiente", idAmbiente);
  if (tipo && tipo !== "TODOS") params.set("tipo", tipo);
  if (estado && estado !== "TODOS") params.set("estado", estado);

  const strQuery = params.toString() ? `?${params.toString()}` : "";
  return fetchAutenticado(`/api/incidencias${strQuery}`);
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

// Re-exportamos los servicios de ingresos excepcionales para máxima compatibilidad
export {
  consultarEstudianteExcepcional,
  autorizarIngresoExcepcional,
  listarIngresosExcepcionales,
} from "./ingresoExcepcionalService";
