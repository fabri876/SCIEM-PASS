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

const server = await createServer({ root, configFile: false, server: { middlewareMode: true, watch: null }, appType: "custom" });
try {
  const { default: Tabla } = await server.ssrLoadModule("/src/pages/admin/components/UserTableCard.jsx");
  for (const usuarios of [[], [{ idUsuario: 4, nombre: "Estudiante", apellido: "Prueba", rol: "ESTUDIANTE", estado: true }]]) {
    const html = renderToString(React.createElement(Tabla, { usuarios, onEliminar: async () => {} }));
    assert.ok(html.includes("Administración de Usuarios y Roles"));
    if (usuarios.length) assert.ok(html.includes("Eliminar usuario"));
  }
  const { default: Panel } = await server.ssrLoadModule("/src/pages/admin/AdminDashboard.jsx");
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(Panel)));
  assert.ok(html.includes("Administración de Usuarios y Roles"));
  console.log("OK: tabla vacía, tabla con estudiantes y panel administrador renderizan sin errores.");
} finally {
  await server.close();
}
