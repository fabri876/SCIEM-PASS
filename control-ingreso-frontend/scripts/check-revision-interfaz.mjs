import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { textoInterfaz } from '../src/utils/textoInterfaz.js';
import { celdaCsv, generarCsv } from '../src/utils/exportarCsv.js';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const { DOMParser: XmlParser } = require('@xmldom/xmldom');
const { createServer } = await import('vite');

assert.equal(textoInterfaz('INGRESO DENEGADO — EXAMEN INCORRECTO'), 'Ingreso denegado — examen incorrecto');
assert.equal(textoInterfaz('REGISTRO_INGRESO'), 'Registro ingreso');
assert.equal(textoInterfaz('CÓDIGO SIS'), 'Código SIS');
assert.equal(textoInterfaz('AULA 691B'), 'Aula 691B');
for (const valor of ['QR', 'CI', 'C.I.', 'SIS', 'PDF', 'SHA-256', 'PIN', 'INC-014', 'Ana Rocha', 'ana@umss.edu', 0, false, null]) assert.equal(textoInterfaz(valor), valor);
assert.equal(celdaCsv('Pérez; "Ana"\nLínea 2'), '"Pérez; ""Ana""\nLínea 2"');
for (const valor of ['=SUM(A1)', '+1+1', '-cmd', '@SUM(A1)', '\t=1+1', '  =1']) assert.ok(celdaCsv(valor).startsWith('"\''));
assert.ok(generarCsv(['Nombre'], [['José']]).startsWith('\uFEFF'));

// El mismo árbol DOM que analiza el navegador, sin depender de CSS ni de un backend.
globalThis.DOMParser = class {
  parseFromString(html) {
    return new XmlParser().parseFromString(`<html><head></head><body>${html}</body></html>`, 'text/html');
  }
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const pwaSsr = {
  name: 'pwa-revision-interfaz',
  resolveId(id) { if (id === 'virtual:pwa-register') return '\0pwa-revision-interfaz'; },
  load(id) { if (id === '\0pwa-revision-interfaz') return 'export const registerSW = () => async () => {};'; },
};
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, define: { 'import.meta.env.DEV': false }, plugins: [pwaSsr], server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { obtenerFilasReporte } = await server.ssrLoadModule('/src/utils/filasReporte.js');
  const { TablaConReporte } = await server.ssrLoadModule('/src/components/common/ReporteLista.jsx');
  const registros = Array.from({ length: 12 }, (_, i) => ({ nombre: `Estudiante ${i + 1}`, estado: 'HABILITADO' }));
  const tabla = completo => React.createElement('table', null,
    React.createElement('thead', null, React.createElement('tr', null, ...['Estudiante', 'Estado', 'Acciones'].map(n => React.createElement('th', { key: n }, n)))),
    React.createElement('tbody', null, ...(completo ? registros : registros.slice(0, 5)).map((r, i) => React.createElement('tr', { key: i },
      React.createElement('td', null, React.createElement('span', null, r.nombre), React.createElement('span', null, 'SIS 123456789')),
      React.createElement('td', null, textoInterfaz(r.estado)), React.createElement('td', null, React.createElement('button', null, 'Eliminar'))))));
  const arbol = TablaConReporte({ titulo: 'Estudiantes', children: tabla });
  const reporte = arbol.props.children[0].props.contenido();
  const pantalla = renderToStaticMarkup(arbol.props.children[1]);
  assert.equal((pantalla.match(/<tr>/g) ?? []).length, 6, 'La pantalla mantiene cinco filas y su encabezado');
  const salida = obtenerFilasReporte(renderToStaticMarkup(reporte), 'Estudiantes');
  assert.equal(salida.filas.length, 12, 'El reporte incluye todas las páginas filtradas');
  assert.deepEqual(salida.cabeceras, ['Estudiante', 'Estado']);
  assert.equal(salida.filas[0][0], 'Estudiante 1 SIS 123456789');
  assert.equal(salida.filas[0][1], 'Habilitado');
  assert.ok(!generarCsv(salida.cabeceras, salida.filas).includes('Eliminar'));
  assert.equal(obtenerFilasReporte('<table><thead><tr><th>Nombre</th></tr></thead><tbody><tr><td colspan="1">Cargando…</td></tr></tbody></table>', 'Lista').filas.length, 0);
  const tarjeta = '<div role="button"><span>Aula 601</span><span>58 / 60</span><svg><title>Icono</title></svg><button>Ver detalle</button></div>';
  assert.deepEqual(obtenerFilasReporte(tarjeta, 'Aulas').filas, [['Aula 601 58 / 60']]);

  const { default: TarjetaExamen } = await server.ssrLoadModule('/src/pages/docente/components/TarjetaExamenDocente.jsx');
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(TarjetaExamen, { examen: { idExamen: 1, nombreExamen: 'Cálculo I', tipoExamen: 'PRIMER PARCIAL', fecha: '2026-11-30', ambientes: [] } })));
  assert.ok(!html.includes('PRIMER PARCIAL'));
  assert.ok(html.includes('Primer parcial'));
  console.log('OK: formato oración, siglas, códigos, CSV seguro, columnas visibles, listas vacías, tarjetas y exportación de todas las páginas.');
} finally {
  await server.close();
}
