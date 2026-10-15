import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { captura, evidencia, iniciarSesionAdmin, tarjetaCargaMasiva } from "../sistema.apoyo.js";

// HU01 · Carga masiva (pruebas de sistema) sobre el sistema publicado.
// Ninguna de estas pruebas guarda datos: no se confirma ninguna carga.

const COLUMNAS = {
  estudiantes: ["CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO"],
  docentes: ["CODSIS", "CORREO", "CI", "APELLIDOS", "NOMBRES", "TELEFONO", "ID_ASIGNATURA", "GRUPO"],
};
const TIPO = { estudiantes: "Estudiantes", docentes: "Docentes" };

/** Columnas que muestra la guía "Formato de subida" (columna Encabezado). */
async function columnasDeLaGuia(page) {
  const tabla = page.locator("table").filter({ hasText: "Encabezado" });
  await expect(tabla).toBeVisible();
  return (await tabla.locator("tbody tr td:nth-child(2)").allTextContents()).map((t) => t.trim());
}

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodificar = (texto) => texto.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTIDADES[e]);

/**
 * Lee los encabezados (primera fila de la primera hoja) de un .xlsx.
 * Un .xlsx es un archivo comprimido con archivos XML adentro: se abre y se lee la fila 1 directamente,
 * así funciona con cualquier programa que haya generado el Excel.
 */
async function encabezadosDelExcel(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const nombres = Object.keys(zip.files);
  const hoja = nombres.filter((n) => /^xl\/worksheets\/[^/]+\.xml$/i.test(n)).sort()[0];
  if (!hoja) return [`(el Excel no tiene hojas; contiene: ${nombres.join(", ")})`];
  const rutaCompartidos = nombres.find((n) => /^xl\/sharedstrings\.xml$/i.test(n));
  const xmlCompartidos = rutaCompartidos ? await zip.file(rutaCompartidos).async("string") : "";
  // Las etiquetas pueden venir con prefijo (por ejemplo <x:row> en lugar de <row>), según el programa que generó el Excel
  const P = "(?:[A-Za-z_][\\w.-]*:)?";
  const etiqueta = (nombre) => new RegExp(`<${P}${nombre}\\b[^>]*>([\\s\\S]*?)<\\/${P}${nombre}>`, "g");
  const primero = (texto, nombre) => { const m = texto.match(new RegExp(etiqueta(nombre).source)); return m ? m[1] : null; };
  const compartidos = [...xmlCompartidos.matchAll(etiqueta("si"))]
    .map((m) => [...m[1].matchAll(etiqueta("t"))].map((t) => t[1]).join(""));
  const xmlHoja = await zip.file(hoja).async("string");
  const filas = [...xmlHoja.matchAll(new RegExp(`<${P}row\\b([^>]*)>([\\s\\S]*?)<\\/${P}row>`, "g"))];
  const fila = filas.find((f) => /\br="1"/.test(f[1])) || filas[0];
  if (!fila) return ["(la primera fila de la plantilla está vacía)"];
  return [...fila[2].matchAll(new RegExp(`<${P}c\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${P}c>)`, "g"))]
    .map(([, atributos, cuerpo = ""]) => {
      if (/\bt="s"/.test(atributos)) {
        const v = primero(cuerpo, "v");
        return v !== null ? compartidos[Number(v)] ?? "" : "";
      }
      return primero(cuerpo, "t") ?? primero(cuerpo, "v") ?? "";
    })
    .map((v) => decodificar(String(v)).trim())
    .filter(Boolean);
}

