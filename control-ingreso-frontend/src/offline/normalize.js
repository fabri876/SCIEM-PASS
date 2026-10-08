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
 * Inspecciona un texto para determinar si corresponde al protocolo QR oficial.
 * Formato esperado: SCIEMPASS:<version>:<token>
 */
export function extraerQr(texto) {
  if (!texto) {
    return { esQr: false, version: null, token: null };
  }
  const limpio = String(texto).trim();
  if (!limpio.startsWith('SCIEMPASS:')) {
    return { esQr: false, version: null, token: null };
  }
  const partes = limpio.split(':');
  const version = partes[1] ? partes[1].trim() : null;
  const token = partes.slice(2).join(':').trim() || null;
  return {
    esQr: true,
    version,
    token
  };
}

/**
 * Normaliza un código QR.
 * Si es el formato SCIEMPASS, devuelve el token en mayúsculas sin prefijo.
 * Si no tiene prefijo, devuelve el texto limpio también en mayúsculas.
 */
export function normalizarQr(qr) {
  if (!qr) return '';
  const info = extraerQr(qr);
  if (info.esQr && info.token) {
    return info.token.toUpperCase();
  }
  return String(qr).trim().toUpperCase();
}
