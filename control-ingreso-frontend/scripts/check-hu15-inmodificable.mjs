import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const React = require("react");
const { renderToString } = require("react-dom/server");
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);

// Mock de localStorage para la sesión del Administrador
const valoresStorage = new Map([
  ["token", "token-admin-hu15-test"],
  ["usuario", JSON.stringify({ idUsuario: 1, nombre: "Admin Forense", rol: "ADMINISTRADOR", correo: "adm@umss.edu" })],
  ["ultimaActividad", String(Date.now())],
]);

globalThis.localStorage = {
  getItem: (k) => valoresStorage.get(k) ?? null,
  setItem: (k, v) => valoresStorage.set(k, v),
  removeItem: (k) => valoresStorage.delete(k),
};

globalThis.sessionStorage = {
  getItem: (k) => null,
  setItem: (k, v) => {},
  removeItem: (k) => {},
};

// Plugin SSR para Vite
const pwaSsr = {
  name: "pwa-ssr-render-check",
  resolveId(id) {
    if (id === "virtual:pwa-register") return "\0pwa-ssr-render-check";
  },
  load(id) {
    if (id === "\0pwa-ssr-render-check")
      return "export const registerSW = () => async () => {};";
  },
};

const server = await createServer({
  root,
  configFile: false,
  define: { "import.meta.env.DEV": false },
  plugins: [pwaSsr],
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});

try {
  console.log("1. Probando consulta y verificación del historial...");
  const {
    calcularSha256,
    listarHistorialInmodificable,
    verificarIntegridadBloque,
    verificarCadenaCompleta,
  } = await server.ssrLoadModule("/src/services/historialInmodificableService.js");

  // Prueba de hash SHA-256
  const hashTest = await calcularSha256("SCIEM_PASS_FORENSIC_CHAIN");
  assert.equal(typeof hashTest, "string");
  assert.equal(hashTest.length, 64);
  console.log("   ✓ Cálculo SHA-256 correcto (longitud 64 hex):", hashTest.slice(0, 16) + "...");

  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => String(url).includes("/verificar")
        ? { esValido: false, mensaje: "Sin punto de control externo" }
        : [],
    };
  };
  assert.deepEqual(await listarHistorialInmodificable(), [], "Una lista vacía no debe contener datos ficticios");
  const sinSello = await verificarIntegridadBloque({ idBloque: 1 });
  assert.equal(sinSello.esValido, false, "Un evento sin sello no es verificable");
  const resCadena = await verificarCadenaCompleta([]);
  assert.equal(resCadena.esValido, false);
  assert.ok(urls.some((url) => url.includes("/historial-inmodificable/verificar")));
  console.log("   ✓ Sin registros ficticios; la verificación completa consulta al backend");

  console.log("2. Probando renderizado del componente HistorialInmodificable...");
  const { default: HistorialInmodificable } = await server.ssrLoadModule(
    "/src/pages/admin/components/HistorialInmodificable.jsx"
  );

  const html = renderToString(React.createElement(HistorialInmodificable));

  assert.ok(
    html.includes("Historial Inmodificable de las Operaciones del Sistema"),
    "Debe contener el título oficial de HU15"
  );
  assert.ok(
    !html.includes("WORM Activo"),
    "No debe afirmar que WORM está activo sin verificar la configuración"
  );
  assert.ok(
    html.includes("Exportar Registro Completo (CSV)"),
    "Debe contener el botón de exportación CSV oficial"
  );
  assert.ok(
    html.includes("Verificar Cadena Completa"),
    "Debe contener el botón de verificación completa"
  );
  assert.ok(
    html.includes("Filtros de Búsqueda y Generación"),
    "Debe contener la sección de filtros forenses"
  );
  assert.ok(
    html.includes("Módulo del Sistema"),
    "Debe contener el selector de módulo"
  );
  assert.ok(
    html.includes("Aplicar Filtros Forenses"),
    "Debe contener el botón Aplicar Filtros Forenses"
  );
  assert.ok(
    html.toUpperCase().includes("REGISTRO DE EVENTOS Y BLOQUES CRIPTOGRÁFICOS"),
    "Debe contener la tabla de eventos"
  );

  console.log("   ✓ El componente HistorialInmodificable renderiza todos los elementos requeridos");

  console.log("\n=======================================================");
  console.log("✅ COMPROBACIONES BÁSICAS DE HU15 FRONTEND COMPLETADAS");
  console.log("=======================================================");
} finally {
  await server.close();
}
