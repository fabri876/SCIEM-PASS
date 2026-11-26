const RAW_ENV_URL = import.meta.env.VITE_API_URL;
const ENV_API_URL = RAW_ENV_URL !== undefined ? String(RAW_ENV_URL).replace(/\/$/, "") : null;

export const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || "2");

// Si VITE_API_URL está definida (incluso vacía ""), la usa; si no existe, usa localhost:8080
export const strApiBaseUrl = ENV_API_URL !== null ? ENV_API_URL : "http://localhost:8080";

export function encabezadoVersionCliente() {
  return { "X-App-Version": APP_VERSION };
}