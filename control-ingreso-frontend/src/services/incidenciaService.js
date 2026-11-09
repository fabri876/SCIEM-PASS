/**
 * incidenciaService.js
 *
 * Capa de servicios para la HU06: Incidencias.
 * Conecta directamente con IncidenciaController del backend (/api/incidencias).
 * Cumple estrictamente con el contrato REST definido para HU06.
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";
import { db } from "../offline/db.js";
import { nominaRepo } from "../offline/nominaRepo.js";
import { estaSinRed } from "../offline/connectivityService.js";

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

  let response;
  try {
    response = await fetch(`${strApiBaseUrl}${strRuta}`, {
      ...objOpciones,
      headers,
    });
  } catch {
    // Sin red o servidor caído: el backend no llegó a guardar nada.
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo; no se guardó nada.");
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
  return fetchAutenticado(`/api/incidencias/ambientes${strQuery}`);
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
  return fetchAutenticado("/api/incidencias/aulas-asignadas");
}

/** Avisa al menú lateral (contador de abiertas) que algo cambió. */
export function notificarCambioIncidencias() {
  window.dispatchEvent(new Event("incidencias:actualizadas"));
}

/**
 * Tiempo máximo que se espera al backend al buscar un estudiante.
 * Sin este límite, si el navegador cree tener internet pero no hay salida real
 * (router sin WAN, portal cautivo, etc.) el fetch se queda colgado para siempre
 * y el modal permanece en "Buscando...".
 */
const TIMEOUT_CONSULTA_ESTUDIANTE_MS = 8000;

/** Errores que significan "no se pudo hablar con el servidor" (no errores de negocio). */
function esErrorDeRed(mensaje = "") {
  return /No se pudo conectar|Failed to fetch|network|timeout|aborted|abort|ECONNREFUSED|connection/i.test(
    String(mensaje ?? "")
  );
}

