import Dexie from 'dexie';

export const db = new Dexie('SciemPassOfflineDB');

db.version(2).stores({
  // Metadata del dispositivo y configuración local
  meta: 'clave',

  // Exámenes descargados para control
  examenes: 'idExamen, fechaExamen, codsisDocente',

  // Nóminas: PK natural compuesta. Sin índices sueltos innecesarios
  nominas: '[examenId+codigoSis], examenId, [examenId+ci], [examenId+qr]',

  // Fotos de estudiantes (almacenamiento local optimizado)
  fotos: 'codigoSis',

  // Asistencias: PK clientUuid. Índice compuesto para backoff de reintentos
  asistencias_pendientes: 'clientUuid, [syncStatus+nextRetryAt], [examenId+codigoSis], examenId, syncStatus',

  // Logs de auditoría con batchId
  logs_sincronizacion: '++id, batchId, timestamp',

  // Configuración de usuario (PIN, bloqueo por inactividad)
  configUsuario: 'idUsuario',

  // Asignaciones de operadores (ayudantes) por examen y aula
  // Clave compuesta: [idExamen, idAmbiente, idUsuario] para no mezclar parciales
  asignacionesOperadores: '[idExamen+idAmbiente+idUsuario], idExamen, idUsuario',
});

db.version(3).stores({
  meta: 'clave',
  examenes: 'idExamen, fechaExamen, codsisDocente',
  nominas: '[examenId+codigoSis], examenId, [examenId+ci], [examenId+qr]',
  fotos: 'codigoSis',
  asistencias_pendientes: 'clientUuid, [syncStatus+nextRetryAt], [examenId+codigoSis], examenId, syncStatus',
  logs_sincronizacion: '++id, batchId, timestamp',
  configUsuario: 'idUsuario',
  asignacionesOperadores: '[idExamen+idAmbiente+idUsuario], idExamen, idUsuario',
  incidencias_pendientes: 'clientUuid, [syncStatus+nextRetryAt], idAmbiente, syncStatus',
  expulsiones_pendientes: 'clientUuid, incidenciaClientUuid, syncStatus',
});

if (import.meta.env.DEV) {
  window.__sciem_db = db;
}
