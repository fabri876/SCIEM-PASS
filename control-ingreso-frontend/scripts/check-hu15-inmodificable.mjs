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
    exportarRegistroCompletoCsv,
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
  const accionOriginal = "Prueba ficticia · ñ";
  const anterior = "0".repeat(64);
  const bloqueReal = { idBloque: 42, secuenciaSello: "7", usuarioIdSello: 3,
    fechaSello: "2026-11-12 10:20:30.123456", accionSello: accionOriginal,
    hashBloqueAnterior: anterior, estadoIntegridad: "VALIDO" };
  const canonico = `HU15-V1|7|${anterior}|42|V3|V2026-11-12 10:20:30.123456|V${Buffer.from(accionOriginal, "utf8").toString("base64")}`;
  bloqueReal.selloSha256 = await calcularSha256(canonico);
  // Vector ficticio calculado independientemente por hu15_hash_evento en PostgreSQL.
  assert.equal(bloqueReal.selloSha256, "7b576ce64c334d8665f848bcf0b3ea687d878eba1c1a4212c8dc007ea75ea5b1");
  assert.equal((await verificarIntegridadBloque(bloqueReal)).esValido, true);
  assert.equal((await verificarIntegridadBloque({ ...bloqueReal, accionSello: "alterado" })).esValido, false);
  assert.equal((await verificarIntegridadBloque({ ...bloqueReal, estadoIntegridad: "ALTERADO" })).esValido, false);
  const bloqueNulo = { ...bloqueReal, usuarioIdSello: null, fechaSello: null, accionSello: null,
    selloSha256: "e770d797d7cb58826e9089e19fd99eff7c81f2fafaa6d3fa202db01165096463" };
  assert.equal((await verificarIntegridadBloque(bloqueNulo)).esValido, true);
  const resCadena = await verificarCadenaCompleta([]);
  assert.equal(resCadena.esValido, false);
  assert.ok(urls.some((url) => url.includes("/historial-inmodificable/verificar")));
  await listarHistorialInmodificable({ modulo: "USUARIOS", ejecutor: "ficticio", fechaInicio: "2026-11-01", fechaFin: "2026-11-09" });
  assert.ok(urls.at(-1).includes("fechaInicio=2026-11-01") && urls.at(-1).includes("fechaFin=2026-11-09"));
  let descargado = false;
  const originalCrear = URL.createObjectURL;
  const originalRevocar = URL.revokeObjectURL;
  URL.createObjectURL = () => "blob:prueba";
  URL.revokeObjectURL = () => {};
  globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, click() { descargado = true; } }),
    body: { appendChild() {}, removeChild() {} } };
  try {
    globalThis.fetch = async (url) => { urls.push(String(url)); return { ok: true, status: 200, blob: async () => new Blob(["csv"]) }; };
    await exportarRegistroCompletoCsv({ modulo: "USUARIOS", fechaInicio: "2026-11-01" });
    assert.ok(descargado && urls.at(-1).includes("/exportar?") && urls.at(-1).includes("fechaInicio=2026-11-01"));
    descargado = false;
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ mensaje: "Error de auditoría" }) });
    await assert.rejects(exportarRegistroCompletoCsv({}), /Error de auditoría/);
    assert.equal(descargado, false);
  } finally {
    URL.createObjectURL = originalCrear; URL.revokeObjectURL = originalRevocar; delete globalThis.document;
  }
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
  assert.ok(html.includes("auditoria-fecha-inicio") && html.includes("auditoria-fecha-fin"));
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
