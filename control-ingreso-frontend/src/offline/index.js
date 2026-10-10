export { db } from "./db.js";
export {
  ERROR_ASISTENCIA,
  ESTADO_SYNC,
  RESULTADO_VALIDACION,
  STATUS_ITEM_SYNC,
} from "./constantes.js";
export {
  normalizarCi,
  normalizarCodigo,
  normalizarQr,
  extraerQr,
} from "./normalize.js";
export { generarUuid } from "./uuid.js";
export { obtenerDeviceId } from "./deviceId.js";
export { nominaRepo, CAMPOS_SERVIDOR, parsearIsoEpoch } from "./nominaRepo.js";
export { asistenciaRepo } from "./asistenciaRepo.js";
export { syncLogRepo } from "./syncLogRepo.js";
export { fotoRepo } from "./fotoRepo.js";
export { configRepo, CONFIG_DEFAULTS } from "./configRepo.js";
export { usePendientesCount } from "./usePendientesCount.js";
export { validarIngreso, registrarIngreso } from "./validationEngine.js";
export {
  verificarAlmacenamiento,
  solicitarPersistencia,
} from "./almacenamiento.js";
export {
  sincronizarPendientes,
  iniciarSync,
  suscribirSync,
  calcularBackoffMs,
  construirPayload,
  enviarLoteHttp,
  URL_BATCH_SYNC,
} from "./syncQueueService.js";
export {
  URL_HEALTH,
  UMBRAL_DESFASE_MS,
  TIMEOUT_PING_MS,
  INTERVALO_ONLINE_MS,
  INTERVALO_OFFLINE_MS,
  REINTENTO_RAPIDO_MS,
  DEFECTO_UMBRAL_DEGRADADO_MS,
  pingHttpPorDefecto,
  probarConexionReal,
  iniciarConectividad,
  detenerConectividad,
  verificarAhora,
  obtenerEstadoConexion,
  obtenerClockOffsetMs,
  suscribirConectividad,
  establecerModoOfflineForzado,
} from "./connectivityService.js";
export {
  iniciarSincronizacionAutomatica,
  detenerSincronizacionAutomatica,
  sincronizarAhora,
  reanudarSync,
  obtenerEstadoScheduler,
  suscribirScheduler,
} from "./syncScheduler.js";
export { useConectividad } from "./useConectividad.js";
export { useEstadoSync } from "./useEstadoSync.js";
export {
  PURGA_HORAS,
  ejecutarPurgaCompleta,
  programarPurgaPeriodica,
  purgarAsistenciasProcesadas,
  purgarLogsSincronizacion,
  purgarFotosHuerfanas,
  purgarNominasAntiguas,
} from "./purgeJob.js";
export { useInactividad, crearInactividad } from "./useInactividad.js";
export {
  limpiarAlLogout,
  limpiezaTotalDispositivoCompartido,
  LIMPIEZA_DEFAULTS,
} from "./logoutCleanup.js";
export { INACTIVIDAD_CONFIG } from "./constantes.js";