/** Convierte un `marcadoEn` (ISO) a "HH:MM" en hora local. */
function horaLocalDesdeIso(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    const coincidencia = String(valor).match(/(\d{1,2}):(\d{2})/);
    return coincidencia
      ? `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`
      : null;
  }
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mm = String(fecha.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Arma la respuesta esperada por el modal a partir de un registro de db.nominas. */
function armarEstudianteLocal(estudiante, ingresoLocal) {
  // nominaRepo guarda el nombre completo (nombres + apellidos) en `nombre`,
  // por eso no se concatenan los apellidos aquí: se duplicarían.
  const nombreCompleto =
    String(estudiante.nombre || "").trim() ||
    [estudiante.apellidoPaterno, estudiante.apellidos]
      .filter(Boolean)
      .join(" ")
      .trim();

  const motivo = String(estudiante.motivoBloqueo || "").toUpperCase();
  let estado = "HABILITADO";
  if (motivo.includes("EXPULS") || motivo.includes("RETIRAD")) {
    estado = "RETIRADO";
  } else if (estudiante.habilitado === false) {
    estado = "INHABILITADO";
  }

  // Igual que el backend: no se puede registrar una incidencia para un
  // estudiante que no ingresó al examen. Offline la única prueba fiable es
  // la marca de ingreso guardada en Dexie.
  if (estado !== "RETIRADO" && !ingresoLocal.ingreso) {
    return {
      estado: "SIN_INGRESO",
      mensaje: `${nombreCompleto || "El estudiante"} no ha ingresado a este examen; no se puede registrar una incidencia para él.`,
      nombreCompleto,
      ci: estudiante.ci,
      codSis: estudiante.codigoSis,
      esOffline: true,
    };
  }

  return {
    estado,
    nombreCompleto,
    ci: estudiante.ci,
    codSis: estudiante.codigoSis,
    horaIngresoPrevio: horaLocalDesdeIso(ingresoLocal.marcadoEn),
    esOffline: true,
  };
}

/**
 * Devuelve si el estudiante ya ingresó al examen según los datos locales y,
 * si existe, la marca de tiempo del ingreso. Fuentes: `marcadoLocal` de la
 * nómina (lo escribe el control de ingreso) y las asistencias pendientes de
 * Dexie (por si la nómina quedó desactualizada).
 */
async function obtenerIngresoLocal(exId, estudiante) {
  if (estudiante?.marcadoLocal === 1) {
    return { ingreso: true, marcadoEn: estudiante.marcadoEn ?? null };
  }

  const sis = String(estudiante?.codigoSis ?? "").trim();
  if (!sis) return { ingreso: false, marcadoEn: null };

  try {
    const registro = await db.asistencias_pendientes
      .where("[examenId+codigoSis]")
      .equals([exId, sis])
      .first();
    return {
      ingreso: Boolean(registro),
      marcadoEn: registro?.timestampLocal ?? null,
    };
  } catch {
    return { ingreso: false, marcadoEn: null };
  }
}

/**
 * Busca un estudiante en la nómina local (IndexedDB) del examen indicado.
 * Prueba Código SIS, luego CI exacta y, por último, prefijo de CI.
 * Devuelve el objeto listo para el modal o null si no existe localmente.
 */
async function buscarEnNominaLocal(idExamen, strBusqueda) {
  const exId = Number(idExamen);
  const texto = String(strBusqueda ?? "").trim();
  if (!Number.isInteger(exId) || exId <= 0 || !texto) return null;

  let estudiante = null;

  try {
    estudiante = await nominaRepo.buscarPorSis(exId, texto);
  } catch {
    estudiante = null;
  }

  if (!estudiante) {
    try {
      estudiante = await nominaRepo.buscarPorCi(exId, texto);
    } catch {
      estudiante = null;
    }
  }

  // Último intento: prefijo de CI sobre la nómina del examen. Se exige un
  // mínimo de 6 caracteres para no asociar al estudiante equivocado con
  // búsquedas demasiado cortas (misma regla que validationEngine).
  if (!estudiante && texto.length >= 6) {
    try {
      const registros = await db.nominas.where("examenId").equals(exId).toArray();
      const objetivo = texto.toLowerCase();
      estudiante =
        registros.find((r) => {
          const codSis = String(r.codigoSis ?? "").toLowerCase();
          const ci = String(r.ci ?? "").toLowerCase();
          return codSis === objetivo || ci.startsWith(objetivo);
        }) ?? null;
    } catch {
      estudiante = null;
    }
  }

  return estudiante
    ? armarEstudianteLocal(estudiante, await obtenerIngresoLocal(exId, estudiante))
    : null;
}

/**
 * Verifica, con los datos locales (Dexie), si un estudiante ya ingresó al
 * examen. Se usa antes de encolar una incidencia/expulsión offline.
 */
export async function verificarIngresoLocal(idExamen, codSis) {
  const exId = Number(idExamen);
  const sis = String(codSis ?? "").trim();
  if (!Number.isInteger(exId) || exId <= 0 || !sis) return false;

  try {
    const registro = await db.nominas.get([exId, sis]);
    const { ingreso } = await obtenerIngresoLocal(exId, registro ?? { codigoSis: sis });
    return ingreso;
  } catch {
    return false;
  }
}

/**
 * Consulta a un estudiante involucrado en una incidencia.
 * GET /api/incidencias/estudiante?idAmbiente=&q=
 * Roles: ADMINISTRADOR, DOCENTE, OPERADOR
 *
 * Modo offline: si el monitor de conectividad indica que no hay red real o el
 * backend no responde a tiempo, se busca al estudiante en la nómina local de
 * IndexedDB (db.nominas) por Código SIS o CI. Así se puede registrar la
 * incidencia/expulsión sin depender del servidor.
 */
export async function consultarEstudianteIncidencia(idAmbiente, strBusqueda, idExamen = null) {
  const params = new URLSearchParams();
  if (idAmbiente) params.set("idAmbiente", idAmbiente);
  if (strBusqueda) params.set("q", strBusqueda.trim());

  const textoBusqueda = String(strBusqueda ?? "").trim();

  // 1. Sin red real (incluye el modo offline automático del monitor interno):
  //    se resuelve solo con la nómina local.
  if (estaSinRed()) {
    if (!idExamen) {
      throw new Error(
        "Sin conexión y no se especificó el examen para buscar en la nómina local del dispositivo."
      );
    }
    const local = await buscarEnNominaLocal(idExamen, textoBusqueda);
    if (local) return local;
    throw new Error(
      "Sin conexión y el estudiante no está en la nómina local de este examen."
    );
  }

  // 2. Con red aparente: se intenta el backend con timeout. Si el servidor no
  //    responde (red "fantasma"), se cae a la nómina local.
  const controlador = typeof AbortController !== "undefined" ? new AbortController() : null;
  const temporizador = controlador
    ? setTimeout(() => controlador.abort(), TIMEOUT_CONSULTA_ESTUDIANTE_MS)
    : null;

  try {
    return await fetchAutenticado(
      `/api/incidencias/estudiante?${params.toString()}`,
      controlador ? { signal: controlador.signal } : {}
    );
  } catch (err) {
    if (idExamen && esErrorDeRed(err?.message)) {
      const local = await buscarEnNominaLocal(idExamen, textoBusqueda);
      if (local) return local;
      throw new Error(
        "No se pudo conectar con el servidor y el estudiante no está en la nómina local de este examen."
      );
    }
    throw err;
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
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
 * Descarga las incidencias filtradas como Excel (.xlsx).
 * GET /api/incidencias/exportar?idExamen=&idAmbiente=&tipo=&estado=&soloExpulsiones=
 * Roles: ADMINISTRADOR, DOCENTE
 * Devuelve el Blob del archivo .xlsx.
 */
export async function exportarIncidenciasExcel({ idExamen, idAmbiente, tipo, estado, soloExpulsiones } = {}) {
  const params = new URLSearchParams();
  if (idExamen) params.set("idExamen", idExamen);
  if (idAmbiente && idAmbiente !== "TODAS") params.set("idAmbiente", idAmbiente);
  if (tipo && tipo !== "TODOS") params.set("tipo", tipo);
  if (estado && estado !== "TODOS") params.set("estado", estado);
  if (soloExpulsiones) params.set("soloExpulsiones", "true");

  const strToken = obtenerToken();
  let response;
  try {
    response = await fetch(`${strApiBaseUrl}/api/incidencias/exportar?${params.toString()}`, {
      headers: { ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}) },
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor para exportar.");
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

// Re-exportamos los servicios de ingresos excepcionales para máxima compatibilidad
export {
  consultarEstudianteExcepcional,
  autorizarIngresoExcepcional,
  listarIngresosExcepcionales,
} from "./ingresoExcepcionalService";
