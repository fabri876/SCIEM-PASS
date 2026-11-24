import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const datos = new Map();
globalThis.localStorage = { getItem: k => datos.get(k) ?? null, setItem: (k,v) => datos.set(k,v), removeItem: k => datos.delete(k) };
const pwaSsr = {
  name: 'responsive-roles-ssr',
  enforce: 'pre',
  resolveId(id) {
    if (id === 'virtual:pwa-register') return '\0responsive-roles-ssr';
    if (id === '@vladmandic/human') return '\0camara-fuera-de-prueba';
  },
  load(id) {
    if (id === '\0responsive-roles-ssr') return 'export const registerSW = () => async () => {};';
    // Esta prueba solo abre los menús: no carga TensorFlow ni utiliza la cámara.
    if (id === '\0camara-fuera-de-prueba') return 'export default class Human { constructor() { throw new Error("La cámara no pertenece a esta prueba de navegación"); } }';
  },
};
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, define: { 'import.meta.env.DEV': false }, plugins: [pwaSsr], ssr: { noExternal: ['@vladmandic/human'] }, server: { middlewareMode: true, watch: null }, appType: 'custom' });
const renderizar = (componente, props = {}, ruta = '/') => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [ruta] }, React.createElement(componente, props)));
try {
  const { default: Menu } = await server.ssrLoadModule('/src/components/layout/MenuSeccionesResponsive.jsx');
  for (const abierto of [false, true]) {
    const html = renderizar(Menu, { id: 'menu-prueba', etiqueta: 'Menú de prueba', abierto, onCambiar() {}, children: React.createElement('nav', null, React.createElement('button', null, 'Mis exámenes')) });
    assert.ok(html.includes(`aria-expanded="${abierto}"`));
    assert.ok(html.includes('aria-controls="menu-prueba"'));
    assert.ok(html.includes('id="menu-prueba"'));
    assert.ok(html.includes('lg:w-[280px]'), 'En escritorio se conserva el ancho de la barra');
    assert.ok(html.includes(`${abierto ? 'block' : 'hidden'} mt-3 space-y-6 lg:mt-0 lg:block`));
    assert.ok(!html.includes('fixed'), 'El menú no se superpone al header ni tapa el contenido');
  }
  const casos = [
    ['DOCENTE', '/src/pages/docente/HomeDocente.jsx', '/home/docente', 'menu-docente-secciones', ['Mis Exámenes', 'Registrar Examen', 'Control de Ingresos', 'Monitoreo de Asistencia', 'Reportes y Asistencia', 'Intentos Incorrectos', 'Incidencias']],
    ['ESTUDIANTE', '/src/pages/estudiante/HomeEstudiante.jsx', '/estudiante', 'menu-estudiante-secciones', ['Inicio', 'Mis exámenes']],
    ['OPERADOR', '/src/pages/control/HomeControl.jsx', '/control/conectado', 'menu-ayudante-secciones', ['Inicio', 'Mis exámenes', 'Mis registros']],
  ];
  for (const [rol, archivo, ruta, id, opciones] of casos) {
    datos.set('token', 'prueba-responsive'); datos.set('ultimaActividad', String(Date.now()));
    datos.set('usuario', JSON.stringify({ idUsuario: 1, nombre: 'Usuario', apellido: 'Prueba', rol }));
    const { default: Componente } = await server.ssrLoadModule(archivo);
    const html = renderizar(Componente, {}, ruta);
    assert.ok(html.includes(`aria-controls="${id}"`), `El rol ${rol} tiene un control de navegación visible en móvil`);
    assert.ok(html.includes('flex flex-col lg:flex-row'), `El rol ${rol} apila menú y contenido en móvil y tablet`);
    for (const opcion of opciones) assert.ok(html.includes(opcion), `Falta ${opcion} en ${rol}`);
    assert.ok(!html.includes('-translate-x-full'), `El rol ${rol} no deja enlaces fuera de pantalla`);
  }
  console.log('OK: menús de ayudante, docente y estudiante; todos sus apartados; estados abierto/cerrado; atributos accesibles y disposición responsive.');
} finally {
  await server.close();
}
