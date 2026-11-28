import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { textoAsignatura, textoInterfaz } from '../src/utils/textoInterfaz.js';
import { textoNombre } from '../src/components/common/textoNombre.js';
import { fechaReporte, nombreReporte, generarCsv } from '../src/utils/exportarCsv.js';

const require = createRequire(import.meta.url);
const React = require('react');
const { act } = React;
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const { MockWindow } = require('@stencil/core/mock-doc');
const { DOMParser: XmlParser } = require('@xmldom/xmldom');

for (const valor of ['CÁLCULO II', 'Cálculo ii', 'cálculo II']) assert.equal(textoAsignatura(valor), 'Cálculo II');
assert.equal(textoAsignatura('PROGRAMACIÓN I'), 'Programación I');
assert.equal(textoAsignatura('BASE DE DATOS III'), 'Base de datos III');
assert.equal(textoInterfaz('EXAMEN INCORRECTO'), 'Examen incorrecto');
assert.equal(textoNombre('sAMUEL ACHA PEREZ'), 'Samuel Acha Perez');
assert.equal(textoNombre('valeria camila huanca cruz'), 'Valeria Camila Huanca Cruz');
assert.equal(fechaReporte(new Date(2026, 10, 27)), '2026-11-27');
assert.equal(nombreReporte('Lista oficial', ['Ausentes']), `lista-oficial_ausentes_${fechaReporte()}.csv`);
assert.notEqual(nombreReporte('Lista', ['Ausentes']), nombreReporte('Lista', ['Ingresados']));

globalThis.DOMParser = class {
  parseFromString(html) { return new XmlParser().parseFromString(`<html><head></head><body>${html}</body></html>`, 'text/html'); }
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false,
  define: { 'import.meta.env.DEV': false }, optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [{ name: 'qa-pwa', resolveId(id) { if (id === 'virtual:pwa-register') return '\0qa-pwa'; }, load(id) { if (id === '\0qa-pwa') return 'export const registerSW = () => async () => {};'; } }], server: { middlewareMode: true, watch: null }, appType: 'custom' });
