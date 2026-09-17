import { strApiBaseUrl } from "./apiConfig";

/**
 * authService.js
 *
 * Acá viven las funciones que hablan por HTTP con el backend para todo lo
 * relacionado a autenticación (registro y, más adelante, login). El
 * componente RegistroForm no hace fetch() directo: le pide el registro a
 * esta función y listo, siguiendo el mismo patrón que describe el
 * documento de arquitectura para "services/" (ej. estudianteService.js).
 *
 * ⚠️ IMPORTANTE para coordinar con el equipo de backend:
 * El endpoint "/api/auth/registro" y el nombre de los campos del body son
 * un supuesto razonable dado que en Spring Boot todavía no existe ningún
 * controlador de registro (según el documento de arquitectura, aplicacion/
 * y persistencia/ siguen vacías). Hay que confirmar con quien construya
 * el controlador real:
 *   - la ruta exacta del endpoint
 *   - los nombres de los campos que espera el DTO/entidad Estudiante
 *   - la forma de la respuesta (¿devuelve el usuario creado? ¿un token?)
 * y ajustar esta función una vez esté definido.
 */
export async function registrarUsuario(objDatosRegistro) {
  const response = await fetch(`${strApiBaseUrl}/api/auth/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(objDatosRegistro),
  });

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || "No se pudo completar el registro.");
  }

  return response.json();
}

/**
 * ⚠️ Mismo supuesto que registrarUsuario, pendiente de confirmar con
 * backend: la ruta exacta ("/api/auth/login"), los nombres de campo que
 * espera el body (acá asumí "correo" y "contrasena", igual que en el
 * registro) y la forma de la respuesta — lo más probable es que esto
 * devuelva un token (JWT), que todavía no se está guardando en ningún
 * lado (falta definir eso junto con el routing, HU16 en adelante).
 */
export async function iniciarSesion(objDatosLogin) {
  const response = await fetch(`${strApiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(objDatosLogin),
  });

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || "Correo o contraseña incorrectos.");
  }

  const data = await response.json();
  if (data?.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
  }
  return data;
}

export function obtenerToken() {
  return localStorage.getItem("token");
}

export function obtenerUsuarioActual() {
  const strUsuario = localStorage.getItem("usuario");
  if (!strUsuario) return null;
  try {
    return JSON.parse(strUsuario);
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

export function obtenerRutaPorRol(strRol) {
  switch (strRol) {
    case "ADMINISTRADOR":
      return "/admin";
    case "DOCENTE":
      return "/home/docente";
    case "OPERADOR":
      return "/control";
    case "ESTUDIANTE":
      return "/estudiante";
    default:
      return "/estudiante";
  }

}


