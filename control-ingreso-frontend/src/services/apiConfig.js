import { Capacitor } from "@capacitor/core";

/**
 * apiConfig.js
 *
 * URL base del backend Java/Spring Boot.
 * En navegador desktop usa VITE_API_URL o localhost:8080.
 * En dispositivo nativo (APK Android), nunca debe apuntar a localhost (127.0.0.1
 * del teléfono), sino a la IP LAN del servidor de desarrollo.
 */
const ENV_API_URL = import.meta.env.VITE_API_URL;
const LAN_API_URL = "http://192.168.100.155:8080";

export const strApiBaseUrl = (ENV_API_URL && !ENV_API_URL.includes("localhost"))
  ? ENV_API_URL
  : (Capacitor.isNativePlatform() ? LAN_API_URL : (ENV_API_URL || "http://localhost:8080"));
