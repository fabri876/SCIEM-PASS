/**
 * usuarioService.js
 *
 * Llamadas compartidas entre paneles (admin Y docente) bajo /api/usuarios/**
 * y /api/auth/cambiar-contrasena — a diferencia de adminService.js, que es
 * solo para /api/admin/** (bloqueado para no-administradores por
 * SecurityConfig). El backend ya valida en el server que un DOCENTE que
 * llama a estos endpoints solo puede registrar OPERADOR o ESTUDIANTE (ver
 * UsuarioService.validarPermisosRegistro / CargaMasivaService.validarPermisosCargaMasiva).
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
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });

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
    throw new Error(response.status >= 500 ? "No se pudo completar la operación. Intenta nuevamente en unos minutos." : objError?.mensaje || "Ocurrió un error al comunicarse con el servidor.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function registrarUsuarioIndividual(objDatosUsuario) {
  return fetchAutenticado("/api/usuarios/registro-individual", {
    method: "POST",
    body: JSON.stringify(objDatosUsuario),
  });
}

export async function cargarUsuariosMasivo(file, strRol = "ESTUDIANTE", idGrupo = null, vistaPrevia = false) {
  const strToken = obtenerToken();
  const formData = new FormData();
  formData.append("archivo", file);
  if (idGrupo) formData.append("idGrupo", String(idGrupo));
  if (strRol) {
    formData.append("rol", strRol);
  }

  const response = await fetch(`${strApiBaseUrl}/api/usuarios/carga-masiva${vistaPrevia ? "/vista-previa" : ""}`, {
    method: "POST",
    headers: {
      ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    },
    body: formData,
  }).catch(() => { throw new Error("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo."); });

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
    throw new Error(response.status >= 500 ? "No se pudo completar la operación. Intenta nuevamente en unos minutos." : objError?.mensaje || "Error al procesar la carga masiva.");
  }

  return response.json();
}

export function previsualizarUsuariosMasivo(file, rol, idGrupo) {
  return cargarUsuariosMasivo(file, rol, idGrupo, true);
}

// El backend infiere el usuario desde el token (no hace falta mandar correo).
export async function cambiarContrasena(strContrasenaActual, strContrasenaNueva) {
  return fetchAutenticado("/api/auth/cambiar-contrasena", {
    method: "POST",
    body: JSON.stringify({
      contrasenaActual: strContrasenaActual,
      nuevaContrasena: strContrasenaNueva,
    }),
  });
}
