export const PIN_DEMO = "1234";
export const ASIGNACIONES_OPERADOR = ["calculo", "fisica"];

export const TEXTOS_RED = {
  online: "En línea",
  syncing: "Sincronizando",
  slow: "Conexión lenta",
  offline: "Sin conexión",
};

export const INTERVALO_SYNC_MS = 1500;
export const INTERVALO_LENTA_MS = 3500;
export const CANTIDAD_LOTES = 3;

export const EXAMENES_BASE = [
  { id: "calculo", nombre: "Cálculo I · Parcial 2", sub: "Aula 204 · 03/10/2026 · 09:00", estado: "listo", hace: 12, cargados: 1248, total: 1248, actualizando: false, cap: 60, ing: 42 },
  { id: "fisica", nombre: "Física II · Examen final", sub: "Aula 118 · 04/10/2026 · 14:30", estado: "descargando", hace: 0, cargados: 780, total: 1248, actualizando: false, cap: 40, ing: 12 },
  { id: "algebra", nombre: "Álgebra Lineal · Parcial 1", sub: "Aula 301 · 05/10/2026 · 10:00", estado: "ninguna", hace: 0, cargados: 0, total: 1248, actualizando: false, cap: 50, ing: 0 },
];

export const NOMINA_BASE = [
  { nombre: "Andrea Mamani Quispe", ci: "6543210", ext: "LP", sis: "201912345", carrera: "Ing. de Sistemas", hab: true, marca: null },
  { nombre: "Carlos Rojas Vargas", ci: "7234561", ext: "CB", sis: "202011876", carrera: "Ing. Civil", hab: true, marca: null },
  { nombre: "Luciana Flores Choque", ci: "8123490", ext: "OR", sis: "202103221", carrera: "Ing. Industrial", hab: true, marca: null },
  { nombre: "Marco Vargas Arce", ci: "6789012", ext: "PT", sis: "201905776", carrera: "Ing. Química", hab: true, marca: null },
  { nombre: "Diego Condori Nina", ci: "5987123", ext: "SC", sis: "201808540", carrera: "Ing. Electrónica", hab: false, motivo: "matrícula con pago pendiente. Derívalo a Secretaría.", marca: null },
  { nombre: "Valeria Gutiérrez Ramos", ci: "9012345", ext: "CB", sis: "202204118", carrera: "Ing. de Sistemas", hab: true, marca: { hora: "08:41", puerta: 1 } },
];

export const SCAN_CI = ["7234561 CB", "5987123 SC", "9012345 CB", "1111111 LP", "8123490 OR", "6543210 LP", "6789012 PT"];

export function crearEstadoInicial() {
  return {
    net: "offline", pend: 17, enviados: 42, lastSend: "14:02", lote: 0, syncTotal: 0, spacePrc: 100,
    bloqueada: false, examen: "calculo", intentos: 0,
  };
}

export function clonarExamenes() {
  return EXAMENES_BASE.map((e) => JSON.parse(JSON.stringify(e)));
}

export function clonarNomina() {
  return NOMINA_BASE.map((e) => JSON.parse(JSON.stringify(e)));
}

export function formatearNumero(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function textoPendientes(n) {
  return n === 1 ? "1 pendiente" : n + " pendientes";
}

export function horaActual() {
  const d = new Date();
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

export function infoLote(pend, syncTotal, lote) {
  const batch = Math.max(1, Math.ceil(syncTotal / CANTIDAD_LOTES));
  const restantes = Math.ceil(pend / batch);
  return { actual: Math.min(lote + 1, lote + restantes), total: lote + restantes };
}

export function obtenerExamen(listExamenes, id) {
  return listExamenes.find((e) => e.id === id) || listExamenes[0];
}

export function buscarEstudiante(listNomina, q) {
  const d = String(q).replace(/\D/g, "");
  if (!d) return null;
  return listNomina.find((s) => s.ci === d || s.sis === d) || null;
}

export function evaluar(listExamenes, listNomina, estadoRed, q) {
  const ex = listExamenes.find((e) => e.id === estadoRed.examen) || listExamenes[0];
  const estado = { ...estadoRed };
  let listEx = listExamenes;
  let listN = listNomina;

  if (estadoRed.net !== "online" && ex.estado !== "listo") {
    return { resultado: { kind: "nodata", titulo: "Sin nómina local", nombre: "No hay datos para validar", meta: "Examen: " + ex.nombre, pie: "Conéctate y descarga la nómina para habilitar la validación." }, listEx, listN, estado };
  }
  if (estadoRed.spacePrc < 10 && estadoRed.net !== "online") {
    return { resultado: { kind: "warn", titulo: "Sin espacio de almacenamiento", nombre: "No es posible almacenar el registro", meta: "CI o SIS: " + q, pie: "Libera espacio local. No se mostró como registrado correctamente." }, listEx, listN, estado };
  }
  const d = String(q).replace(/\D/g, "");
  if (!d) {
    return { resultado: { kind: "warn", titulo: "Código QR inválido", nombre: "Código ilegible o inválido", meta: "Valor escaneado: " + q, pie: "No se generó transacción de ingreso." }, listEx, listN, estado };
  }
  const s = buscarEstudiante(listNomina, q);
  if (!s) {
    return { resultado: { kind: "no", titulo: "No está en la nómina", nombre: "No pertenece al examen", meta: "CI o SIS ingresado: " + q, pie: "No se guardó ninguna marca." }, listEx, listN, estado };
  }
  const meta = "CI " + s.ci + " · SIS " + s.sis + " · " + s.carrera;
  if (!s.hab) {
    return { resultado: { kind: "warn", titulo: "No habilitado", nombre: s.nombre, meta, pie: "Motivo: " + s.motivo + ". No se envió al servidor." }, listEx, listN, estado };
  }
  if (s.marca) {
    return { resultado: { kind: "wait", titulo: "Ya marcado", nombre: s.nombre, meta, pie: "Ingresó a las " + s.marca.hora + " · Puerta " + s.marca.puerta }, listEx, listN, estado };
  }
  listN = listN.map((x) => (x === s ? { ...x, marca: { hora: horaActual(), puerta: 2 } } : x));
  listEx = listEx.map((e) => (e === ex ? { ...e, ing: e.ing + 1 } : e));
  if (estadoRed.net === "online") {
    estado.enviados += 1;
    return { resultado: { kind: "ok", titulo: "Permitido", nombre: s.nombre, meta, pie: "Marca enviada al servidor · SINCRONIZADO" }, listEx, listN, estado };
  }
  estado.pend += 1;
  return { resultado: { kind: "ok", titulo: "Permitido", nombre: s.nombre, meta, pie: "INGRESO PERMITIDO · REGISTRADO OFFLINE" }, listEx, listN, estado };
}