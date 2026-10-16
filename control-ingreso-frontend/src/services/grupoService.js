import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

function construirHeaders() {
  const strToken = obtenerToken();
  return {
    "Content-Type": "application/json",
    ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
  };
}

async function academico(ruta, opciones = {}) {
  const multipart = opciones.body instanceof FormData;
  const headers = construirHeaders();
  if (multipart) delete headers["Content-Type"];
  const response = await fetch(`${strApiBaseUrl}${ruta}`, { ...opciones, headers }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (response.status === 401) {
    cerrarSesion();
    throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status >= 500 ? "No se pudo completar la operación. Intenta nuevamente en unos minutos." : data?.mensaje || "No se pudo guardar la información académica.");
  return data;
}

export function crearAsignatura(datos) {
  return academico("/api/admin/academico/asignaturas", { method: "POST", body: JSON.stringify(datos) });
}

export function obtenerVinculaciones() {
  return academico("/api/grupos/vinculaciones");
}

export function vincularUsuario(datos) {
  return academico("/api/grupos/vinculaciones", { method: "POST", body: JSON.stringify(datos) });
}

export function previsualizarHorario(archivo) {
  const body = new FormData(); body.append("archivo", archivo);
  return academico("/api/admin/academico/horario/vista-previa", { method: "POST", body });
}

export function confirmarHorario(archivo) {
  const body = new FormData(); body.append("archivo", archivo);
  return academico("/api/admin/academico/horario/confirmar", { method: "POST", body });
}

/**
 * 1º Desplegable en cascada: Obtiene todas las asignaturas (/api/grupos/asignaturas).
 */
export async function obtenerAsignaturas() {
  const response = await fetch(`${strApiBaseUrl}/api/grupos/catalogo`, {
    headers: construirHeaders(),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    throw new Error("No se pudieron obtener las asignaturas.");
  }
  return response.json();
}
export function obtenerCatalogoGrupos() {
  return academico("/api/grupos/catalogo/grupos");
}

/**
 * 2º Desplegable en cascada: Obtiene docentes que dictan una asignatura (/api/grupos/asignaturas/{idAsignatura}/docentes).
 */
export async function obtenerDocentesPorAsignatura(idAsignatura) {
  if (!idAsignatura) return [];
  const response = await fetch(`${strApiBaseUrl}/api/grupos/asignaturas/${idAsignatura}/docentes`, {
    headers: construirHeaders(),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    throw new Error("No se pudieron obtener los docentes de la asignatura.");
  }
  return response.json();
}

/**
 * 3º Desplegable en cascada: Obtiene los grupos que imparte un docente en una asignatura
 * (/api/grupos/asignaturas/{idAsignatura}/docentes/{idUsuarioDocente}).
 */
export async function obtenerGruposPorDocente(idAsignatura, idUsuarioDocente) {
  if (!idAsignatura || !idUsuarioDocente) return [];
  const response = await fetch(
    `${strApiBaseUrl}/api/grupos/asignaturas/${idAsignatura}/docentes/${idUsuarioDocente}`,
    {
      headers: construirHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error("No se pudieron obtener los grupos del docente.");
  }
  return response.json();
}

/**
 * Obtiene todos los grupos de una asignatura (/api/grupos/asignaturas/{idAsignatura}).
 */
export async function obtenerGruposPorAsignatura(idAsignatura) {
  if (!idAsignatura) return [];
  const response = await fetch(`${strApiBaseUrl}/api/grupos/asignaturas/${idAsignatura}`, {
    headers: construirHeaders(),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    throw new Error("No se pudieron obtener los grupos de la asignatura.");
  }
  return response.json();
}

/**
 * Obtiene las asignaturas y grupos asignados a un ayudante (/api/grupos/ayudante/{idUsuario}).
 */
export async function obtenerGruposAyudante(idUsuario) {
  if (!idUsuario) return [];
  const response = await fetch(`${strApiBaseUrl}/api/grupos/ayudante/${idUsuario}`, {
    headers: construirHeaders(),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    throw new Error("No se pudieron obtener las asignaciones del ayudante.");
  }
  return response.json();
}

/**
 * Crea un nuevo grupo en una asignatura (/api/grupos).
 */
export async function crearGrupo({ idAsignatura, nombreGrupo, horarios }) {
  const response = await fetch(`${strApiBaseUrl}/api/grupos`, {
    method: "POST",
    headers: construirHeaders(),
    body: JSON.stringify({ idAsignatura, nombreGrupo, horarios }),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.mensaje || "Error al crear el grupo.");
  }
  return response.json();
}

/**
 * Asigna un docente a un grupo (/api/grupos/docentes/asignar).
 */
export async function asignarDocenteAGrupo({ idUsuario, codSisDocente, idGrupo }) {
  const response = await fetch(`${strApiBaseUrl}/api/grupos/docentes/asignar`, {
    method: "POST",
    headers: construirHeaders(),
    body: JSON.stringify({ idUsuario, codSisDocente, idGrupo }),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.mensaje || "Error al asignar docente al grupo.");
  }
  return response.json();
}

/**
 * Inscribe un estudiante en un grupo (/api/grupos/estudiantes/inscribir).
 */
export async function inscribirEstudianteAGrupo({ idUsuario, codSisEstudiante, idGrupo }) {
  const response = await fetch(`${strApiBaseUrl}/api/grupos/estudiantes/inscribir`, {
    method: "POST",
    headers: construirHeaders(),
    body: JSON.stringify({ idUsuario, codSisEstudiante, idGrupo }),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.mensaje || "Error al inscribir estudiante en el grupo.");
  }
  return response.json();
}

/**
 * Asigna un ayudante a un grupo (/api/grupos/ayudantes/asignar).
 */
export async function asignarAyudanteAGrupo({ idUsuario, idGrupo }) {
  const response = await fetch(`${strApiBaseUrl}/api/grupos/ayudantes/asignar`, {
    method: "POST",
    headers: construirHeaders(),
    body: JSON.stringify({ idUsuario, idGrupo }),
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.mensaje || "Error al asignar ayudante al grupo.");
  }
  return response.json();
}

export function quitarVinculacion({ idUsuario, rol, idGrupo }) {
  return academico(`/api/grupos/vinculaciones/${encodeURIComponent(rol)}/${idUsuario}/${idGrupo}`, { method: "DELETE" });
}
