import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const React = require("react");
const { renderToString } = require("react-dom/server");
const { MemoryRouter } = require("react-router-dom");
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);

// Sesión ficticia únicamente para renderizar; no hay llamadas al backend ni escrituras en BD.
const valores = new Map([
  ["token", "prueba-render"],
  ["usuario", JSON.stringify({ idUsuario: 1, nombre: "Admin", rol: "ADMINISTRADOR" })],
  ["ultimaActividad", String(Date.now())],
]);
globalThis.localStorage = {
  getItem: key => valores.get(key) ?? null,
  setItem: (key, value) => valores.set(key, value),
  removeItem: key => valores.delete(key),
};

// El chequeo SSR no registra service workers ni activa herramientas de navegador.
const pwaSsr = {
  name: "pwa-ssr-render-check",
  resolveId(id) { if (id === "virtual:pwa-register") return "\0pwa-ssr-render-check"; },
  load(id) { if (id === "\0pwa-ssr-render-check") return "export const registerSW = () => async () => {};"; },
};
const server = await createServer({ root, configFile: false, define: { "import.meta.env.DEV": false }, plugins: [pwaSsr], server: { middlewareMode: true, watch: null }, appType: "custom" });
try {
  const { default: Tabla } = await server.ssrLoadModule("/src/pages/admin/components/UserTableCard.jsx");
  for (const usuarios of [[], [{ idUsuario: 4, nombre: "Estudiante", apellido: "Prueba", rol: "ESTUDIANTE", estado: true }]]) {
    const html = renderToString(React.createElement(Tabla, { usuarios, onEliminar: async () => {} }));
    assert.ok(html.includes("Administración de Usuarios y Roles"));
    if (usuarios.length) assert.ok(html.includes("Eliminar usuario"));
  }
  const { default: Header } = await server.ssrLoadModule("/src/components/layout/Header.jsx");
  for (const [rol, destino] of [["ADMINISTRADOR", "/admin"], ["DOCENTE", "/home/docente"], ["ESTUDIANTE", "/estudiante"], ["OPERADOR", "/control"], [null, "/inicio"]]) {
    if (rol) { valores.set("token", "prueba-render"); valores.set("usuario", JSON.stringify({ idUsuario: 1, nombre: "Prueba", rol })); }
    else { valores.delete("token"); valores.delete("usuario"); }
    const htmlHeader = renderToString(React.createElement(MemoryRouter, null, React.createElement(Header)));
    assert.match(htmlHeader, new RegExp(`href="${destino}"[^>]*>[\\s\\S]*?Inicio`));
  }
  valores.set("token", "prueba-render"); valores.set("usuario", JSON.stringify({ idUsuario: 1, nombre: "Admin", rol: "ADMINISTRADOR" }));
  const { crearAvisosExamenes, crearAvisosCambios } = await server.ssrLoadModule("/src/services/notificacionesService.js");
  const cambios = crearAvisosCambios([{id: 1, asignatura: "Cálculo", tipo: "AULA", anterior: "101", actual: "102", fecha: "2026-10-10T14:00:00Z"}, {id: 2, asignatura: "Cálculo", tipo: "HORARIO", anterior: "08:00", actual: "09:00", fecha: "2026-10-10T14:00:00Z"}]);
  assert.equal(cambios[0].strTitulo, "Cambió de aula");
  assert.equal(cambios[1].strTitulo, "Cambió de horario");
  assert.ok(cambios[0].strDescripcion.includes("Antes: 101. Ahora: 102."));
  const avisos = crearAvisosExamenes(["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-16", "2026-10-17"].map((strFecha, intId) => ({ intId, strFecha, strNombre: "Materia" })), new Date("2026-10-10T02:00:00Z"));
  assert.equal(avisos.length, 3);
  assert.equal(avisos[0].strTitulo, "Examen hoy");
  assert.equal(avisos[1].strTitulo, "Examen mañana");
  assert.ok(avisos[0].strHace.includes("Horario por confirmar"));
  const { default: Examenes } = await server.ssrLoadModule("/src/pages/examenesHome/Examenes.jsx");
  const htmlExamenes = renderToString(React.createElement(MemoryRouter, null, React.createElement(Examenes)));
  assert.ok(htmlExamenes.includes("Exámenes próximos"));
  assert.ok(!htmlExamenes.includes("/examenes/pasados"));
  const { default: Panel } = await server.ssrLoadModule("/src/pages/admin/AdminDashboard.jsx");
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(Panel)));
  assert.ok(html.includes("Administración de Usuarios y Roles"));
  console.log("OK: tabla vacía, tabla con estudiantes y panel administrador renderizan sin errores.");
} finally {
  await server.close();
}
