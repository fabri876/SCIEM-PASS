/**
 * ingresoExcepcionalService.js
 *
 * Servicio Frontend para la HU06: Ingresos Excepcionales.
 * Conecta directamente con IngresoExcepcionalController del backend (/api/ingresos-excepcionales).
 * Requiere autenticación con token JWT de rol DOCENTE (de la materia) o ADMINISTRADOR.
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
 * Consulta a un estudiante en un aula por CI o Código SIS.
 * Endpoint: GET /api/ingresos-excepcionales/consulta?idAmbiente=&q=
 * Devuelve ConsultaEstudianteDto:
 *  - estado: HABILITADO | INHABILITADO | NO_EN_LISTA | NO_ENCONTRADO | DUPLICADO | RETIRADO
 *  - mensaje, codSis, ci, nombreCompleto, horaIngresoPrevio, aulaIngresoPrevio
 *  - puedeAutorizarExcepcional, puedeRegistrarIncidencia, puedeRetirar
 *  - aforo: { ocupados, capacidad, disponibles }, ingresoCerrado
 */
export async function consultarEstudianteExcepcional(idAmbiente, strBusqueda) {
  const params = new URLSearchParams();
  if (idAmbiente) params.set("idAmbiente", idAmbiente);
  if (strBusqueda) params.set("q", strBusqueda.trim());

  return fetchAutenticado(`/api/ingresos-excepcionales/consulta?${params.toString()}`);
}

/**
 * Autoriza un ingreso excepcional justificado.
 * Endpoint: POST /api/ingresos-excepcionales (multipart/form-data)
 *
 * Parámetros obligatorios:
 *  - idAmbiente (número)
 *  - codSis (número)
 *  - motivo (código: SIN_CARNET_QR | NO_FIGURA_EN_LISTA | LLEGADA_TARDIA | TRASLADO_AULA)
 *  - observacion (texto de 20 a 500 caracteres)
 *  - respaldo (archivo JPG/PNG máx 5 MB, opcional)
 *
 * Devuelve IngresoExcepcionalDto (201 Created).
 */
export async function autorizarIngresoExcepcional({
  idAmbiente,
  codSis,
  motivo,
  observacion,
  respaldo = null,
}) {
  const formData = new FormData();
  formData.append("idAmbiente", idAmbiente);
  formData.append("codSis", codSis);
  formData.append("motivo", motivo);
  formData.append("observacion", observacion);
  if (respaldo) {
    formData.append("respaldo", respaldo);
  }

  return fetchAutenticado("/api/ingresos-excepcionales", {
    method: "POST",
    body: formData,
  });
}

/**
 * Lista los ingresos excepcionales de un examen y/o aula.
 * Endpoint: GET /api/ingresos-excepcionales?idExamen=&idAmbiente=
 * Devuelve List<IngresoExcepcionalDto>.
 */
export async function listarIngresosExcepcionales({ idExamen, idAmbiente } = {}) {
  const params = new URLSearchParams();
  if (idExamen) params.set("idExamen", idExamen);
  if (idAmbiente && idAmbiente !== "TODAS") params.set("idAmbiente", idAmbiente);

  const strQuery = params.toString() ? `?${params.toString()}` : "";
  return fetchAutenticado(`/api/ingresos-excepcionales${strQuery}`);
}
