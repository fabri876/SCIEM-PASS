/**
 * apiConfig.js
 *
 * Un solo lugar con la URL base del backend Java/Spring. Tal como explica
 * el documento de arquitectura del equipo: si mañana la URL cambia (de
 * localhost al servidor real del Laboratorio DIS), solo se edita acá,
 * no en cada archivo de "services" ni en cada componente.
 *
 * strApiBaseUrl sale de una variable de entorno de Vite (VITE_API_URL).
 * Si no está configurada, cae en localhost:8080 (el puerto por defecto
 * de Spring Boot) para que funcione en desarrollo sin configurar nada.
 *
 * Para usarla: crear un archivo ".env" en la raíz del frontend con:
 *   VITE_API_URL=http://localhost:8080
 */
export const strApiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
//const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
//export const strApiBaseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

