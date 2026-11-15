/**
 * Soporte offline para la HU06 (incidencias y expulsiones).
 *
 * La nómina descargada en el control de ingreso se guarda en la tabla
 * `nominas` ([examenId+codigoSis]). Este módulo permite buscar al estudiante
 * involucrado sin conexión y replicar los estados que devuelve
 * ConsultaEstudianteDto en el flujo de incidencias:
 *
 *   RETIRADO     -> fue expulsado (o tiene una expulsión pendiente en este equipo)
 *   DUPLICADO    -> ya registró su ingreso (marcadoLocal === 1)
 *   SIN_INGRESO  -> está en la nómina pero no ha ingresado
 *   NO_ENCONTRADO-> no está en la nómina descargada
 *   SIN_NOMINA   -> el examen no tiene nómina local
 */
import { db } from "./db.js";
import { nominaRepo } from "./nominaRepo.js";
import { estaSinRed } from "./connectivityService.js";
import { ESTADO_SYNC } from "./constantes.js";
import { configRepo } from "./configRepo.js";

const MOTIVO_EXPULSADO = "EXPULSADO";
const ESTADOS_SIN_SELECCION = new Set(["NO_ENCONTRADO", "NO_INSCRITO", "SIN_INGRESO", "SIN_NOMINA"]);
const MENSAJE_EXAMEN_CANCELADO = "Examen cancelado";

/**
 * true cuando el dispositivo no tiene conexión real o el usuario forzó el
 * modo offline. Se consulta antes de llamar a la API para no esperar el timeout.
 */
export async function estaOfflineIncidencia() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (typeof window !== "undefined" && window.__sciemSinInternet === true) return true;

  try {
    const forzado = await configRepo.obtenerConfig("modoOfflineForzado", false);
    if (forzado === true) return true;
  } catch {
    // Si no se puede leer la configuracion, seguimos con la deteccion de red.
  }

  return estaSinRed();
}

