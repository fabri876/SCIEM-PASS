/**
 * apiConfig.js
 *
 * URL base del backend Java/Spring Boot.
 * En navegador desktop usa VITE_API_URL o localhost:8080. La APK productiva
 * recibe VITE_API_URL durante la compilación y no depende de una IP LAN.
 */
const ENV_API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || "2");

export const strApiBaseUrl = ENV_API_URL || "http://localhost:8080";

export function encabezadoVersionCliente() {
  return { "X-App-Version": APP_VERSION };
}
