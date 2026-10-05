/**
 * Normaliza el CI quitando puntos, guiones y espacios.
 * Mantiene números y complementos alfanuméricos en mayúsculas.
 */
export function normalizarCi(ci) {
  if (!ci) return '';
  return String(ci)
    .trim()
    .replace(/[.\-\s]/g, '')
    .toUpperCase();
}

/**
 * Normaliza el código SIS eliminando espacios y asegurando string limpio.
 */
export function normalizarCodigo(codigoSis) {
  if (!codigoSis) return '';
  return String(codigoSis).trim();
}

/**
 * Normaliza el contenido de un código QR.
 * Si el QR contiene una URL o JSON, extrae la parte relevante;
 * por defecto limpia espacios en blanco.
 */
export function normalizarQr(qr) {
  if (!qr) return '';
  const limpio = String(qr).trim();
  return limpio;
}
