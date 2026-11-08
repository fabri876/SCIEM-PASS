// Servicio de control de ingreso
// ÚNICO archivo que habla con el backend.

import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, obtenerUsuarioActual, cerrarSesion, registrarActividad } from "./authService";
import { cargarExamenesConRespaldo } from "../offline/examenRepo";


// Mismo manejo que el resto de services: token, sesión vencida (401) y mensaje del backend
async function pedir(strRuta, objOpciones = {}) {
  const strToken = obtenerToken();
  const resp = await fetch(`${strApiBaseUrl}${strRuta}`, {
    ...objOpciones,
    headers: {
      "Content-Type": "application/json",
      ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
      ...(objOpciones.headers || {}),
    },
  });

  if (resp.status === 401) {
    fnSesionVencida();
  }

  if (!resp.ok) {
    const objError = await resp.json().catch(() => null);
    throw new Error(objError?.mensaje || objError?.error || `Error ${resp.status} en el servidor.`);
  }

  return resp.status === 204 ? null : resp.json();
}

function fnSesionVencida() {
  cerrarSesion();
  sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
  window.location.href = "/login";
  throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
}

/* ---------- Utilidades de formato ---------- */

// "2026-10-08T14:09:04.123" o "14:09:04" → "14:09:04"
function soloHora(valor) {
  if (!valor) return null;
  const str = String(valor);
  const m = str.match(/(\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : str.substring(0, 8);
}

// "2026-10-08T14:09:04" o "2026-10-08" → "08/10/2026"
function soloFecha(valor) {
  const m = valor ? String(valor).match(/(\d{4})-(\d{2})-(\d{2})/) : null;
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Estado del examen según fecha y hora (se usa si el backend no manda uno conocido)
const ESTADOS_VALIDOS = ["EN_CURSO", "PROXIMO", "FINALIZADO"];
function calcularEstado(strFecha, strInicio, strFin) {
  if (!strFecha || !strInicio || !strFin) return "PROXIMO";
  const ahora = new Date();
  const ini = new Date(`${strFecha}T${strInicio}:00`);
  const fin = new Date(`${strFecha}T${strFin}:00`);
  if (ahora > fin) return "FINALIZADO";
  if (ahora >= ini) return "EN_CURSO";
  return "PROXIMO";
}

// Nombre del usuario que tiene la sesión (quien registra el ingreso)
export function nombreUsuarioActual() {
  const u = obtenerUsuarioActual();
  return u ? `${u.nombre || ""} ${u.apellido || ""}`.trim() : "";
}

// Distintos nombres posibles del operador que registró, según lo que devuelva el backend
function nombreRegistrador(obj) {
  if (!obj) return null;
  return obj.registradoPor || obj.nombreOperador || obj.nombreRegistrador
    || obj.operador?.nombreCompleto || obj.usuarioRegistro?.nombreCompleto || null;
}

// Filas por apellido (varios operadores en un mismo examen).
// Campos opcionales que puede mandar el backend:
//   e.filas = [{ letraDesde, letraHasta, nombreOperador, ingresaron, total, esMia }]
//   o solo la fila propia: e.letraDesde, e.letraHasta
// Sin filas → un único operador que atiende todos los apellidos.
function mapearFilas(e) {
  const listFilas = Array.isArray(e.filas)
    ? e.filas.map((f) => ({
      desde: f.letraDesde || f.desde,
      hasta: f.letraHasta || f.hasta,
      operador: f.nombreOperador || f.operador || "",
      ingresaron: f.ingresaron || 0,
      total: f.total || f.totalHabilitados || 0,
      esMia: Boolean(f.esMia),
    }))
    : [];
  let fila = listFilas.find((f) => f.esMia) || null;
  if (!fila && e.letraDesde && e.letraHasta) {
    fila = { desde: e.letraDesde, hasta: e.letraHasta, ingresaron: e.ingresaronFila || 0, total: e.totalFila || 0, esMia: true };
  }
  return { fila, filas: listFilas };
}

/* ============================================================
   1. Exámenes asignados al operador (todas sus asignaciones ACTIVAS)
   GET /api/v1/examenes/delegados
   ============================================================ */
export async function obtenerExamenesAsignados() {
  const usuario = obtenerUsuarioActual();
  const res = await cargarExamenesConRespaldo({
    clave: "delegados",
    usuarioId: usuario?.idUsuario ?? null,
    // La consulta puede tardar cuando se resuelven varias asignaciones,
    // ambientes y filas de operadores. Evitar cancelarla a los 5 s.
    timeoutMs: 20000,
    fetcher: async ({ signal }) => {
      const strToken = obtenerToken();
      const resp = await fetch(`${strApiBaseUrl}/api/v1/examenes/delegados?_t=${Date.now()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
        },
        signal,
      });

      if (!resp.ok) {
        const objError = await resp.json().catch(() => null);
        const err = new Error(objError?.mensaje || objError?.error || `Error ${resp.status} en el servidor.`);
        err.status = resp.status;
        throw err;
      }

      return resp.status === 204 ? [] : resp.json();
    },
  });

  const datos = res.examenes || [];
  if (res.sesionExpirada && datos.length === 0) {
    fnSesionVencida();
  }

  return datos.map((e) => {
    const horaInicio = e.horaInicio ? String(e.horaInicio).substring(0, 5) : "";
    const horaFin = e.horaFin ? String(e.horaFin).substring(0, 5) : "";
    const strEstado = String(e.estadoMateria || "").toUpperCase();
    const { fila, filas } = mapearFilas(e);
    return {
      // Un operador puede tener el mismo examen en varias materias o aulas:
      // por eso el id de la tarjeta combina asignatura, examen y aula
      id: `${e.idasignatura}-${e.idexamen}-${e.idambiente}`,
      idasignatura: e.idasignatura,
      idexamen: e.idexamen,
      idambiente: e.idambiente,
      materia: e.nombreAsignatura,
      sigla: e.siglaAsignatura,
      grupo: e.grupo,
      tipo: e.nombreExamen,
      aula: e.nombreAmbiente,
      edificio: e.ubicacionAmbiente,
      fecha: e.fechaExamen,
      horaInicio,
      horaFin,
      estado: ESTADOS_VALIDOS.includes(strEstado) ? strEstado : calcularEstado(e.fechaExamen, horaInicio, horaFin),
      contador: {
        ingresaron: e.ingresaron || 0,
        pendientes: e.faltantes || 0,
        inhabilitados: e.inhabilitados || 0,
        habilitados: e.totalHabilitados || 0,
      },
      fila,
      filas,
    };
  });
}

/* ============================================================
   2. Validar y registrar ingreso
   POST /api/v1/control/ingresos
   body { identificador, idasignatura, idexamen, idambiente, metodoIngreso: ESCANEO | MANUAL }
   resultado (front): PERMITIDO | YA_REGISTRADO | NO_HABILITADO | OTRA_AULA | FUERA_DE_FILA | NO_INSCRITO | NO_ENCONTRADO | QR_INVALIDO
   FUERA_DE_FILA: el estudiante está habilitado pero su apellido le toca a otro operador.
   Es solo un aviso: con { ignorarFila: true } se registra igual.
   ============================================================ */
const MAPA_ESTADOS = {
  PERMITIDO: "PERMITIDO",
  REGISTRADO: "PERMITIDO",
  EXITOSO: "PERMITIDO",
  // Fase 1 del control: identificado sin registrar (falta el facial).
  IDENTIFICADO: "IDENTIFICADO",
  INHABILITADO: "NO_HABILITADO",
  NO_HABILITADO: "NO_HABILITADO",
  DUPLICADO: "YA_REGISTRADO",
  YA_REGISTRADO: "YA_REGISTRADO",
  OTRA_AULA: "OTRA_AULA",
  AMBIENTE_DIFERENTE: "OTRA_AULA", // HU10: el backend lo devuelve con el aula asignada en primerIngreso
  AULA_INCORRECTA: "OTRA_AULA",
  NO_INSCRITO: "NO_INSCRITO",
  NO_ENCONTRADO: "NO_ENCONTRADO",
  QR_INVALIDO: "QR_INVALIDO",
  FUERA_DE_FILA: "FUERA_DE_FILA",
  OTRA_FILA: "FUERA_DE_FILA",
};

export async function validarIngreso(idExamen, strValor, strMetodo, objExamen = {}, objOpciones = {}) {
  registrarActividad();
  const strIdentificador = String(strValor).trim();
  const strToken = obtenerToken();
  const resp = await fetch(`${strApiBaseUrl}/api/v1/control/ingresos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    },
    body: JSON.stringify({
      identificador: strIdentificador,
      idasignatura: objExamen.idasignatura,
      idexamen: objExamen.idexamen ?? idExamen,
      idambiente: objExamen.idambiente,
      metodoIngreso: strMetodo === "QR" ? "ESCANEO" : "MANUAL", // el backend usa ESCANEO | MANUAL
      ...(objOpciones.ignorarFila ? { ignorarFila: true } : {}),
      // Fase 1: validar todo sin crear el ingreso (el registro ocurre tras el facial).
      ...(objOpciones.soloVerificar ? { soloVerificar: true } : {}),
      // Scores del facial aprobado: el ingreso queda como QR/MANUAL "con facial".
      ...(objOpciones.scoreFacial != null ? { scoreFacial: objOpciones.scoreFacial } : {}),
      ...(objOpciones.livenessScore != null ? { livenessScore: objOpciones.livenessScore } : {}),
      ...(objOpciones.modelVersion ? { modelVersion: objOpciones.modelVersion } : {}),
      ...(objOpciones.deviceId ? { deviceId: objOpciones.deviceId } : {}),
    }),
  });

  if (resp.status === 401) fnSesionVencida();

  const objData = await resp.json().catch(() => null);

  // Un error del servidor (sin estado de validación) no es "estudiante no encontrado":
  // se muestra como error para que el operador lo sepa
  if (!objData?.estado) {
    throw new Error(objData?.mensaje || objData?.error || `No se pudo verificar el ingreso (error ${resp.status}).`);
  }

  const strEstado = String(objData.estado).toUpperCase();
  const strResultado = MAPA_ESTADOS[strEstado] || strEstado;

  const est = objData.estudiante;
  const strSis = est ? est.codsisestudiante || est.sis : null;
  const estudianteMapeado = est
    ? {
      idusuario: est.idusuario,
      ci: est.ci,
      sis: strSis,
      nombres: est.nombreCompleto || est.nombres || "",
      apellidos: est.nombreCompleto ? "" : est.apellidos || "",
      carrera: est.carrera || "Carrera no asignada",
      fotoUrl: est.fotoUrl,
      // HU10: en "aula diferente" el aula ASIGNADA viene en primerIngreso.nombreAmbiente
      aulaAsignada: (strResultado === "OTRA_AULA" && objData.primerIngreso?.nombreAmbiente)
        || est.nombreAmbiente || objExamen.aula,
      normaParticular: est.normaParticular || null,
    }
    : null;

  let strMetodoTexto = "C.I.";
  if (strMetodo === "QR") strMetodoTexto = "QR";
  else if (strMetodo === "LISTA") strMetodoTexto = "Lista";
  else if (strSis && strIdentificador === String(strSis)) strMetodoTexto = "SIS";

  const strRegistrador = nombreRegistrador(objData)
    || (strResultado === "PERMITIDO" ? nombreUsuarioActual() : null);

  return {
    resultado: strResultado,
    valor: strValor,
    metodo: strMetodoTexto,
    mensaje: objData.mensaje,
    estudiante: estudianteMapeado,
    horaIngreso: soloHora(objData.horaIngreso),
    fechaIngreso: soloFecha(objData.horaIngreso || objData.fechaIngreso),
    registradoPor: strRegistrador,
    ingresoPrevio: objData.primerIngreso
      ? {
        hora: soloHora(objData.primerIngreso.horaIngreso) || "",
        fecha: soloFecha(objData.primerIngreso.horaIngreso),
        aula: objData.primerIngreso.nombreAmbiente,
        registradoPor: nombreRegistrador(objData.primerIngreso),
      }
      : null,
    motivos: objData.motivoInhabilitacion ? [objData.motivoInhabilitacion] : objData.motivos || [],
    otroExamen: objData.otroExamen || null,
    filaCorrecta: objData.filaCorrecta
      ? {
        desde: objData.filaCorrecta.letraDesde || objData.filaCorrecta.desde,
        hasta: objData.filaCorrecta.letraHasta || objData.filaCorrecta.hasta,
        operador: objData.filaCorrecta.nombreOperador || objData.filaCorrecta.operador || "",
      }
      : null,
  };
}

/* ============================================================
   3. Contador del examen
   GET /api/v1/control/examen-seleccionado?idasignatura=&idexamen=&idambiente=
   ============================================================ */
export async function obtenerContador(idExamen, objExamen = {}) {
  const { idasignatura, idambiente } = objExamen;
  const idexamen = objExamen.idexamen ?? idExamen;
  if (idasignatura && idambiente) {
    try {
      const d = await pedir(`/api/v1/control/examen-seleccionado?idasignatura=${idasignatura}&idexamen=${idexamen}&idambiente=${idambiente}`);
      const { fila, filas } = mapearFilas(d);
      return {
        ingresaron: d.ingresaron || 0,
        pendientes: d.faltantes || 0,
        inhabilitados: d.inhabilitados || 0,
        habilitados: d.totalHabilitados || 0,
        ...(fila ? { fila, filas } : {}),
      };
    } catch {
      // Si falla, se usa el contador que vino con la lista de exámenes
    }
  }
  return objExamen.contador || { ingresaron: 0, pendientes: 0, inhabilitados: 0, habilitados: 0 };
}

/* ============================================================
   4. Últimos ingresos del examen
   GET /api/v1/control/ultimos-ingresos?idasignatura=&idexamen=&idambiente=&limite=
   [{ idIngreso, horaIngreso, metodoIngreso: ESCANEO | MANUAL, estudiante: { nombreCompleto, ci, codsisestudiante, carrera } }]
   Con boolSoloMios se pide soloMios=true (el operador ve solo los que registró).
   Si falla, devuelve null y la pantalla muestra los ingresos registrados en esta sesión.
   ============================================================ */
export async function obtenerUltimosIngresos(idExamen, numLimite = 5, objExamen = {}, boolSoloMios = false) {
  const { idasignatura, idambiente } = objExamen;
  const idexamen = objExamen.idexamen ?? idExamen;
  if (!idasignatura || !idambiente) return null;
  try {
    const res = await pedir(`/api/v1/control/ultimos-ingresos?idasignatura=${idasignatura}&idexamen=${idexamen}&idambiente=${idambiente}&limite=${numLimite}${boolSoloMios ? "&soloMios=true" : ""}`);
    if (!Array.isArray(res)) return null;
    return res.map((r) => {
      const est = r.estudiante || {};
      const strMetodo = String(r.metodoIngreso || r.metodo || "").toUpperCase();
      const boolConFacial = Boolean(r.verificacionFacial ?? (r.scoreFacial != null));
      return {
        hora: soloHora(r.horaIngreso || r.hora),
        metodo: strMetodo === "ESCANEO" || strMetodo === "QR" ? "QR" : "Manual",
        // Se deriva de score_facial: no existe un método "facial" separado.
        conFacial: boolConFacial,
        scoreFacial: r.scoreFacial ?? null,
        registradoPor: nombreRegistrador(r),
        estudiante: {
          nombres: est.nombreCompleto || est.nombres || r.nombreCompleto || "",
          apellidos: est.nombreCompleto ? "" : est.apellidos || "",
          ci: est.ci || r.ci || "",
          sis: est.codsisestudiante || r.codsisestudiante || "",
          carrera: est.carrera || r.carrera || "",
        },
      };
    });
  } catch {
    return null;
  }
}

export async function obtenerMisRegistros(numLimite = 100) {
  const res = await pedir(`/api/v1/control/mis-registros?limite=${numLimite}`);
  if (!Array.isArray(res)) return [];
  return res.map((r) => ({
    idAsignatura: r.idAsignatura,
    idExamen: r.idExamen,
    idAmbiente: r.idAmbiente,
    hora: soloHora(r.horaIngreso || r.hora),
    fechaHora: r.horaIngreso || r.hora,
    metodo: String(r.metodoIngreso || r.metodo || "").toUpperCase() === "ESCANEO" ? "QR" : "Manual",
    conFacial: Boolean(r.verificacionFacial ?? (r.scoreFacial != null)),
    scoreFacial: r.scoreFacial ?? null,
    registradoPor: r.registradoPor || "Registro propio",
    estudiante: {
      nombres: r.estudiante?.nombreCompleto || "",
      apellidos: "",
      ci: r.estudiante?.ci || "",
      sis: r.estudiante?.codsisestudiante || "",
    },
  }));
}

/* ============================================================
   5. Lista oficial del aula (docente) · endpoint pendiente
   ============================================================ */
export async function obtenerListaOficial(idExamen, strBuscar = "") {
  return pedir(`/api/v1/control/examenes/${idExamen}/lista-oficial?buscar=${encodeURIComponent(strBuscar)}`);
}
