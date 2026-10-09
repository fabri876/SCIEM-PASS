// Servicio de control de ingreso
// ÚNICO archivo que habla con el backend.
// NOTA INTEGRACIÓN BACKEND: Se ha establecido USAR_MOCK = false por defecto ya que los endpoints 
// del backend (Spring Boot + PostgreSQL) están implementados y funcionando en producción/desarrollo.

import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";
import { EXAMENES_MOCK, crearNominasMock, formatearHora } from "./datosMockIngreso";

// Cambiado a false: Conexión directa a la base de datos a través de la API REST backend
export const USAR_MOCK = false;

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
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
    window.location.href = "/login";
    throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
  }

  if (!resp.ok) {
    const objError = await resp.json().catch(() => null);
    throw new Error(objError?.mensaje || objError?.error || `Error ${resp.status} en el servidor.`);
  }

  return resp.status === 204 ? null : resp.json();
}

/* ============================================================
   1. Exámenes de hoy asignados al usuario, con su resumen
   GET /api/control/examenes-asignados
   [{ id, materia, tipo, aula, edificio, fecha, horaInicio, horaFin,
      estado: EN_CURSO | PROXIMO | FINALIZADO,
      contador: { habilitados, ingresaron, pendientes, inhabilitados } }]
   ============================================================ */
export async function obtenerExamenesAsignados() {
  if (USAR_MOCK) return simular(EXAMENES_MOCK.map((e) => ({ ...e, contador: mockContador(e.id) })));
  const datos = await pedir("/api/v1/examenes/delegados");
  return (datos || []).map((e) => ({
    id: e.idexamen,
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
    horaInicio: e.horaInicio ? String(e.horaInicio).substring(0, 5) : "",
    horaFin: e.horaFin ? String(e.horaFin).substring(0, 5) : "",
    estado: e.estadoMateria || "PROXIMO",
    contador: {
      ingresaron: e.ingresaron || 0,
      pendientes: e.faltantes || 0,
      inhabilitados: e.inhabilitados || 0,
      habilitados: e.totalHabilitados || 0,
    },
  }));
}

/* ============================================================
   2. Validar y registrar ingreso
   POST /api/control/examenes/{id}/ingresos   body { valor, metodo }
   metodo: "QR" | "MANUAL" | "LISTA"
   resultado: PERMITIDO | YA_REGISTRADO | NO_HABILITADO | OTRA_AULA | NO_INSCRITO | NO_ENCONTRADO
   ============================================================ */
