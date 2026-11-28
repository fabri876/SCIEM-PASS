export function fechaReporte(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function nombreReporte(nombre, filtros = [], extension = 'csv') {
  const partes = [nombre, ...[].concat(filtros).filter(v => v !== '' && v != null), fechaReporte()];
  return partes.map(v => String(v).trim().replace(/[^\p{L}\p{N}._-]+/gu, '-').toLocaleLowerCase('es')).filter(Boolean).join('_') + '.' + extension;
}

export function celdaCsv(valor) {
  let texto = String(valor ?? '').replace(/\r\n?/g, '\n');
  // Un CSV abierto en Excel no debe ejecutar fórmulas provenientes de datos del usuario.
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(texto)) texto = "'" + texto;
  return '"' + texto.replaceAll('"', '""') + '"';
}

export function generarCsv(cabeceras, filas) {
  return '\uFEFF' + [cabeceras, ...filas].map(fila => fila.map(celdaCsv).join(';')).join('\r\n');
}

export function descargarCsv(nombre, cabeceras, filas, filtros = []) {
  const blob = new Blob([generarCsv(cabeceras, filas)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreReporte(nombre, filtros);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
