import { strApiBaseUrl } from "./apiConfig";

const TIEMPO_INACTIVIDAD_MAXIMO_MS = 30 * 60 * 1000; // 30 minutos

export function registrarActividad() {
  localStorage.setItem("ultimaActividad", Date.now().toString());
}

export function estaSesionExpirada() {
  const token = localStorage.getItem("token");
  if (!token) return true;

  const strUltimaActividad = localStorage.getItem("ultimaActividad");
  if (!strUltimaActividad) return false;

  const intUltimaActividad = parseInt(strUltimaActividad, 10);
  return (Date.now() - intUltimaActividad) > TIEMPO_INACTIVIDAD_MAXIMO_MS;
}

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
    registrarActividad();
  }
  return data;
}

export function obtenerToken() {
  if (estaSesionExpirada()) {
    cerrarSesion();
    return null;
  }
  return localStorage.getItem("token");
}

export function obtenerUsuarioActual() {
  if (estaSesionExpirada()) {
    cerrarSesion();
    return null;
  }
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
  localStorage.removeItem("ultimaActividad");
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
