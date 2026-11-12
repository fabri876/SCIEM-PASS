import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const React = require("react");
const { renderToString } = require("react-dom/server");
const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
const server = await createServer({ root, configFile: false, server: { middlewareMode: true, watch: null }, appType: "custom" });
try {
  const { default: Tarjeta } = await server.ssrLoadModule("/src/pages/control/ingreso/componentes/TarjetaResultado.jsx");
  const html = renderToString(React.createElement(Tarjeta, {
    onCerrar: () => {}, onRegistrarIncidencia: () => {},
    objResultado: {
      resultado: "EXAMEN_INCORRECTO", intentoRegistrado: true,
      estudiante: { nombres: "Persona ficticia", sis: "123456", ci: "654321", carrera: "Ingenieria de Sistemas" },
      otroExamen: { asignatura: "Materia", nombre: "Parcial", grupo: "A", aula: "Aula 9", edificio: "Edificio A", hora: "09:00 - 11:00" },
    },
  }));
  for (const texto of ["EXAMEN INCORRECTO", "INTENTO REGISTRADO EN AUDITORÍA", "ORIENTACIÓN DE REUBICACIÓN", "Materia", "Edificio A", "Registrar incidencia", "Aceptar y continuar"]) {
    assert.ok(html.includes(texto), `Falta ${texto}`);
  }
  const sinConfirmacion = renderToString(React.createElement(Tarjeta, {
    onCerrar: () => {}, objResultado: { resultado: "EXAMEN_INCORRECTO", intentoRegistrado: false },
  }));
  assert.ok(html.includes("Ingenieria de Sistemas"), "Debe mostrar la carrera registrada");
  assert.ok(!sinConfirmacion.includes("INTENTO REGISTRADO EN AUDITORÍA"));
  const sinNomina = renderToString(React.createElement(Tarjeta, {
    onCerrar: () => {}, objResultado: { resultado: "NO_EN_NOMINA_OFFLINE", valor: "123456" },
  }));
  assert.ok(sinNomina.includes("NO ENCONTRADO EN LA NÓMINA"));
  assert.ok(sinNomina.includes("El intento no fue registrado en auditoría"));
  assert.ok(!sinNomina.includes("EL DATO NO EXISTE EN EL SISTEMA"));
  const qrSinNomina = renderToString(React.createElement(Tarjeta, {
    onCerrar: () => {}, objResultado: { resultado: "NO_EN_NOMINA_OFFLINE", metodo: "QR", valor: "QR-SENSIBLE-FICTICIO" },
  }));
  assert.ok(qrSinNomina.includes("el código QR"));
  assert.ok(!qrSinNomina.includes("QR-SENSIBLE-FICTICIO"));
  const confirmado = renderToString(React.createElement(Tarjeta, {
    onCerrar: () => {}, objResultado: { resultado: "EXAMEN_INCORRECTO_OFFLINE", estadoSync: "sincronizado" },
  }));
  assert.ok(confirmado.includes("SINCRONIZADO · INTENTO REGISTRADO EN AUDITORÍA"));
  console.log("HU09: resultado, orientacion, acciones y confirmacion condicionada verificados");
} finally { await server.close(); }