export async function validarIngreso(idExamen, strValor, strMetodo, objExamen = {}) {
  if (USAR_MOCK) return simular(mockValidar(idExamen, strValor, strMetodo), 250);

  const idasignatura = objExamen.idasignatura || objExamen.idAsignatura;
  const idambiente = objExamen.idambiente || objExamen.idAmbiente;

  const strToken = obtenerToken();
  const resp = await fetch(`${strApiBaseUrl}/api/v1/control/ingresos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    },
    body: JSON.stringify({
      identificador: String(strValor).trim(),
      idasignatura: idasignatura,
      idexamen: idExamen,
      idambiente: idambiente,
      metodoIngreso: strMetodo === "QR" ? "ESCANEO" : "MANUAL",
    }),
  });

  if (resp.status === 401) {
    cerrarSesion();
    sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
    window.location.href = "/login";
    throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
  }

  const objData = await resp.json().catch(() => null);
  console.log("Raw response from backend (validarIngreso):", resp.status, objData);

  let strResultado = objData?.estado || "NO_ENCONTRADO";
  if (strResultado === "INHABILITADO") strResultado = "NO_HABILITADO";
  if (strResultado === "DUPLICADO") strResultado = "YA_REGISTRADO";
  // QR_INVALIDO: el token no existe, está anulado o expirado — se trata como no encontrado visualmente
  if (strResultado === "QR_INVALIDO") strResultado = "QR_INVALIDO";

  const est = objData?.estudiante;
  const estudianteMapeado = est
    ? {
        idusuario: est.idusuario,
        ci: est.ci,
        sis: est.codsisestudiante || est.sis,
        nombres: est.nombreCompleto || est.nombres || "",
        apellidos: "",
        carrera: est.carrera || "Carrera no asignada",
        fotoUrl: est.fotoUrl,
        aulaAsignada: objExamen.aula,
      }
    : null;

  return {
    resultado: strResultado,
    valor: strValor,
    mensaje: objData?.mensaje,
    estudiante: estudianteMapeado,
    horaIngreso: objData?.horaIngreso ? String(objData.horaIngreso).substring(11, 19) : null,
    ingresoPrevio: objData?.primerIngreso
      ? {
          hora: objData.primerIngreso.horaIngreso ? String(objData.primerIngreso.horaIngreso).substring(11, 19) : "",
          aula: objData.primerIngreso.nombreAmbiente,
        }
      : null,
    motivos: objData?.motivoInhabilitacion ? [objData.motivoInhabilitacion] : [],
  };
}

/* ============================================================
   3. Contador del examen
   GET /api/control/examenes/{id}/contador
   ============================================================ */
export async function obtenerContador(idExamen, objExamen = {}) {
  if (USAR_MOCK) return simular(mockContador(idExamen));
  const idasig = objExamen.idasignatura || objExamen.idAsignatura;
  const idamb = objExamen.idambiente || objExamen.idAmbiente;
  if (idasig && idamb) {
    try {
      const d = await pedir(`/api/v1/control/examen-seleccionado?idasignatura=${idasig}&idexamen=${idExamen}&idambiente=${idamb}`);
      return {
        ingresaron: d.ingresaron || 0,
        pendientes: d.faltantes || 0,
        inhabilitados: d.inhabilitados || 0,
        habilitados: d.totalHabilitados || 0,
      };
    } catch {
      // Fallback a objeto contador existente
    }
  }
  return objExamen.contador || { ingresaron: 0, pendientes: 0, inhabilitados: 0, habilitados: 0 };
}

export async function obtenerUltimosIngresos(idExamen, numLimite = 5, objExamen = {}) {
  if (USAR_MOCK) return simular(mockUltimos(idExamen, numLimite));
  const idasig = objExamen.idasignatura || objExamen.idAsignatura;
  const idamb = objExamen.idambiente || objExamen.idAmbiente;
  if (!idasig || !idamb) return [];

  try {
    const res = await pedir(`/api/v1/control/ultimos-ingresos?idasignatura=${idasig}&idexamen=${idExamen}&idambiente=${idamb}&limite=${numLimite}`);
    return (res || []).map((u) => {
      const est = u.estudiante || {};
      const partesNombre = (est.nombreCompleto || "").trim().split(" ");
      const nombres = partesNombre[0] || "";
      const apellidos = partesNombre.slice(1).join(" ") || "";
      return {
        hora: u.horaIngreso ? String(u.horaIngreso).substring(11, 19) : "",
        metodo: u.metodoIngreso === "QR" ? "QR" : "Manual",
        estudiante: {
          nombres: nombres,
          apellidos: apellidos,
          ci: est.ci || "",
          sis: est.codsisestudiante || "",
          carrera: est.carrera || "Carrera no asignada",
        },
      };
    });
  } catch {
    return [];
  }
}

/* ============================================================
   5. Lista oficial del aula (docente)
   GET /api/control/examenes/{id}/lista-oficial?buscar=
   ============================================================ */
export async function obtenerListaOficial(idExamen, strBuscar = "") {
  if (USAR_MOCK) return simular(mockLista(idExamen, strBuscar));
  return pedir(`/api/control/examenes/${idExamen}/lista-oficial?buscar=${encodeURIComponent(strBuscar)}`);
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

function mockUltimos(idExamen, numLimite) {
  return nominaMock(idExamen)
    .filter((s) => s.ingreso)
    .sort((a, b) => b.ingreso.hora.localeCompare(a.ingreso.hora))
    .slice(0, numLimite)
    .map((s) => ({ hora: s.ingreso.hora, metodo: s.ingreso.metodo, estudiante: datosEstudiante(s) }));
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

function mockValidar(idExamen, strValor, strMetodo) {
  const ex = examenMock(idExamen);

  // Si viene un token QR con el prefijo del sistema, se simula como válido para el primer estudiante pendiente
  const PREFIJO_QR = "SCIEMPASS:1:";
  if (strMetodo === "QR" && String(strValor).startsWith(PREFIJO_QR)) {
    const listPend = nominaMock(idExamen).filter((s) => s.habilitado && !s.ingreso && ex && s.aulaAsignada === ex.aula);
    if (!listPend.length) return { valor: strValor, resultado: "QR_INVALIDO", mensaje: "QR INVÁLIDO (simulación: sin pendientes)", estudiante: null, contador: null };
    const s = listPend[0];
    s.ingreso = { hora: horaServidorMock(), metodo: "QR" };
    return { valor: strValor, resultado: "PERMITIDO", metodo: "QR", estudiante: datosEstudiante(s), horaIngreso: s.ingreso.hora, contador: mockContador(idExamen) };
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
  if (s.ingreso) return { ...base, resultado: "YA_REGISTRADO", estudiante: datosEstudiante(s), ingresoPrevio: { hora: s.ingreso.hora } };
  if (ex && s.aulaAsignada !== ex.aula) return { ...base, resultado: "OTRA_AULA", estudiante: datosEstudiante(s) };

  s.ingreso = { hora: horaServidorMock(), metodo: strMetodoTexto };
  return { ...base, resultado: "PERMITIDO", estudiante: datosEstudiante(s), horaIngreso: s.ingreso.hora, contador: mockContador(idExamen) };
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
