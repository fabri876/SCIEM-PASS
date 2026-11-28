// Solo transforma la presentación; los códigos enviados a la API no cambian.
const SIGLAS = new Set(['CI', 'C.I.', 'SIS', 'QR', 'PDF', 'CSV', 'XLSX', 'IP', 'SHA-256', 'JWT', 'UMSS', 'TIS', 'PWA', 'ID', 'PIN', 'API', 'URL', 'JPG', 'PNG', 'MB', 'GB', 'KB', 'SQL', 'HTTP', 'HTTPS', 'GPS', 'USB', 'QR/CI/SIS', 'SCIEM-PASS', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']);

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

// Materias y módulos pueden llegar con capitalización mezclada desde el catálogo.
export function textoAsignatura(valor) {
  if (typeof valor !== 'string') return valor;
  const frase = valor.trim().replaceAll('_', ' ').toLocaleLowerCase('es')
    .replace(/\p{L}/u, letra => letra.toLocaleUpperCase('es'));
  return frase.replace(/[\p{L}\d./-]+/gu, palabra => SIGLAS.has(palabra.toUpperCase()) ? palabra.toUpperCase() : palabra);
}

// El reporte junta materia y tipo de examen con la fecha y el aula.
export function textoExamenAulaAsignada(valor) {
  if (typeof valor !== 'string') return valor;
  const inicioDetalle = valor.search(/(?:^|\s)(?:\d{4}-\d{2}-\d{2}\b|Aula\s+\d)/iu);
  if (inicioDetalle <= 0) return textoInterfaz(valor);
  return textoAsignatura(valor.slice(0, inicioDetalle)) + valor.slice(inicioDetalle);
}
