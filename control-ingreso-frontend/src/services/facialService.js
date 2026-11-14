import { strApiBaseUrl } from "./apiConfig";
import { cerrarSesion, obtenerToken } from "./authService";

async function solicitar(ruta, opciones = {}) {
  const token = obtenerToken();
  const esFormData = opciones.body instanceof FormData;
  const response = await fetch(`${strApiBaseUrl}${ruta}`, {
    ...opciones,
    headers: {
      ...(esFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers || {}),
    },
  }).catch(() => {
    throw new Error("No se pudo conectar con el servicio facial.");
  });
  if (response.status === 401) {
    cerrarSesion();
    throw new Error("Tu sesión expiró, vuelve a iniciar sesión.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.mensaje || error?.error || `Error ${response.status} en el servicio facial.`);
  }
  return response.status === 204 ? null : response.json();
}

export function enrolarRostro(formData) {
  return solicitar("/api/face/enroll", { method: "POST", body: formData });
}

export function registrarConsentimientoFacial() {
  return solicitar("/api/face/enrollment/consentimiento", { method: "POST" });
}

export function verificarRostroEstudiante({ embedding, livenessScore, idExamen }) {
  return solicitar("/api/face/verificar-estudiante", {
    method: "POST",
    body: JSON.stringify({ embedding, livenessScore, idExamen }),
  });
}

export function obtenerEstadoEnrolamiento() {
  return solicitar("/api/face/enrollment/status");
}

export function cambiarEstadoEnrolamiento(idEnrollment, estado) {
  return solicitar(`/api/face/enrollment/${idEnrollment}/status`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export function obtenerPaqueteExamen(idExamen) {
  return solicitar(`/api/face/examenes/${idExamen}/paquete`);
}

export function sincronizarLoteFacial(payloadLote) {
  return solicitar("/api/face/sync", { method: "POST", body: JSON.stringify(payloadLote) });
}

export function listarEnrolamientos({ estado, busqueda } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set("estado", estado);
  if (busqueda) params.set("busqueda", busqueda);
  return solicitar(`/api/face/enrollments${params.size ? `?${params}` : ""}`);
}

export function listarAuditoriaFacial() { return solicitar("/api/face/auditoria"); }

export function listarIntentosFaciales({ idExamen, idAmbiente } = {}) {
  const params = new URLSearchParams();
  if (idExamen) params.set("idExamen", idExamen);
  if (idAmbiente) params.set("idAmbiente", idAmbiente);
  return solicitar(`/api/face/intentos${params.size ? `?${params}` : ""}`);
}

/** URL sin token: úsala solo en un fetch autenticado para obtener un Blob, nunca en <img> público. */
export function urlFotoFacial(rutaRelativa) {
  const ruta = String(rutaRelativa || "").split("/").map(encodeURIComponent).join("/");
  return `${strApiBaseUrl}/api/face/photos/${ruta}`;
}
