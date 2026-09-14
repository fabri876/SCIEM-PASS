/**
 * adminService.js
 *
 * Llamadas al backend para el panel de administración de usuarios, roles
 * y auditoría (HU16), bajo /api/admin/**. Todas requieren el token JWT
 * del administrador logueado (ver authService.js), que se agrega acá
 * mismo con fetchAutenticado en vez de repetirlo en cada función.
 *
 * Si el backend responde 401 (token vencido o ausente), se cierra la
 * sesión local y se manda al usuario a /login mostrando el mensaje de
 * "Sesión expirada" (criterio de aceptación #9 de HU16).
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

async function fetchAutenticado(strRuta, objOpciones = {}) {
  const strToken = obtenerToken();

  const response = await fetch(`${strApiBaseUrl}${strRuta}`, {
    ...objOpciones,
    headers: {
      "Content-Type": "application/json",
      ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
      ...(objOpciones.headers || {}),
    },
  });

  if (response.status === 401) {
    cerrarSesion();
    sessionStorage.setItem(
      "mensajeSesion",
      "Sesión expirada. Por favor, inicia sesión nuevamente."
    );
    window.location.href = "/login";
    throw new Error("Sesión expirada.");
  }

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || "Ocurrió un error al comunicarse con el servidor.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function listarUsuarios({ rol, estado, busqueda } = {}) {
  const params = new URLSearchParams();
  if (rol) params.set("rol", rol);
  if (estado !== undefined && estado !== null) params.set("estado", estado);
  if (busqueda) params.set("busqueda", busqueda);
  const strQuery = params.toString() ? `?${params.toString()}` : "";
  return fetchAutenticado(`/api/admin/usuarios${strQuery}`);
}

export async function obtenerUsuario(idUsuario) {
  return fetchAutenticado(`/api/admin/usuarios/${idUsuario}`);
}

export async function crearUsuario(objDatosUsuario) {
  return fetchAutenticado("/api/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(objDatosUsuario),
  });
}

export async function actualizarUsuario(idUsuario, objDatosUsuario) {
  return fetchAutenticado(`/api/admin/usuarios/${idUsuario}`, {
    method: "PUT",
    body: JSON.stringify(objDatosUsuario),
  });
}

export async function cambiarEstadoUsuario(idUsuario, strNuevoEstado) {
  return fetchAutenticado(`/api/admin/usuarios/${idUsuario}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ nuevoEstado: strNuevoEstado }),
  });
}

export async function listarRoles() {
  return fetchAutenticado("/api/admin/roles");
}

export async function listarAuditoria() {
  return fetchAutenticado("/api/admin/auditoria");
}
