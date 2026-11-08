import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite } from "@capacitor-community/sqlite";

const NOMBRE_BD = "sciem_facial_secure";
const VERSION_BD = 4;
const ESTADO_PENDIENTE = "PENDIENTE";

let inicializada = false;
let usaNativo = false;
let promesaInicializacion = null;
const memoria = {
  paquete: new Map(),
  intentos: new Map(),
  ingresos: new Map(),
};

// La cola facial vive en SQLite cifrado, fuera de Dexie: los contadores de la
// interfaz no pueden observarla con liveQuery. Se notifica a los suscriptores
// cuando cambia para que los pendientes se actualicen de inmediato.
const suscriptoresCola = new Set();

export function suscribirColaFacial(suscriptor) {
  suscriptoresCola.add(suscriptor);
  return () => suscriptoresCola.delete(suscriptor);
}

function notificarCola() {
  for (const suscriptor of suscriptoresCola) {
    try {
      suscriptor();
    } catch (error) {
      console.warn("[facialSqliteDb] Error en suscriptor de cola facial:", error);
    }
  }
}

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS paquete_habilitados (
  idExamen INTEGER NOT NULL, idUsuarioEstudiante INTEGER NOT NULL,
  codsisEstudiante INTEGER NOT NULL, nombreCompleto TEXT NOT NULL, apellidoPaterno TEXT,
  idAmbiente INTEGER NOT NULL, embedding TEXT, requiereIngresoManual INTEGER NOT NULL DEFAULT 0,
  expiraEn TEXT NOT NULL, PRIMARY KEY (idExamen, idUsuarioEstudiante)
);
CREATE TABLE IF NOT EXISTS cola_face_intento (
  clientUuid TEXT PRIMARY KEY, idUsuarioEstudiante INTEGER NOT NULL, idUsuarioOperador INTEGER NOT NULL,
  idAsignatura INTEGER NOT NULL, idExamen INTEGER NOT NULL, idAmbiente INTEGER NOT NULL,
  score REAL, livenessScore REAL, resultado TEXT NOT NULL CHECK(resultado IN ('autorizado','rechazado')),
  fotoLocalUri TEXT, deviceId TEXT, modelVersion TEXT, capturadoEn TEXT NOT NULL, syncStatus TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cola_ingreso (
  clientUuid TEXT PRIMARY KEY, idUsuarioEstudiante INTEGER NOT NULL, codsisEstudiante INTEGER NOT NULL,
  idAsignatura INTEGER NOT NULL, idExamen INTEGER NOT NULL, idAmbiente INTEGER NOT NULL,
  idUsuarioOperador INTEGER NOT NULL, tipoIngreso TEXT NOT NULL CHECK(tipoIngreso IN ('NORMAL','EXCEPCIONAL')),
  metodoIngreso TEXT NOT NULL CHECK(metodoIngreso IN ('FACIAL','MANUAL')),
  motivoExcepcion TEXT CHECK(motivoExcepcion IS NULL OR motivoExcepcion IN ('FALLO_FACIAL','SIN_ENROLAMIENTO_FACIAL')),
  observacionIngreso TEXT, scoreFacial REAL, livenessScore REAL, horaMarcacion TEXT NOT NULL,
  syncStatus TEXT NOT NULL, auditFlag INTEGER NOT NULL DEFAULT 0
);`;

/**
 * v2 -> v3: el paquete local pasa a ser por examen. Es una caché descargable,
 * así que si la tabla anterior no tiene `idExamen` se descarta y se recrea en
 * lugar de intentar migrar filas que no tienen esa clave.
 */
async function migrarPaqueteFacial() {
  const info = await CapacitorSQLite.query({
    database: NOMBRE_BD,
    statement: "PRAGMA table_info(paquete_habilitados)",
    values: [],
    readonly: false,
  });
  const columnas = (info?.values || []).map((columna) => columna.name);
  if (columnas.includes("idExamen")) return;
  await CapacitorSQLite.execute({
    database: NOMBRE_BD,
    statements: `DROP TABLE IF EXISTS paquete_habilitados;
CREATE TABLE paquete_habilitados (
  idExamen INTEGER NOT NULL, idUsuarioEstudiante INTEGER NOT NULL,
  codsisEstudiante INTEGER NOT NULL, nombreCompleto TEXT NOT NULL, apellidoPaterno TEXT,
  idAmbiente INTEGER NOT NULL, embedding TEXT, requiereIngresoManual INTEGER NOT NULL DEFAULT 0,
  expiraEn TEXT NOT NULL, PRIMARY KEY (idExamen, idUsuarioEstudiante)
);`,
    transaction: true,
    readonly: false,
  });
}

/**
 * v3 -> v4: la cola de ingresos faciales necesita `idUsuarioEstudiante` y
 * `horaMarcacion` para que el backend acepte el lote. Las filas anteriores no
 * se pueden sincronizar (el servidor las rechaza por falta de esos datos), así
 * que se descarta la cola en lugar de inventar valores.
 */
async function migrarColaIngreso() {
  const info = await CapacitorSQLite.query({
    database: NOMBRE_BD,
    statement: "PRAGMA table_info(cola_ingreso)",
    values: [],
    readonly: false,
  });
  const columnas = (info?.values || []).map((columna) => columna.name);
  if (columnas.includes("idUsuarioEstudiante") && columnas.includes("horaMarcacion")) return;
  await CapacitorSQLite.execute({
    database: NOMBRE_BD,
    statements: `DROP TABLE IF EXISTS cola_ingreso;
CREATE TABLE cola_ingreso (
  clientUuid TEXT PRIMARY KEY, idUsuarioEstudiante INTEGER NOT NULL, codsisEstudiante INTEGER NOT NULL,
  idAsignatura INTEGER NOT NULL, idExamen INTEGER NOT NULL, idAmbiente INTEGER NOT NULL,
  idUsuarioOperador INTEGER NOT NULL, tipoIngreso TEXT NOT NULL CHECK(tipoIngreso IN ('NORMAL','EXCEPCIONAL')),
  metodoIngreso TEXT NOT NULL CHECK(metodoIngreso IN ('FACIAL','MANUAL')),
  motivoExcepcion TEXT CHECK(motivoExcepcion IS NULL OR motivoExcepcion IN ('FALLO_FACIAL','SIN_ENROLAMIENTO_FACIAL')),
  observacionIngreso TEXT, scoreFacial REAL, livenessScore REAL, horaMarcacion TEXT NOT NULL,
  syncStatus TEXT NOT NULL, auditFlag INTEGER NOT NULL DEFAULT 0
);`,
    transaction: true,
    readonly: false,
  });
}

/**
 * En Android usa SQLCipher. La passphrase debe derivarse del PIN ya validado y
 * llegar desde el flujo de sesión; nunca se incrusta en el APK ni en código.
 * El fallback de navegador es solo para desarrollo y no ofrece cifrado SQLCipher.
 */
export async function inicializarFacialSqlite({ passphrase } = {}) {
  if (inicializada) return { nativo: usaNativo };
  // El planificador puede detectar pendientes mientras la pestaña facial abre
  // la base. Una sola inicialización evita "connection already exists".
  if (promesaInicializacion) return promesaInicializacion;
  promesaInicializacion = (async () => {
    usaNativo = Capacitor.isNativePlatform();
    if (!usaNativo) {
      inicializada = true;
      return { nativo: false };
    }
    // El secreto se guarda una sola vez en el almacenamiento seguro del
    // dispositivo. Si ya existe no hace falta la passphrase: así el operador
    // puede usar el paquete facial aunque cambie su PIN o no lo tenga a mano.
    const secreto = await CapacitorSQLite.isSecretStored();
    if (!secreto.result) {
      if (!passphrase || passphrase.length < 16) {
        throw new Error("Configura tu PIN para habilitar la base facial segura.");
      }
      await CapacitorSQLite.setEncryptionSecret({ passphrase });
    }
    await CapacitorSQLite.createConnection({
      database: NOMBRE_BD,
      encrypted: true,
      mode: "secret",
      version: VERSION_BD,
      readonly: false,
    });
    await CapacitorSQLite.open({ database: NOMBRE_BD, readonly: false });
    await CapacitorSQLite.execute({ database: NOMBRE_BD, statements: ESQUEMA, transaction: true, readonly: false });
    await migrarPaqueteFacial();
    await migrarColaIngreso();
    inicializada = true;
    return { nativo: true };
  })();
  try {
    return await promesaInicializacion;
  } finally {
    promesaInicializacion = null;
  }
}

function asegurarInicializada() {
  if (!inicializada) throw new Error("La base facial no fue inicializada.");
}

async function ejecutar(sql, values = []) {
  asegurarInicializada();
  return CapacitorSQLite.run({ database: NOMBRE_BD, statement: sql, values, transaction: true, readonly: false });
}

async function consultar(sql, values = []) {
  asegurarInicializada();
  return CapacitorSQLite.query({ database: NOMBRE_BD, statement: sql, values, readonly: false });
}

export async function guardarPaqueteHabilitados(estudiantes, expiraEn, idExamen) {
  asegurarInicializada();
  if (!Array.isArray(estudiantes)) throw new Error("El paquete facial debe ser una lista.");
  const exId = Number(idExamen);
  if (!Number.isInteger(exId) || exId <= 0) throw new Error("El paquete facial requiere un examen válido.");
  if (!usaNativo) {
    estudiantes.forEach((e) => memoria.paquete.set(`${exId}:${e.idUsuarioEstudiante}`, { ...e, idExamen: exId, expiraEn }));
    return;
  }
  for (const e of estudiantes) {
    await ejecutar(`INSERT OR REPLACE INTO paquete_habilitados
      (idExamen,idUsuarioEstudiante,codsisEstudiante,nombreCompleto,apellidoPaterno,idAmbiente,embedding,requiereIngresoManual,expiraEn)
      VALUES (?,?,?,?,?,?,?,?,?)`, [exId, e.idUsuarioEstudiante, e.codsisEstudiante,
      e.nombreCompleto, e.apellidoPaterno || null, e.idAmbiente, e.embedding || null,
      e.requiereIngresoManual ? 1 : 0, expiraEn]);
  }
}

export async function encolarIntentoFacial(intento) {
  asegurarInicializada();
  const fila = { ...intento, syncStatus: intento.syncStatus || ESTADO_PENDIENTE };
  const resultado = usaNativo
    ? await ejecutar(`INSERT OR REPLACE INTO cola_face_intento
    (clientUuid,idUsuarioEstudiante,idUsuarioOperador,idAsignatura,idExamen,idAmbiente,score,livenessScore,resultado,fotoLocalUri,deviceId,modelVersion,capturadoEn,syncStatus)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [fila.clientUuid, fila.idUsuarioEstudiante, fila.idUsuarioOperador,
      fila.idAsignatura, fila.idExamen, fila.idAmbiente, fila.score ?? null, fila.livenessScore ?? null,
      fila.resultado, fila.fotoLocalUri || null, fila.deviceId || null, fila.modelVersion || null, fila.capturadoEn, fila.syncStatus])
    : memoria.intentos.set(fila.clientUuid, fila);
  notificarCola();
  return resultado;
}

