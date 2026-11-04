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
  console.log("1. Probando servicios criptográficos y encadenamiento SHA-256...");
  const {
    calcularSha256,
    obtenerTextoCanonicoBloque,
    generarBloquesSemilla,
    verificarIntegridadBloque,
    verificarCadenaCompleta,
  } = await server.ssrLoadModule("/src/services/historialInmodificableService.js");

  // Prueba de hash SHA-256
  const hashTest = await calcularSha256("SCIEM_PASS_FORENSIC_CHAIN");
  assert.equal(typeof hashTest, "string");
  assert.equal(hashTest.length, 64);
  console.log("   ✓ Cálculo SHA-256 correcto (longitud 64 hex):", hashTest.slice(0, 16) + "...");

  // Prueba de encadenamiento con bloques semilla
  const bloques = await generarBloquesSemilla();
  assert.ok(bloques.length >= 7, "Debe generar al menos 7 bloques de prueba forense");
  console.log(`   ✓ Generados ${bloques.length} bloques con encadenamiento SHA-256`);

  // Verificar integridad individual de cada bloque
  for (const b of bloques) {
    const res = await verificarIntegridadBloque(b);
    assert.equal(res.esValido, true, `El bloque #${b.idBloque} debe tener un sello válido`);
  }
  console.log("   ✓ Todos los bloques individuales tienen sellos criptográficos válidos");

  // Verificar la cadena completa
  const resCadena = await verificarCadenaCompleta(bloques);
  assert.equal(resCadena.esValido, true, "La cadena completa debe ser 100% íntegra");
  console.log("   ✓ Cadena completa verificada con éxito:", resCadena.mensaje);

  // Probar detección de manipulación / alteración maliciosa (Criterio 18)
  const bloquesAlterados = JSON.parse(JSON.stringify(bloques));
  bloquesAlterados[2].detalles = "Texto modificado de forma maliciosa en la base de datos";
  const resAlterado = await verificarIntegridadBloque(bloquesAlterados[2]);
  assert.equal(resAlterado.esValido, false, "Debe detectar que el hash fue violado");
  console.log("   ✓ Detección de alteración de bloque exitosa:", resAlterado.motivo);

  // Probar detección de eslabón roto en la cadena (Criterio 19)
  const resCadenaRota = await verificarCadenaCompleta(bloquesAlterados);
  assert.equal(resCadenaRota.esValido, false, "Debe detectar la ruptura de la cadena");
  console.log("   ✓ Detección de ruptura en cadena exitosa:", resCadenaRota.motivo);

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
    html.includes("WORM"),
    "Debe contener mención de almacenamiento WORM"
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
  console.log("✅ TODAS LAS PRUEBAS DE HU15 FRONTEND PASARON CON ÉXITO");
  console.log("=======================================================");
} finally {
  await server.close();
}
