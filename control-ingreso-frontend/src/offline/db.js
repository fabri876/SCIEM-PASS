import Dexie from 'dexie';

export const db = new Dexie('SciemPassOfflineDB');

db.version(1).stores({
  // Metadata del dispositivo y configuración local
  meta: 'clave',

  // Exámenes descargados para control
  examenes: 'idExamen, fechaExamen, codsisDocente',

  // Nóminas: PK natural compuesta. Sin índices sueltos innecesarios
  nominas: '[examenId+codigoSis], examenId, [examenId+ci], [examenId+qr]',

  // Asistencias: PK clientUuid. Índice compuesto para backoff de reintentos
  asistencias_pendientes: 'clientUuid, [syncStatus+nextRetryAt], [examenId+codigoSis], examenId, syncStatus',

  // Logs de auditoría con batchId
  logs_sincronizacion: '++id, batchId, timestamp'
});

if (import.meta.env.DEV) {
  window.__sciem_db = db;
}
