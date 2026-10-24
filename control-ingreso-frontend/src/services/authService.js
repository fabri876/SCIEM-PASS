import { strApiBaseUrl } from "./apiConfig";

const TIEMPO_INACTIVIDAD_MAXIMO_MS = 30 * 60 * 1000; // 30 minutos

let boolModoOfflineForzado = false;

export function setModoOfflineForzado(valor) {
  boolModoOfflineForzado = Boolean(valor);
}

export function registrarActividad() {
  localStorage.setItem("ultimaActividad", Date.now().toString());
}

export function estaSesionExpirada() {
  const sinInternet = typeof window !== "undefined" && Boolean(window.__sciemSinInternet);
  const sinRed = typeof navigator !== "undefined" && navigator.onLine === false;
  if (sinInternet || sinRed) return false;

  const token = localStorage.getItem("token");
  if (!token) return true;

  // Si no hay registro de actividad previa, no considerar expirado (primer inicio)
  const strUltimaActividad = localStorage.getItem("ultimaActividad");
  if (!strUltimaActividad) return false;

  const intUltimaActividad = parseInt(strUltimaActividad, 10);
  return (Date.now() - intUltimaActividad) > TIEMPO_INACTIVIDAD_MAXIMO_MS;
}

function iniciarRegistroActividadGlobal() {
  if (typeof window === "undefined") return;
  const eventos = ["click", "keydown", "scroll", "mousemove", "touchstart"];
  eventos.forEach((evt) =>
    window.addEventListener(evt, registrarActividad, { passive: true })
  );
}

// Iniciar monitoreo de actividad al cargar el módulo
iniciarRegistroActividadGlobal();

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

export async function limpiarDatosLocalesDeUsuario(idUsuario) {
  let advertenciaMarcasPendientes = false;
  try {
    const { examenRepo } = await import("../offline/examenRepo.js");
    const { eliminarNominaLocal } = await import("../offline/nominaLoader.js");
    const { db } = await import("../offline/db.js");
    const { ERROR_ASISTENCIA } = await import("../offline/constantes.js");
    const { detenerSincronizacionAutomatica } = await import("../offline/syncScheduler.js");

    try {
      detenerSincronizacionAutomatica();
    } catch {}

    if (idUsuario) {
      try {
        await examenRepo.limpiarExamenesDeUsuario(idUsuario);
      } catch (err) {
        if (err?.codigo === ERROR_ASISTENCIA?.TIENE_MARCAS_PENDIENTES) {
          advertenciaMarcasPendientes = true;
        }
      }
    }

    try {
      const todosMeta = await db.meta.toArray();
      const metasNomina = todosMeta.filter((m) => m.clave && m.clave.startsWith("nomina:"));
      for (const m of metasNomina) {
        const idExamen = m.idExamen ?? Number(m.clave.replace("nomina:", ""));
        if (idExamen) {
          try {
            await eliminarNominaLocal(idExamen);
          } catch (err) {
            if (err?.codigo === ERROR_ASISTENCIA?.TIENE_MARCAS_PENDIENTES) {
              advertenciaMarcasPendientes = true;
            }
          }
        }
      }
    } catch {}

    if (advertenciaMarcasPendientes && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sesion:marcas_pendientes_conservadas", {
          detail: { mensaje: "Se conservaron nóminas y marcas pendientes de sincronización." },
        })
      );
    }
    return { exito: true, marcasPendientesConservadas: advertenciaMarcasPendientes };
  } catch (err) {
    return { exito: false, error: err };
  }
}

export function cerrarSesion(opciones = {}) {
  // SIEMPRE detiene el planificador de sincronización al cerrar sesión
  try {
    import("../offline/syncScheduler.js")
      .then((m) => m.detenerSincronizacionAutomatica?.())
      .catch(() => {});
  } catch {}

  let idUsuario = null;
  try {
    const str = localStorage.getItem("usuario");
    if (str) idUsuario = JSON.parse(str)?.idUsuario ?? null;
  } catch {}

  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem("ultimaActividad");

  if (opciones?.limpiarDatosLocales === true) {
    void limpiarDatosLocalesDeUsuario(idUsuario);
  }
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