function mismoCodigoSis(a, b) {
  const sa = String(a ?? "").trim();
  const sb = String(b ?? "").trim();
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  const na = Number(sa);
  const nb = Number(sb);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

/**
 * Una expulsión registrada en este equipo (aunque ya se haya sincronizado)
 * sigue bloqueando al estudiante localmente. La nómina del servidor no
 * informa si el ingreso fue retirado, así que esta tabla es la fuente local.
 *
 * @param {object} [opciones]
 * @param {boolean} [opciones.soloNoSincronizadas] si es true, solo cuenta las
 *        expulsiones que todavía NO llegaron al servidor. Se usa en el control
 *        de ingreso: una vez sincronizadas, el servidor es la autoridad (y así
 *        este equipo se entera de una revocación hecha en otro).
 */
async function tieneExpulsionLocal(examenId, codigoSis, opciones = {}) {
  if (!examenId) return false;
  const registros = await db.expulsiones_pendientes.toArray();
  return registros.some((expulsion) => {
    if (Number(expulsion.examenId) !== Number(examenId)) return false;
    if (!mismoCodigoSis(expulsion.codSisEstudiante, codigoSis)) return false;
    // Una expulsión revocada ya no está en vigor.
    if (expulsion.revocada === true) return false;
    if (opciones.soloNoSincronizadas === true) {
      return (
        expulsion.syncStatus === ESTADO_SYNC.PENDIENTE ||
        expulsion.syncStatus === ESTADO_SYNC.SYNCING
      );
    }
    return (
      expulsion.syncStatus === ESTADO_SYNC.PENDIENTE ||
      expulsion.syncStatus === ESTADO_SYNC.SYNCING ||
      expulsion.syncStatus === ESTADO_SYNC.SINCRONIZADO ||
      expulsion.syncStatus === ESTADO_SYNC.DUPLICADO
    );
  });
}

/**
 * El estudiante fue expulsado del examen: ingresó y se lo retiró.
 *
 * La nómina local trae el estado que bajó del servidor (la autoridad) y la
 * cola de expulsiones de este equipo cubre la que aún no se ha sincronizado.
 */
export async function estaExpulsadoLocal(examenId, codigoSis, expulsadoEnNomina = false) {
  if (expulsadoEnNomina) return true;
  return await tieneExpulsionLocal(examenId, codigoSis, { soloNoSincronizadas: true });
}

/**
 * Busca a un estudiante en la nómina local del examen.
 *
 * @param {{ idExamen: number|string, consulta: string }} parametros
 * @returns {Promise<{estado: string, mensaje: string, codSis?: number|string,
 *   ci?: string|null, nombreCompleto?: string|null, horaIngresoPrevio?: string|null,
 *   aulaIngresoPrevio?: string|null, local: true}>}
 */
/**
 * true si el examen tiene al menos una incidencia/encolamiento rechazado por
 * "Examen cancelado" en este dispositivo. Se usa para no permitir nuevos
 * registros de ese examen mientras esté sin conexión.
 */
export async function examenEstaCancelado(idExamen) {
  if (!idExamen) return false;
  const exId = Number(idExamen);
  const [incidencias, excepcionales] = await Promise.all([
    db.incidencias_pendientes.toArray(),
    db.ingresos_excepcionales_pendientes.toArray(),
  ]);
  const rechazado = [...incidencias, ...excepcionales].some((item) => {
    if (Number(item.idExamen || item.idAmbiente) !== exId) return false;
    return item.ultimoError && item.ultimoError.includes(MENSAJE_EXAMEN_CANCELADO);
  });
  return rechazado;
}

export async function buscarEstudianteIncidenciaLocal({ idExamen, consulta }) {
  const exId = Number(idExamen);
  const texto = String(consulta || "").trim();

  if (!Number.isInteger(exId) || exId <= 0) {
    return {
      estado: "SIN_NOMINA",
      mensaje:
        "Sin conexión y no se pudo determinar el examen del aula. Vuelve a abrir el formulario.",
      local: true,
    };
  }

  if (await examenEstaCancelado(exId)) {
    return {
      estado: "EXAMEN_CANCELADO",
      mensaje: MENSAJE_EXAMEN_CANCELADO + " · no se registró.",
      local: true,
    };
  }

  const totalNomina = await nominaRepo.contar(exId);
  if (totalNomina === 0) {
    return {
      estado: "SIN_NOMINA",
      mensaje:
        "Sin conexión y este examen no tiene nómina descargada en el equipo. Conéctate una vez al control de ingreso para descargarla.",
      local: true,
    };
  }

  if (!texto) {
    return {
      estado: "NO_ENCONTRADO",
      mensaje: "Escribe una C.I. o un Código SIS para buscar.",
      local: true,
    };
  }

  let registro = await nominaRepo.buscarPorSis(exId, texto);
  if (!registro) registro = await nominaRepo.buscarPorCi(exId, texto);

  if (!registro) {
    return {
      estado: "NO_ENCONTRADO",
      mensaje: "Estudiante no encontrado en la nómina descargada de este examen.",
      local: true,
    };
  }

  const codSisNumero = Number(registro.codigoSis);
  const datosBase = {
    codSis: Number.isFinite(codSisNumero) ? codSisNumero : registro.codigoSis,
    ci: registro.ci || null,
    nombreCompleto: registro.nombre || null,
    horaIngresoPrevio: registro.marcadoEn || null,
    aulaIngresoPrevio: registro.aulaAsignada || null,
    local: true,
  };

  // Tres fuentes de la expulsión: el campo "expulsado" que baja del servidor con
  // la nómina, la marca local "EXPULSADO" (cuando la expulsión se hizo en este
  // equipo) y la cola local de expulsiones (por si aún no se sincronizó).
  const retirado =
    registro.expulsado === true ||
    registro.motivoBloqueo === MOTIVO_EXPULSADO ||
    (await tieneExpulsionLocal(exId, registro.codigoSis));

  if (retirado) {
    return {
      ...datosBase,
      estado: "RETIRADO",
      mensaje: "El estudiante fue retirado de este examen y no puede volver a ingresar.",
    };
  }

  if (registro.marcadoLocal === 1) {
    return {
      ...datosBase,
      estado: "DUPLICADO",
      mensaje: "El estudiante ya registró su ingreso a este examen.",
    };
  }

  return {
    ...datosBase,
    estado: "SIN_INGRESO",
    mensaje:
      "El estudiante no ha ingresado a este examen; no se puede registrar una incidencia para él.",
  };
}

/** true si el estado local permite seleccionar al estudiante en el formulario. */
export function estadoLocalSeleccionable(estado) {
  return Boolean(estado) && !ESTADOS_SIN_SELECCION.has(estado);
}

/**
 * Consulta local para el formulario de ingreso excepcional (HU21).
 *
 * Reproduce los estados de ConsultaEstudianteDto usando la nómina descargada:
 *   RETIRADO     -> expulsado (no puede volver a ingresar)
 *   DUPLICADO    -> ya registró su ingreso
 *   HABILITADO   -> debe ingresar por el control normal
 *   INHABILITADO -> puede autorizarse excepcionalmente
 *   NO_ENCONTRADO-> no está en la nómina (sin conexión no se puede autorizar)
 */
export async function buscarEstudianteExcepcionalLocal({ idExamen, consulta }) {
  const exId = Number(idExamen);
  const texto = String(consulta || "").trim();

  if (!Number.isInteger(exId) || exId <= 0) {
    return {
      estado: "SIN_NOMINA",
      mensaje: "Sin conexión y no se pudo determinar el examen del aula. Vuelve a abrir el formulario.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: false,
      local: true,
    };
  }

  if (await examenEstaCancelado(exId)) {
    return {
      estado: "EXAMEN_CANCELADO",
      mensaje: MENSAJE_EXAMEN_CANCELADO + " · no se registró.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: false,
      local: true,
    };
  }

  const totalNomina = await nominaRepo.contar(exId);
  if (totalNomina === 0) {
    return {
      estado: "SIN_NOMINA",
      mensaje:
        "Sin conexión y este examen no tiene nómina descargada en el equipo. Conéctate una vez al control de ingreso para descargarla.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: false,
      local: true,
    };
  }

  if (!texto) {
    return {
      estado: "NO_ENCONTRADO",
      mensaje: "Escribe una C.I. o un Código SIS para buscar.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: false,
      local: true,
    };
  }

  let registro = await nominaRepo.buscarPorSis(exId, texto);
  if (!registro) registro = await nominaRepo.buscarPorCi(exId, texto);

  if (!registro) {
    return {
      estado: "NO_ENCONTRADO",
      mensaje:
        "Sin conexión, el estudiante no figura en la nómina descargada de este examen, así que no se puede autorizar su ingreso excepcional.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: false,
      local: true,
    };
  }

  const codSisNumero = Number(registro.codigoSis);
  const base = {
    codSis: Number.isFinite(codSisNumero) ? codSisNumero : registro.codigoSis,
    ci: registro.ci || null,
    nombreCompleto: registro.nombre || null,
    horaIngresoPrevio: registro.marcadoEn || null,
    aulaIngresoPrevio: registro.aulaAsignada || null,
    aforo: null,
    ingresoCerrado: false,
    local: true,
  };

  const retirado =
    registro.expulsado === true ||
    registro.motivoBloqueo === MOTIVO_EXPULSADO ||
    (await tieneExpulsionLocal(exId, registro.codigoSis));

  if (retirado) {
    return {
      ...base,
      estado: "RETIRADO",
      mensaje: "El estudiante fue retirado de este examen y no puede volver a ingresar.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: false,
    };
  }

  if (registro.marcadoLocal === 1) {
    return {
      ...base,
      estado: "DUPLICADO",
      mensaje: "El estudiante ya registró su ingreso a este examen.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: true,
    };
  }

  if (registro.habilitado) {
    return {
      ...base,
      estado: "HABILITADO",
      mensaje:
        "Está habilitado: debe registrar su ingreso por el control normal. Si el reconocimiento facial falló, autoriza el ingreso excepcional.",
      puedeAutorizarExcepcional: false,
      puedeRegistrarIncidencia: false,
    };
  }

  return {
    ...base,
    estado: "INHABILITADO",
    mensaje:
      "Inhabilitado para este examen" +
      (registro.motivoBloqueo ? `: ${registro.motivoBloqueo}` : ".") +
      " Puede autorizarse su ingreso excepcional con respaldo.",
    puedeAutorizarExcepcional: true,
    puedeRegistrarIncidencia: false,
  };
}
