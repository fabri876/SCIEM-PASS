import Dexie from "dexie";

export const db = new Dexie("SciemPassOfflineDB");

db.version(2).stores({
  // Metadata del dispositivo y configuración local
  meta: "clave",

  // Exámenes descargados para control
  examenes: "idExamen, fechaExamen, codsisDocente",

  // Nóminas: PK natural compuesta. Sin índices sueltos innecesarios
  nominas: "[examenId+codigoSis], examenId, [examenId+ci], [examenId+qr]",

  // Fotos de estudiantes (almacenamiento local optimizado)
  fotos: "codigoSis",

  // Asistencias: PK clientUuid. Índice compuesto para backoff de reintentos
  asistencias_pendientes:
    "clientUuid, [syncStatus+nextRetryAt], [examenId+codigoSis], examenId, syncStatus",

  // Logs de auditoría con batchId
  logs_sincronizacion: "++id, batchId, timestamp",

  // Configuración de usuario (PIN, bloqueo por inactividad)
  configUsuario: "idUsuario",

  // Asignaciones de operadores (ayudantes) por examen y aula
  // Clave compuesta: [idExamen, idAmbiente, idUsuario] para no mezclar parciales
  asignacionesOperadores:
    "[idExamen+idAmbiente+idUsuario], idExamen, idUsuario",
});

db.version(3).stores({
  meta: "clave",
  examenes: "idExamen, fechaExamen, codsisDocente",
  nominas: "[examenId+codigoSis], examenId, [examenId+ci], [examenId+qr]",
  fotos: "codigoSis",
  asistencias_pendientes:
    "clientUuid, [syncStatus+nextRetryAt], [examenId+codigoSis], examenId, syncStatus",
  logs_sincronizacion: "++id, batchId, timestamp",
  configUsuario: "idUsuario",
  asignacionesOperadores:
    "[idExamen+idAmbiente+idUsuario], idExamen, idUsuario",
  incidencias_pendientes:
    "clientUuid, [syncStatus+nextRetryAt], idAmbiente, syncStatus",
  expulsiones_pendientes: "clientUuid, incidenciaClientUuid, syncStatus",
});

db.version(4).stores({
  orientacion_jornada: "[operadorId+examenControl], operadorId, fecha",
  intentos_examen_pendientes: "clientUuid, operadorId, estado, fechaCreacion",
});

// v5: colas offline de incidencias y expulsiones (feature incidencias offline).
// Se declara una version nueva para que los dispositivos que ya tienen la base
// creada reciban las tablas mediante una migracion real.
db.version(5).stores({
  incidencias_pendientes:
    "clientUuid, [syncStatus+nextRetryAt], idAmbiente, syncStatus",
  expulsiones_pendientes: "clientUuid, incidenciaClientUuid, syncStatus",
});

// v6: cola offline de revocaciones de incidencias/expulsiones.
db.version(6).stores({
  revocaciones_pendientes:
    "clientUuid, [syncStatus+nextRetryAt], idExamen, syncStatus",
});

// v7: evidencias (fotos) de incidencias registradas offline. Se guarda el blob
// localmente y se sube cuando la incidencia ya existe en el servidor (HU21).
db.version(7).stores({
  evidencias_pendientes:
    "clientUuid, incidenciaClientUuid, [syncStatus+nextRetryAt], syncStatus",
});

// v8: ingresos excepcionales autorizados sin conexión. El respaldo (foto)
// viaja como blob y se sube al sincronizar (HU21).
db.version(8).stores({
  ingresos_excepcionales_pendientes:
    "clientUuid, [syncStatus+nextRetryAt], idExamen, idAmbiente, syncStatus",
});

if (import.meta.env.DEV) {
  window.__sciem_db = db;
}
