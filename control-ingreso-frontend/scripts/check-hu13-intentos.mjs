import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const React = require("react");
const { renderToString } = require("react-dom/server");
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);

// Mock de localStorage
const valoresStorage = new Map([
  ["token", "token-docente-hu13-test"],
  ["usuario", JSON.stringify({ idUsuario: 2, nombre: "Dra. Ana Rocha", rol: "DOCENTE" })],
  ["ultimaActividad", String(Date.now())],
]);

globalThis.localStorage = {
  getItem: (k) => valoresStorage.get(k) ?? null,
  setItem: (k, v) => valoresStorage.set(k, v),
  removeItem: (k) => valoresStorage.delete(k),
};

globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
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
  console.log("1. Probando servicios y lógica estadística de HU13...");
  const {
    DATOS_SEMILLA_INTENTOS,
    calcularEstadisticasIntentos,
    listarReporteIntentosIncorrectos,
  } = await server.ssrLoadModule("/src/services/reporteIntentosService.js");

  // Verificar semillas de datos
  assert.ok(DATOS_SEMILLA_INTENTOS.length >= 5, "Debe tener al menos 5 registros de prueba representativos del mockup");
  console.log(`   ✓ Disponibles ${DATOS_SEMILLA_INTENTOS.length} registros semilla para pruebas`);

  // Verificar cálculo de métricas KPIs (Criterios 14 al 20)
  const stats = calcularEstadisticasIntentos(DATOS_SEMILLA_INTENTOS);
  assert.equal(stats.totalIntentos, DATOS_SEMILLA_INTENTOS.length);
  assert.ok(stats.examenIncorrecto > 0, "Debe contabilizar examen incorrecto");
  assert.ok(stats.aulaDiferente > 0, "Debe contabilizar aula diferente");
  assert.ok(stats.duplicadosBloqueados > 0, "Debe contabilizar duplicados bloqueados");
  assert.ok(stats.porcentajeExamenInc > 0, "Debe calcular porcentaje correcto");
  console.log("   ✓ Cálculo de estadísticas y KPIs oficiales correcto:", stats);

  // El servicio depende del backend; no debe fabricar datos cuando está vacío.
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return { ok: true, status: 200, json: async () => [] };
  };
  assert.deepEqual(await listarReporteIntentosIncorrectos(), []);

  // Los filtros se envían al servidor, no se aplican sobre datos ficticios.
  const filtradosExamen = await listarReporteIntentosIncorrectos({ motivo: "EXAMEN_INCORRECTO" });
  assert.deepEqual(filtradosExamen, []);
  assert.ok(urls.at(-1).includes("motivo=EXAMEN_INCORRECTO"));
  console.log(`   ✓ Filtrado por motivo EXAMEN_INCORRECTO: ${filtradosExamen.length} registros`);

  // Probar filtrado por fecha
  const filtradosFecha = await listarReporteIntentosIncorrectos({ fecha: "2026-10-28" });
  assert.deepEqual(filtradosFecha, []);
  assert.ok(urls.at(-1).includes("fecha=2026-10-28"));
  console.log(`   ✓ Filtrado por fecha 2026-10-28: ${filtradosFecha.length} registros`);

  // Probar búsqueda de texto por estudiante
  const filtradosBusqueda = await listarReporteIntentosIncorrectos({ busqueda: "Arce Valdivia" });
  assert.deepEqual(filtradosBusqueda, []);
  assert.ok(urls.at(-1).includes("busqueda=Arce+Valdivia"));
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ mensaje: "Error de prueba" }) });
  await assert.rejects(listarReporteIntentosIncorrectos(), /Error de prueba/);
  console.log("   ✓ Resultados vacíos y errores no generan datos de demostración");

  console.log("2. Probando renderizado del componente SeccionReporteIntentosIncorrectos...");
  const { default: SeccionReporteIntentosIncorrectos } = await server.ssrLoadModule(
    "/src/components/reportes/SeccionReporteIntentosIncorrectos.jsx"
  );

  const html = renderToString(React.createElement(SeccionReporteIntentosIncorrectos, { strRol: "DOCENTE" }));

  assert.ok(
    html.includes("Reporte de Estudiantes con Intentos de Ingreso Incorrectos"),
    "Debe contener el título oficial de HU13"
  );
  assert.ok(
    html.includes("Descargar Reporte Oficial (PDF)"),
    "Debe contener botón de descarga PDF"
  );
  assert.ok(
    html.includes("Exportar a Excel (CSV)"),
    "Debe contener botón de exportación CSV/Excel"
  );
  assert.ok(
    html.includes("Filtros de Búsqueda y Generación"),
    "Debe contener la sección de filtros"
  );
  assert.ok(
    html.includes("Total Intentos Incorrectos"),
    "Debe contener KPI de total intentos"
  );
  assert.ok(
    html.includes("Examen Incorrecto (HU-09)"),
    "Debe contener KPI de examen incorrecto"
  );
  assert.ok(
    html.includes("Aula Diferente (HU-18)"),
    "Debe contener KPI de aula diferente"
  );
  assert.ok(
    html.includes("Duplicados Bloqueados"),
    "Debe contener KPI de duplicados"
  );
  assert.ok(
    html.includes("Detalle Nominal de Intentos Incorrectos"),
    "Debe contener la tabla de detalle nominal"
  );

  console.log("   ✓ Componente SeccionReporteIntentosIncorrectos renderiza todos los elementos requeridos");

  console.log("\n=======================================================");
  console.log("✅ TODAS LAS PRUEBAS DE HU13 FRONTEND PASARON CON ÉXITO");
  console.log("=======================================================");
} finally {
  await server.close();
}

