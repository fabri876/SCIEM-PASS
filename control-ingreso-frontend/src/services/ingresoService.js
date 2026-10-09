// Servicio de control de ingreso
// ÚNICO archivo que habla con el backend.
// Por defecto usa el backend real. Para una demo sin backend: VITE_INGRESO_MOCK=true en el .env

import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, obtenerUsuarioActual, cerrarSesion } from "./authService";
import { EXAMENES_MOCK, FILAS_MOCK, crearNominasMock, formatearHora } from "./datosMockIngreso";

export const USAR_MOCK = import.meta.env.VITE_INGRESO_MOCK === "true";

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
  if (USAR_MOCK) return simular(EXAMENES_MOCK.map((e) => ({ ...e, contador: mockContador(e.id), ...mockFilas(e.id) })));
  const datos = await pedir("/api/v1/examenes/delegados");
  return (datos || []).map((e) => {
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
  INHABILITADO: "NO_HABILITADO",
  NO_HABILITADO: "NO_HABILITADO",
  DUPLICADO: "YA_REGISTRADO",
  YA_REGISTRADO: "YA_REGISTRADO",
  OTRA_AULA: "OTRA_AULA",
  AULA_INCORRECTA: "OTRA_AULA",
  NO_INSCRITO: "NO_INSCRITO",
  NO_ENCONTRADO: "NO_ENCONTRADO",
  QR_INVALIDO: "QR_INVALIDO",
  FUERA_DE_FILA: "FUERA_DE_FILA",
  OTRA_FILA: "FUERA_DE_FILA",
};

export async function validarIngreso(idExamen, strValor, strMetodo, objExamen = {}, objOpciones = {}) {
  if (USAR_MOCK) return simular(mockValidar(idExamen, strValor, strMetodo, objOpciones), 250);

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
    }),
  });

  if (resp.status === 401) fnSesionVencida();

  const objData = await resp.json().catch(() => null);
  console.log("Raw response from backend (validarIngreso):", resp.status, objData);

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
        aulaAsignada: est.nombreAmbiente || objExamen.aula,
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
  if (USAR_MOCK) return simular({ ...mockContador(idExamen), ...mockFilas(idExamen) });
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
  if (USAR_MOCK) return simular(mockUltimos(idExamen, numLimite, boolSoloMios));
  const { idasignatura, idambiente } = objExamen;
  const idexamen = objExamen.idexamen ?? idExamen;
  if (!idasignatura || !idambiente) return null;
  try {
    const res = await pedir(`/api/v1/control/ultimos-ingresos?idasignatura=${idasignatura}&idexamen=${idexamen}&idambiente=${idambiente}&limite=${numLimite}${boolSoloMios ? "&soloMios=true" : ""}`);
    if (!Array.isArray(res)) return null;
    return res.map((r) => {
      const est = r.estudiante || {};
      const strMetodo = String(r.metodoIngreso || r.metodo || "").toUpperCase();
      return {
        hora: soloHora(r.horaIngreso || r.hora),
        metodo: strMetodo === "ESCANEO" || strMetodo === "QR" ? "QR" : "Manual",
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

/* ============================================================
   5. Lista oficial del aula (docente) · endpoint pendiente
   ============================================================ */
export async function obtenerListaOficial(idExamen, strBuscar = "") {
  if (USAR_MOCK) return simular(mockLista(idExamen, strBuscar));
  return pedir(`/api/v1/control/examenes/${idExamen}/lista-oficial?buscar=${encodeURIComponent(strBuscar)}`);
}

/* ===================== SIMULACIÓN ===================== */

const objNominas = crearNominasMock();
const examenMock = (id) => EXAMENES_MOCK.find((e) => e.id === id);
const nominaMock = (id) => objNominas[id] || [];

function simular(datos, numMs = 120) {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(datos)), numMs));
}

function horaServidorMock() {
  const d = new Date();
  return formatearHora(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
}

function fechaServidorMock() {
  return new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const datosEstudiante = (s) => ({
  nombres: s.nombres, apellidos: s.apellidos, ci: s.ci, sis: s.sis, carrera: s.carrera,
  aulaAsignada: s.aulaAsignada, normaParticular: s.normaParticular || null,
});

function mockContador(idExamen) {
  const ex = examenMock(idExamen);
  const listAula = nominaMock(idExamen).filter((s) => ex && s.aulaAsignada === ex.aula);
  const listHab = listAula.filter((s) => s.habilitado);
  const numIng = listHab.filter((s) => s.ingreso).length;
  return {
    habilitados: listHab.length,
    ingresaron: numIng,
    pendientes: listHab.length - numIng,
    inhabilitados: listAula.length - listHab.length,
  };
}

// Primera letra del apellido, sin tildes: "Álvarez" → "A"
const letraApellido = (s) => (s.apellidos || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0).toUpperCase();
const enFila = (s, f) => { const l = letraApellido(s); return l >= f.desde && l <= f.hasta; };

function mockFilas(idExamen) {
  const listBase = FILAS_MOCK[idExamen];
  if (!listBase) return { fila: null, filas: [] };
  const ex = examenMock(idExamen);
  const listHab = nominaMock(idExamen).filter((s) => s.habilitado && ex && s.aulaAsignada === ex.aula);
  const filas = listBase.map((f) => {
    const listFila = listHab.filter((s) => enFila(s, f));
    return {
      ...f,
      operador: f.esMia ? nombreUsuarioActual() || f.operador : f.operador,
      ingresaron: listFila.filter((s) => s.ingreso).length,
      total: listFila.length,
    };
  });
  return { fila: filas.find((f) => f.esMia) || null, filas };
}

function mockUltimos(idExamen, numLimite, boolSoloMios) {
  const filaMia = (FILAS_MOCK[idExamen] || []).find((f) => f.esMia);
  const strYo = nombreUsuarioActual() || "Operador de turno";
  return nominaMock(idExamen)
    .filter((s) => s.ingreso)
    // Solo los míos: los que registré en la sesión o, en los datos de prueba previos, los de mi fila
    .filter((s) => !boolSoloMios || (s.ingreso.registradoPor ? s.ingreso.registradoPor === strYo : !filaMia || enFila(s, filaMia)))
    .sort((a, b) => b.ingreso.hora.localeCompare(a.ingreso.hora))
    .slice(0, numLimite)
    .map((s) => ({ hora: s.ingreso.hora, metodo: s.ingreso.metodo, registradoPor: s.ingreso.registradoPor || "Operador de turno", estudiante: datosEstudiante(s) }));
}

function mockLista(idExamen, strBuscar) {
  const ex = examenMock(idExamen);
  const strTermino = strBuscar.trim().toLowerCase();
  return nominaMock(idExamen)
    .filter((s) => ex && s.aulaAsignada === ex.aula)
    .map((s) => ({
      ...datosEstudiante(s),
      estado: !s.habilitado ? "INHABILITADO" : s.ingreso ? "INGRESO" : "PENDIENTE",
      horaIngreso: s.ingreso ? s.ingreso.hora : null,
    }))
    .filter((s) => !strTermino || `${s.apellidos} ${s.nombres} ${s.ci} ${s.sis}`.toLowerCase().includes(strTermino))
    .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));
}

function mockValidar(idExamen, strValor, strMetodo, objOpciones = {}) {
  const ex = examenMock(idExamen);

  // Si viene un token QR con el prefijo del sistema, se simula como válido para el primer estudiante pendiente
  const PREFIJO_QR = "SCIEMPASS:1:";
  if (strMetodo === "QR" && String(strValor).startsWith(PREFIJO_QR)) {
    const listPend = nominaMock(idExamen).filter((s) => s.habilitado && !s.ingreso && ex && s.aulaAsignada === ex.aula);
    if (!listPend.length) return { valor: strValor, resultado: "QR_INVALIDO", mensaje: "QR INVÁLIDO (simulación: sin pendientes)", estudiante: null, contador: null };
    const s = listPend[0];
    s.ingreso = { hora: horaServidorMock(), metodo: "QR", registradoPor: nombreUsuarioActual() || "Operador de turno" };
    return {
      valor: strValor, resultado: "PERMITIDO", metodo: "QR", fechaIngreso: fechaServidorMock(), estudiante: datosEstudiante(s),
      horaIngreso: s.ingreso.hora, registradoPor: s.ingreso.registradoPor, contador: mockContador(idExamen),
    };
  }
  const strDigitos = String(strValor || "").replace(/\D/g, "");
  const coincide = (x) => x.ci === strDigitos || x.sis === strDigitos;
  const s = nominaMock(idExamen).find(coincide);
  const strMetodoTexto = strMetodo === "QR" ? "QR" : strMetodo === "LISTA" ? "Lista" : s && s.sis === strDigitos ? "SIS" : "C.I.";
  const base = { valor: strValor, metodo: strMetodoTexto, fechaIngreso: fechaServidorMock(), contador: null };

  if (!s) {
    // ¿Está inscrito en otro examen de hoy?
    for (const otro of EXAMENES_MOCK) {
      if (otro.id === idExamen) continue;
      const x = nominaMock(otro.id).find(coincide);
      if (x) {
        return {
          ...base, resultado: "NO_INSCRITO", estudiante: datosEstudiante(x),
          otroExamen: { nombre: `${otro.tipo} · ${otro.materia}`, aula: otro.aula, hora: otro.horaInicio },
        };
      }
    }
    return { ...base, resultado: "NO_ENCONTRADO", estudiante: null };
  }
  if (!s.habilitado) return { ...base, resultado: "NO_HABILITADO", estudiante: datosEstudiante(s), motivos: s.motivos || [] };
  if (s.ingreso) return { ...base, resultado: "YA_REGISTRADO", estudiante: datosEstudiante(s), ingresoPrevio: { hora: s.ingreso.hora, registradoPor: s.ingreso.registradoPor || "Operador de turno" } };
  if (ex && s.aulaAsignada !== ex.aula) return { ...base, resultado: "OTRA_AULA", estudiante: datosEstudiante(s) };

  // Fila por apellido: solo avisa; con ignorarFila se registra igual
  const listFilas = FILAS_MOCK[idExamen] || [];
  const filaMia = listFilas.find((f) => f.esMia);
  if (filaMia && !enFila(s, filaMia) && !objOpciones.ignorarFila) {
    const f = listFilas.find((x) => enFila(s, x));
    return {
      ...base, resultado: "FUERA_DE_FILA", estudiante: datosEstudiante(s),
      filaCorrecta: f ? { desde: f.desde, hasta: f.hasta, operador: f.operador } : null,
    };
  }

  s.ingreso = { hora: horaServidorMock(), metodo: strMetodoTexto, registradoPor: nombreUsuarioActual() || "Operador de turno" };
  return { ...base, resultado: "PERMITIDO", estudiante: datosEstudiante(s), horaIngreso: s.ingreso.hora, registradoPor: s.ingreso.registradoPor, contador: mockContador(idExamen) };
}

// Solo para la simulación del lector QR sin cámara (mock)
// Devuelve un token con el prefijo SCIEMPASS:1: para simular un escaneo QR real
export function obtenerSisPendienteMock(idExamen) {
  const ex = examenMock(idExamen);
  const listPend = nominaMock(idExamen).filter((s) => s.habilitado && !s.ingreso && ex && s.aulaAsignada === ex.aula);
  if (!listPend.length) return null;
  // Se genera un token simulado con el prefijo del sistema para que el mock entienda que es QR
  const strSis = listPend[Math.floor(Math.random() * listPend.length)].sis;
  return `SCIEMPASS:1:MOCK-${strSis}-QR`;
}