export async function encolarIngresoFacial(ingreso) {
  asegurarInicializada();
  if (!ingreso.idAmbiente) throw new Error("idAmbiente es obligatorio para la marcación facial.");
  if (!ingreso.idUsuarioEstudiante) throw new Error("idUsuarioEstudiante es obligatorio para la marcación facial.");
  const fila = {
    ...ingreso,
    horaMarcacion: ingreso.horaMarcacion || new Date().toISOString(),
    syncStatus: ingreso.syncStatus || ESTADO_PENDIENTE,
    auditFlag: ingreso.auditFlag ? 1 : 0,
  };
  const resultado = usaNativo
    ? await ejecutar(`INSERT OR REPLACE INTO cola_ingreso
    (clientUuid,idUsuarioEstudiante,codsisEstudiante,idAsignatura,idExamen,idAmbiente,idUsuarioOperador,tipoIngreso,metodoIngreso,motivoExcepcion,observacionIngreso,scoreFacial,livenessScore,horaMarcacion,syncStatus,auditFlag)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [fila.clientUuid, fila.idUsuarioEstudiante, fila.codsisEstudiante,
      fila.idAsignatura, fila.idExamen, fila.idAmbiente, fila.idUsuarioOperador, fila.tipoIngreso, fila.metodoIngreso,
      fila.motivoExcepcion || null, fila.observacionIngreso || null, fila.scoreFacial ?? null,
      fila.livenessScore ?? null, fila.horaMarcacion, fila.syncStatus, fila.auditFlag])
    : memoria.ingresos.set(fila.clientUuid, fila);
  notificarCola();
  return resultado;
}

export async function purgarPaqueteFacial(idExamen = null) {
  asegurarInicializada();
  const exId = idExamen == null || idExamen === "" ? null : Number(idExamen);
  if (!usaNativo) {
    if (exId == null) return memoria.paquete.clear();
    for (const clave of [...memoria.paquete.keys()]) {
      if (clave.startsWith(`${exId}:`)) memoria.paquete.delete(clave);
    }
    return;
  }
  if (exId == null) return ejecutar("DELETE FROM paquete_habilitados");
  return ejecutar("DELETE FROM paquete_habilitados WHERE idExamen = ?", [exId]);
}

export async function obtenerPaqueteFacial({ idExamen = null, idAmbiente = null } = {}) {
  asegurarInicializada();
  const exId = idExamen == null || idExamen === "" ? null : Number(idExamen);
  const ambId = idAmbiente == null || idAmbiente === "" ? null : Number(idAmbiente);
  if (!usaNativo) {
    return [...memoria.paquete.values()].filter(
      (e) => (exId == null || e.idExamen === exId) && (ambId == null || e.idAmbiente === ambId)
    );
  }
  const condiciones = [];
  const valores = [];
  if (exId != null) { condiciones.push("idExamen = ?"); valores.push(exId); }
  if (ambId != null) { condiciones.push("idAmbiente = ?"); valores.push(ambId); }
  const where = condiciones.length ? ` WHERE ${condiciones.join(" AND ")}` : "";
  const resultado = await consultar(`SELECT * FROM paquete_habilitados${where}`, valores);
  return (resultado.values || []).map((fila) => ({ ...fila, requiereIngresoManual: Boolean(fila.requiereIngresoManual) }));
}

export async function obtenerPendientesFaciales({ idExamen = null } = {}) {
  asegurarInicializada();
  const exId = idExamen == null || idExamen === "" ? null : Number(idExamen);
  if (!usaNativo) {
    const delExamen = (fila) => exId == null || fila.idExamen === exId;
    return {
      intentos: [...memoria.intentos.values()].filter((i) => i.syncStatus === ESTADO_PENDIENTE && delExamen(i)),
      ingresos: [...memoria.ingresos.values()].filter((i) => i.syncStatus === ESTADO_PENDIENTE && delExamen(i)),
    };
  }
  if (exId == null) {
    const [intentos, ingresos] = await Promise.all([
      consultar("SELECT * FROM cola_face_intento WHERE syncStatus = ?", [ESTADO_PENDIENTE]),
      consultar("SELECT * FROM cola_ingreso WHERE syncStatus = ?", [ESTADO_PENDIENTE]),
    ]);
    return { intentos: intentos.values || [], ingresos: ingresos.values || [] };
  }
  const [intentos, ingresos] = await Promise.all([
    consultar("SELECT * FROM cola_face_intento WHERE syncStatus = ? AND idExamen = ?", [ESTADO_PENDIENTE, exId]),
    consultar("SELECT * FROM cola_ingreso WHERE syncStatus = ? AND idExamen = ?", [ESTADO_PENDIENTE, exId]),
  ]);
  return { intentos: intentos.values || [], ingresos: ingresos.values || [] };
}

/**
 * Cuenta la cola facial sin obligar a que la base ya esté abierta. Al arrancar
 * la app puede haber marcas pendientes de la sesión anterior y el planificador
 * debe poder detectarlas; si el secreto facial todavía no existe, no hay nada
 * que sincronizar.
 */
export async function contarPendientesFaciales({ idExamen = null } = {}) {
  if (!inicializada) {
    try {
      await inicializarFacialSqlite();
    } catch {
      return 0;
    }
  }
  if (!inicializada) return 0;
  const { intentos, ingresos } = await obtenerPendientesFaciales({ idExamen });
  return intentos.length + ingresos.length;
}

export async function marcarFacialesSincronizados(clientUuids) {
  asegurarInicializada();
  if (!clientUuids?.length) return;
  if (!usaNativo) {
    clientUuids.forEach((uuid) => {
      if (memoria.intentos.has(uuid)) memoria.intentos.get(uuid).syncStatus = "sincronizado";
      if (memoria.ingresos.has(uuid)) memoria.ingresos.get(uuid).syncStatus = "sincronizado";
    });
    notificarCola();
    return;
  }
  const marcadores = clientUuids.map(() => "?").join(",");
  await ejecutar(`UPDATE cola_face_intento SET syncStatus = 'sincronizado' WHERE clientUuid IN (${marcadores})`, clientUuids);
  await ejecutar(`UPDATE cola_ingreso SET syncStatus = 'sincronizado' WHERE clientUuid IN (${marcadores})`, clientUuids);
  notificarCola();
}

export async function cerrarFacialSqlite() {
  if (!inicializada || !usaNativo) return;
  await CapacitorSQLite.close({ database: NOMBRE_BD, readonly: false });
  await CapacitorSQLite.closeConnection({ database: NOMBRE_BD, readonly: false });
  inicializada = false;
}