let root;
const temporizadorReal = globalThis.setTimeout;
try {
  const { reporteExamenes, reporteEstudiantes } = await server.ssrLoadModule('/src/utils/reportesListas.js');
  const { obtenerFilasReporte } = await server.ssrLoadModule('/src/utils/filasReporte.js');
  const { default: ReporteLista } = await server.ssrLoadModule('/src/components/common/ReporteLista.jsx');
  const { default: UserTableCard } = await server.ssrLoadModule('/src/pages/admin/components/UserTableCard.jsx');
  const { default: Catalogo } = await server.ssrLoadModule('/src/pages/admin/components/CatalogoAcademicoTable.jsx');
  const catalogoHtml = renderToStaticMarkup(React.createElement(Catalogo));
  assert.ok(catalogoHtml.includes('Exportar reporte de Asignaturas'), 'El catálogo principal tiene su propio reporte');
  const { default: MisExamenes } = await server.ssrLoadModule('/src/pages/docente/components/SeccionMisExamenes.jsx');
  const examenesHtml = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(MisExamenes, { examenes: [{ idExamen: 1, nombreExamen: 'CÁLCULO II', tipoExamen: 'PRIMER PARCIAL', fechaExamen: '2030-11-27', ambientes: [] }] })));
  assert.ok(examenesHtml.includes('Cálculo II') && !examenesHtml.includes('>CÁLCULO II<'));
  assert.ok(examenesHtml.includes('justify-start'), 'El reporte se alinea con el inicio del contenido');
  const { formatearDescripcion } = await server.ssrLoadModule('/src/services/notificacionesService.js');
  assert.ok(formatearDescripcion('CÁLCULO II · Tipo: MATERIAL_NO_AUTORIZADO').includes('Material no autorizado'));
  const usuarios = [{ idUsuario: 1, nombre: 'cAMILA', apellido: 'TARQUI VEGA', rol: 'ESTUDIANTE', estado: true, ci: '1234', correo: 'camila@example.invalid', contrasena: 'NO_EXPORTAR' }];
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(UserTableCard, { usuarios })));
  const usuariosCsv = obtenerFilasReporte(html, 'Usuarios');
  assert.equal(usuariosCsv.filas[0][0], 'Camila Tarqui Vega', 'No exporta las iniciales del avatar');
  assert.ok(!generarCsv(usuariosCsv.cabeceras, usuariosCsv.filas).includes('NO_EXPORTAR'));

  const registros = Array.from({ length: 15 }, (_, i) => ({ idExamen: i + 1, nombreExamen: 'CÁLCULO II', tipoExamen: 'PRIMER PARCIAL', fechaExamen: '2026-11-27', grupo: '1', horario: '08:00 – 10:00', ambientes: [{ nombreAmbiente: 'Aula 691B' }], nombreDocente: 'SAMUEL ACHA PEREZ', contrasena: 'NO_EXPORTAR' }));
  const reporte = reporteExamenes(registros);
  assert.equal(reporte.filas.length, 15);
  assert.ok(reporte.cabeceras.includes('Asignatura') && reporte.cabeceras.includes('Docente'));
  assert.equal(reporte.filas[0][0], 'Cálculo II');
  assert.equal(reporte.filas[0].at(-1), 'Samuel Acha Perez');
  const csv = generarCsv(reporte.cabeceras, reporte.filas);
  assert.ok(csv.startsWith('\uFEFF"Asignatura";"Tipo";'));
  assert.ok(!csv.includes('NO_EXPORTAR'));
  assert.equal(reporteEstudiantes([{ nombres: 'ANA', apellidos: 'ROCHA', sis: '012345', ci: '123', estado: 'AUSENTE' }]).filas[0][0], 'Rocha Ana');

  // Interacción real con React: descarga, filtros, lista vacía y caducidad del aviso.
  const win = new MockWindow();
  win.HTMLIFrameElement = class {};
  globalThis.window = win;
  globalThis.navigator = win.navigator;
  globalThis.document = win.document;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const descargas = [];
  let blobActual;
  URL.createObjectURL = blob => { blobActual = blob; return 'blob:reporte-prueba'; };
  URL.revokeObjectURL = () => {};
  const crear = document.createElement.bind(document);
  document.createElement = nombre => {
    const el = crear(nombre);
    if (nombre === 'a') el.click = () => descargas.push({ nombre: el.download, blob: blobActual });
    return el;
  };
  const { createRoot } = require('react-dom/client');
  const host = document.body.appendChild(crear('div'));
  root = createRoot(host);
  const mostrar = async (datos, filtros = ['AUSENTE']) => {
    await act(async () => root.render(React.createElement(ReporteLista, { titulo: 'Lista oficial', datos, filtros })));
  };
  const exportar = async () => {
    await act(async () => host.querySelector('button').dispatchEvent(new win.Event('click', { bubbles: true })));
  };
  await mostrar(() => reporte);
  await exportar();
  assert.equal(descargas.length, 1);
  assert.ok(descargas[0].nombre.includes('_ausente_'));
  assert.deepEqual(Buffer.from(await descargas[0].blob.arrayBuffer()), Buffer.from(csv));
  assert.ok(host.textContent.includes('Reporte generado: 15 registros.'));
  await mostrar(() => reporte, ['PRESENTE']);
  assert.ok(!host.querySelector('[role="status"]'), 'Cambiar de filtro limpia el aviso');
  globalThis.setTimeout = (fn, ms, ...args) => temporizadorReal(fn, ms === 5000 ? 10 : ms, ...args);
  await exportar();
  await act(async () => { await new Promise(resolve => temporizadorReal(resolve, 30)); });
  assert.ok(!host.querySelector('[role="status"]'), 'El aviso desaparece automáticamente');
  await mostrar(() => ({ cabeceras: ['Estudiante'], filas: [] }));
  await exportar();
  assert.equal(descargas.length, 2, 'La lista vacía no descarga archivo');
  assert.ok(host.textContent.includes('No hay registros para generar el reporte.'));
  await mostrar(() => { throw new Error('Exportación fallida'); });
  await exportar();
  assert.ok(host.textContent.includes('No se pudo generar el reporte.'));
  console.log('OK: observaciones 01 y 07; nombres, materias, romanos, columnas, todas las filas, avatar, CSV, filtros, fechas y avisos.');
} finally {
  if (root) await act(async () => root.unmount());
  globalThis.setTimeout = temporizadorReal;
  await server.close();
}

