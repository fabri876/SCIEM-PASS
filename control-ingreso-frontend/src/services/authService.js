import { strApiBaseUrl } from "./apiConfig";

/**
 * authService.js
 *
 * Acá viven las funciones que hablan por HTTP con el backend para todo lo
 * relacionado a autenticación (registro y, más adelante, login). El
 * componente RegistroForm no hace fetch() directo: le pide el registro a
 * esta función y listo, siguiendo el mismo patrón que describe el
 * documento de arquitectura para "services/" (ej. estudianteService.js).
 *
 * ⚠️ IMPORTANTE para coordinar con el equipo de backend:
 * El endpoint "/api/auth/registro" y el nombre de los campos del body son
 * un supuesto razonable dado que en Spring Boot todavía no existe ningún
 * controlador de registro (según el documento de arquitectura, aplicacion/
 * y persistencia/ siguen vacías). Hay que confirmar con quien construya
 * el controlador real:
 *   - la ruta exacta del endpoint
 *   - los nombres de los campos que espera el DTO/entidad Estudiante
 *   - la forma de la respuesta (¿devuelve el usuario creado? ¿un token?)
 * y ajustar esta función una vez esté definido.
 */
export async function registrarUsuario(objDatosRegistro) {
  const response = await fetch(`${strApiBaseUrl}/api/auth/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(objDatosRegistro),
  });

  if (!response.ok) {
    const objError = await response.json().catch(() => null);
    throw new Error(objError?.mensaje || "No se pudo completar el registro.");
  }

  return response.json();
}
