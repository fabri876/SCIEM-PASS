// Servicio de control de ingreso
// ÚNICO archivo que habla con el backend. Mientras los endpoints no estén listos,
// USAR_MOCK = true devuelve datos simulados con la misma forma del contrato.
// Cuando el backend esté listo: en .env poner VITE_INGRESO_MOCK=false

import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";
import { EXAMENES_MOCK, crearNominasMock, formatearHora } from "./datosMockIngreso";

export const USAR_MOCK = import.meta.env.VITE_INGRESO_MOCK !== "false";

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
  return pedir("/api/control/examenes-asignados");
}

/* ============================================================
   2. Validar y registrar ingreso
   POST /api/control/examenes/{id}/ingresos   body { valor, metodo }
   metodo: "QR" | "MANUAL" | "LISTA"
   resultado: PERMITIDO | YA_REGISTRADO | NO_HABILITADO | OTRA_AULA | NO_INSCRITO | NO_ENCONTRADO
   ============================================================ */
export async function validarIngreso(idExamen, strValor, strMetodo) {
  if (USAR_MOCK) return simular(mockValidar(idExamen, strValor, strMetodo), 250);
  return pedir(`/api/control/examenes/${idExamen}/ingresos`, {
    method: "POST",
    body: JSON.stringify({ valor: strValor, metodo: strMetodo }),
  });
}

/* ============================================================
   3. Contador del examen
   GET /api/control/examenes/{id}/contador
   ============================================================ */
export async function obtenerContador(idExamen) {
  if (USAR_MOCK) return simular(mockContador(idExamen));
  return pedir(`/api/control/examenes/${idExamen}/contador`);
}

/* ============================================================
   4. Últimos ingresos
   GET /api/control/examenes/{id}/ingresos?limite=5
   ============================================================ */
export async function obtenerUltimosIngresos(idExamen, numLimite = 5) {
  if (USAR_MOCK) return simular(mockUltimos(idExamen, numLimite));
  return pedir(`/api/control/examenes/${idExamen}/ingresos?limite=${numLimite}`);
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
export function obtenerSisPendienteMock(idExamen) {
  const ex = examenMock(idExamen);
  const listPend = nominaMock(idExamen).filter((s) => s.habilitado && !s.ingreso && ex && s.aulaAsignada === ex.aula);
  return listPend.length ? listPend[Math.floor(Math.random() * listPend.length)].sis : null;
}
