export const ERROR_ASISTENCIA = {
  NO_EN_NOMINA: "NO_EN_NOMINA",
  NO_HABILITADO: "NO_HABILITADO",
  YA_MARCADO: "YA_MARCADO",
  PARAMETROS_INVALIDOS: "PARAMETROS_INVALIDOS",
  TIENE_MARCAS_PENDIENTES: "TIENE_MARCAS_PENDIENTES",
  LOTE_ESTADO_DESCONOCIDO: "LOTE_ESTADO_DESCONOCIDO",
  ALMACENAMIENTO_LLENO: "ALMACENAMIENTO_LLENO",
};

export const ESTADO_SYNC = {
  PENDIENTE: "pendiente",
  SYNCING: "syncing",
  SINCRONIZADO: "sincronizado",
  DUPLICADO: "duplicado",
  ERROR: "error",
};

export const RESULTADO_VALIDACION = {
  PERMITIDO: "PERMITIDO",
  NO_EN_NOMINA: "NO_EN_NOMINA",
  NO_HABILITADO: "NO_HABILITADO",
  YA_MARCADO: "YA_MARCADO",
  SIN_NOMINA_LOCAL: "SIN_NOMINA_LOCAL",
  QR_INVALIDO: "QR_INVALIDO",
  OTRA_AULA: "OTRA_AULA",
};

export const STATUS_ITEM_SYNC = {
  PROCESADO: "PROCESADO",
  DUPLICADO: "DUPLICADO",
  ERROR: "ERROR",
};

/** Horas después de las cuales se purgarán registros procesados (F1-06) */
export const PURGA_HORAS = 72;

/** Configuración de inactividad / bloqueo (F3-05) */
export const INACTIVIDAD_CONFIG = {
  TIEMPO_MAXIMO_MS: 5 * 60 * 1000, // 5 min sin actividad
  ADVERTENCIA_ANTES_MS: 60 * 1000, // 1 min antes avisa
  EVENTOS: ["click", "keydown", "touchstart", "mousemove", "scroll"],
};