/** Descarga la plantilla desde la guía y devuelve los encabezados de su primera fila. */
async function columnasDeLaPlantilla(page, testInfo, tipo) {
  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Descargar plantilla de/ }).click(),
  ]);
  const ruta = testInfo.outputPath(`plantilla-${tipo}.xlsx`);
  await descarga.saveAs(ruta);
  await testInfo.attach(`plantilla-${tipo}.xlsx`, { path: ruta });
  // Un Excel (.xlsx) es un archivo comprimido: siempre empieza con las letras "PK"
  const bytes = readFileSync(ruta);
  const inicio = bytes.subarray(0, 40).toString("utf8").replace(/\s+/g, " ");
  if (bytes.subarray(0, 2).toString("latin1") !== "PK") {
    return [`(el archivo descargado NO es un Excel: ${bytes.length} bytes, empieza con "${inicio}")`];
  }
  try {
    return await encabezadosDelExcel(bytes);
  } catch (e) {
    return [`(es un archivo comprimido de ${bytes.length} bytes, pero no se pudo abrir como Excel: ${e.message})`];
  }
}

test.describe("HU01 · Carga masiva (pruebas de sistema)", () => {
  test("TC-110 · La plantilla de Formato tiene las columnas definidas en su orden", async ({ page }, testInfo) => {
    await iniciarSesionAdmin(page);
    const tarjeta = tarjetaCargaMasiva(page);
    const resultado = {};

    for (const tipo of ["estudiantes", "docentes"]) {
      await tarjeta.getByRole("button", { name: TIPO[tipo], exact: true }).click();
      await tarjeta.getByRole("button", { name: "Formato", exact: true }).click();
      const guia = await columnasDeLaGuia(page);
      await captura(page, testInfo, `TC-110-guia-${tipo}`, { fullPage: false });
      let plantilla;
      try {
        plantilla = await columnasDeLaPlantilla(page, testInfo, tipo);
      } catch (e) {
        plantilla = [`(no se pudo leer la plantilla: ${e.message})`];
      }
      await page.getByRole("button", { name: "Entendido" }).click();
      resultado[tipo] = { guia, plantilla };
    }
    await evidencia(testInfo, "TC-110", Object.entries(resultado)
      .map(([tipo, r]) => `${tipo} → guía: [${r.guia.join(", ")}] · plantilla .xlsx: [${r.plantilla.join(", ")}]`).join(" · "));

    for (const tipo of ["estudiantes", "docentes"]) {
      expect.soft(resultado[tipo].guia, `Guía de ${tipo}: columnas y orden`).toEqual(COLUMNAS[tipo]);
      expect.soft(resultado[tipo].plantilla, `Plantilla .xlsx de ${tipo}: columnas y orden`).toEqual(COLUMNAS[tipo]);
    }
  });

  test.describe("En celular", () => {
    test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

    test("TC-111 · La carga se ve completa y sin scroll horizontal en celular", async ({ page }, testInfo) => {
      await iniciarSesionAdmin(page);
      const tarjeta = tarjetaCargaMasiva(page);
      await tarjeta.scrollIntoViewIfNeeded();
      const medir = () => page.evaluate(() => ({
        anchoPagina: document.documentElement.scrollWidth,
        anchoPantalla: window.innerWidth,
      }));
      const borde = async (loc) => {
        const b = await loc.boundingBox({ timeout: 10_000 }).catch(() => null);
        return b ? Math.round(b.x + b.width) : null;
      };

      const pantalla = await medir();
      const bordeTarjeta = await borde(tarjeta);
      const bordeBoton = await borde(page.getByRole("button", { name: /Revisar registros/ }));
      await captura(page, testInfo, "TC-111-carga-celular");

      await tarjeta.getByRole("button", { name: "Formato", exact: true }).click();
      const tabla = page.locator("table").filter({ hasText: "Encabezado" });
      await expect(tabla).toBeVisible();
      const conGuia = await medir();
      const bordeTabla = await borde(tabla);
      await captura(page, testInfo, "TC-111-formato-celular", { fullPage: false });

      await evidencia(testInfo, "TC-111", `Pantalla de 375 px · Carga masiva: ancho de la página ${pantalla.anchoPagina} px, `
        + `borde derecho de la tarjeta ${bordeTarjeta} px, del botón "Revisar registros" ${bordeBoton} px · `
        + `Con "Formato" abierto: ancho de la página ${conGuia.anchoPagina} px, borde derecho de la tabla ${bordeTabla} px`);

      expect.soft(pantalla.anchoPagina, "La carga no debe tener scroll horizontal").toBeLessThanOrEqual(pantalla.anchoPantalla);
      expect.soft(bordeTarjeta, "La tarjeta de carga debe entrar completa en la pantalla").not.toBeNull();
      expect.soft(bordeTarjeta ?? 0, "La tarjeta de carga debe entrar completa en la pantalla").toBeLessThanOrEqual(375);
      expect.soft(bordeBoton, "El botón Revisar registros debe verse").not.toBeNull();
      expect.soft(bordeBoton ?? 0, "El botón Revisar registros debe entrar completo").toBeLessThanOrEqual(375);
      expect.soft(conGuia.anchoPagina, "Con Formato abierto no debe haber scroll horizontal").toBeLessThanOrEqual(conGuia.anchoPantalla);
      expect.soft(bordeTabla ?? 0, "La tabla de Formato debe entrar completa en la pantalla").toBeLessThanOrEqual(375);
    });
  });

  test("TC-112 · Una falla en la carga muestra un mensaje corto sin detalle técnico", async ({ page }, testInfo) => {
    await iniciarSesionAdmin(page);
    const tarjeta = tarjetaCargaMasiva(page);
    await tarjeta.getByRole("button", { name: "Docentes", exact: true }).click(); // en docentes, al elegir el archivo se revisa solo
    const archivo = {
      name: "prueba-qa.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("archivo de prueba QA"),
    };
    const mensaje = tarjeta.locator("p.text-accent-red");
    const TECNICO = /exception|java\.|null|intvalue|internal server|stack|failed to fetch|networkerror|typeerror|load failed|error \d{3}/i;

    // Caso 1: el servidor falla (500), con la misma forma de respuesta que da el backend real.
    // La respuesta se simula en el navegador: el pedido no llega al servidor y no se guarda nada.
    await page.route(/\/api\/usuarios\/carga-masiva/, (r) => r.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        codigo: 500,
        error: "Internal Server Error",
        mensaje: "Ha ocurrido un error inesperado en el servidor: Cannot invoke \"java.lang.Integer.intValue()\" because \"idGrupo\" is null",
        timestamp: new Date().toISOString(),
      }),
    }));
    await tarjeta.getByLabel("Seleccionar archivo de usuarios").setInputFiles(archivo);
    await expect(mensaje).toBeVisible();
    const textoServidor = (await mensaje.textContent()).trim();
    await mensaje.scrollIntoViewIfNeeded(); // la captura muestra la parte de la pantalla donde está el mensaje
    await captura(page, testInfo, "TC-112-falla-servidor", { fullPage: false });
    await page.unroute(/\/api\/usuarios\/carga-masiva/);

    // Caso 2: sin conexión con el servidor
    await page.route(/\/api\/usuarios\/carga-masiva/, (r) => r.abort("failed"));
    await tarjeta.getByLabel("Seleccionar archivo de usuarios").setInputFiles(archivo);
    await expect(mensaje).toBeVisible();
    await expect(mensaje).not.toHaveText(textoServidor);
    const textoSinRed = (await mensaje.textContent()).trim();
    await mensaje.scrollIntoViewIfNeeded();
    await captura(page, testInfo, "TC-112-sin-conexion", { fullPage: false });

    await evidencia(testInfo, "TC-112", `Falla del servidor (500) → mensaje: "${textoServidor}" (${textoServidor.length} caracteres) · `
      + `Sin conexión → mensaje: "${textoSinRed}" (${textoSinRed.length} caracteres)`);

    for (const [caso, texto] of [["Falla del servidor", textoServidor], ["Sin conexión", textoSinRed]]) {
      expect.soft(texto, `${caso}: el mensaje no debe tener detalle técnico`).not.toMatch(TECNICO);
      expect.soft(texto.length, `${caso}: el mensaje debe ser corto (hasta 120 caracteres)`).toBeLessThanOrEqual(120);
    }
  });
});