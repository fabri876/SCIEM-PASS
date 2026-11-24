// Solo transforma la presentación; los códigos enviados a la API no cambian.
const SIGLAS = new Set(['CI', 'C.I.', 'SIS', 'QR', 'PDF', 'CSV', 'XLSX', 'IP', 'SHA-256', 'JWT', 'UMSS', 'TIS', 'PWA', 'ID', 'PIN', 'API', 'URL', 'JPG', 'PNG', 'MB', 'GB', 'KB', 'SQL', 'HTTP', 'HTTPS', 'GPS', 'USB', 'QR/CI/SIS', 'SCIEM-PASS']);

export function textoInterfaz(valor) {
  if (typeof valor !== 'string' || !/[A-ZÁÉÍÓÚÜÑ]/.test(valor)) return valor;
  const limpio = valor.trim();
  if (SIGLAS.has(limpio) || /^[A-Z]{1,5}[-/]?\d+[A-Z\d-]*$/.test(limpio)) return valor;
  // Respeta nombres propios, direcciones y textos que ya tienen capitalización natural.
  if (/[a-záéíóúüñ]/.test(valor) || /https?:|@/.test(valor)) return valor;
  let frase = valor.replaceAll('_', ' ').toLocaleLowerCase('es');
  frase = frase.replace(/[a-záéíóúüñ]/u, letra => letra.toLocaleUpperCase('es'));
  return frase.replace(/\b[\p{L}\d./-]+\b/gu, palabra => {
    const sigla = palabra.toUpperCase();
    return SIGLAS.has(sigla) || /^(?=.*\d)[A-Z\d-]+$/.test(sigla) ? sigla : palabra;
  });
}
