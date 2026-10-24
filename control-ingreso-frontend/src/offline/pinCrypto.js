/**
 * CRIPTOGRAFÍA DE PIN — SCIEM-PASS
 *
 * Derivación y verificación segura de PIN usando PBKDF2 con HMAC-SHA-256
 * mediante Web Crypto API (crypto.subtle), disponible nativamente en navegadores modernos.
 *
 * - Sal por usuario: `sciem-pass:${idUsuario}` (evita ataques con rainbow tables).
 * - 100.000 iteraciones: resistente a fuerza bruta para PIN de 4-6 dígitos sin degradar UI (~80-120ms).
 */

const ITERACIONES_PBKDF2 = 100_000;
const HASH_ALGORITMO = "SHA-256";
const PREFIJO_SAL = "sciem-pass";

/**
 * Deriva un hash seguro en formato hexadecimal para un PIN numérico.
 *
 * @param {string} pin - PIN ingresado (ej. "1234")
 * @param {string|number} idUsuario - Identificador del usuario (sal base)
 * @returns {Promise<string>} Hash hexadecimal de 64 caracteres
 */
export async function derivarHashPin(pin, idUsuario) {
  if (!pin || typeof pin !== "string") {
    throw new Error("El PIN debe ser una cadena de texto no vacía.");
  }
  if (!idUsuario) {
    throw new Error("Se requiere idUsuario para salar el PIN.");
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin.trim()),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const sal = encoder.encode(`${PREFIJO_SAL}:${idUsuario}`);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: HASH_ALGORITMO,
      salt: sal,
      iterations: ITERACIONES_PBKDF2,
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifica si un PIN ingresado coincide con el hash almacenado.
 *
 * @param {string} pinIngresado - PIN en texto plano a verificar
 * @param {string} hashGuardado - Hash hexadecimal previamente almacenado
 * @param {string|number} idUsuario - Identificador del usuario
 * @returns {Promise<boolean>} true si coincide, false en caso contrario
 */
export async function verificarPin(pinIngresado, hashGuardado, idUsuario) {
  if (!pinIngresado || !hashGuardado || !idUsuario) {
    return false;
  }
  try {
    const hashCalculado = await derivarHashPin(pinIngresado, idUsuario);
    return hashCalculado === hashGuardado;
  } catch {
    return false;
  }
}
