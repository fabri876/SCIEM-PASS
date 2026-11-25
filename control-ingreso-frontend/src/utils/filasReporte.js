import { textoInterfaz } from './textoInterfaz';

export function obtenerFilasReporte(marcado, titulo) {
  const doc = new DOMParser().parseFromString(marcado, 'text/html');
  const body = doc.getElementsByTagName('body')[0];
  const elementos = n => Array.from(n.getElementsByTagName('*'));
  for (const n of elementos(body)) {
    const etiqueta = n.tagName.toLowerCase();
    const decorativo = ['svg', 'input', 'select', 'textarea', 'script', 'style'].includes(etiqueta) || n.getAttribute('aria-hidden') === 'true';
    const accion = (etiqueta === 'button' || n.getAttribute('role') === 'button') && n.parentNode !== body;
    if ((decorativo || accion) && n.parentNode) n.parentNode.removeChild(n);
  }
  const texto = n => {
    const partes = [];
    const recorrer = nodo => {
      if (nodo.nodeType === 3) partes.push(nodo.nodeValue);
      else Array.from(nodo.childNodes).forEach(recorrer);
    };
    recorrer(n);
    return textoInterfaz(partes.join(' ').replace(/\s+/g, ' ').trim());
  };
  const tabla = body.getElementsByTagName('table')[0];
  if (tabla) {
    const cabeceras = Array.from(tabla.getElementsByTagName('thead')[0]?.getElementsByTagName('th') ?? []).map(texto);
    const indices = cabeceras.map((c, i) => c && !/^acci[oó]n(es)?$/i.test(c) ? i : -1).filter(i => i >= 0);
    const filas = Array.from(tabla.getElementsByTagName('tbody')[0]?.getElementsByTagName('tr') ?? [])
      .filter(f => !elementos(f).some(c => c.hasAttribute('colspan')))
      .map(f => Array.from(f.childNodes).filter(n => n.nodeType === 1 && ['td', 'th'].includes(n.tagName.toLowerCase())))
      .filter(celdas => celdas.length > 0)
      .map(celdas => indices.map(i => celdas[i] ? texto(celdas[i]) : ''));
    return { cabeceras: indices.map(i => cabeceras[i]), filas };
  }
  const filas = Array.from(body.childNodes).filter(n => n.nodeType === 1).map(n => [texto(n)]).filter(f => f[0]);
  return { cabeceras: [titulo], filas };
}
