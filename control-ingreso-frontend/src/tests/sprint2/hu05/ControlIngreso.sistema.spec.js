import { test, expect } from "@playwright/test";
import { abrirPantalla, captura, evidencia } from "../sistema.apoyo.js";

// HU05 · Control de ingreso (pruebas de sistema) sobre el sistema publicado.
// Estas pruebas usan un operador SIN exámenes asignados: no registran nada.

/** Inicia sesión con el operador sin asignaciones (sus datos se leen de la terminal). */
async function iniciarSesionOperadorLibre(page) {
    const correo = process.env.QA_OPERADOR_LIBRE_CORREO;
    const password = process.env.QA_OPERADOR_LIBRE_PASSWORD;
    if (!correo || !password) {
        throw new Error("Faltan las variables QA_OPERADOR_LIBRE_CORREO y QA_OPERADOR_LIBRE_PASSWORD en la terminal.");
    }
    await abrirPantalla(page, "/login");
    await page.getByLabel("Correo").fill(correo);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: /Iniciar sesión/ }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/control"));
    await expect(page.getByText(/Cargando exámenes/)).toHaveCount(0);
}

test.describe("HU05 · Control de ingreso (pruebas de sistema)", () => {
    test("TC-115 · El indicador cambia a Sin red al perder internet y vuelve a En línea", async ({ page, context }, testInfo) => {
        await iniciarSesionOperadorLibre(page);
        const enLinea = page.getByText("En línea", { exact: true });
        const sinRed = page.getByText(/^Sin red/);

        await expect(enLinea).toBeVisible();
        const antes = (await enLinea.textContent()).trim();
        await captura(page, testInfo, "TC-115-en-linea", { fullPage: false });

        await context.setOffline(true); // se corta el internet del navegador
        await expect(sinRed.first()).toBeVisible();
        const sinConexion = (await sinRed.first().textContent()).trim();
        await captura(page, testInfo, "TC-115-sin-red", { fullPage: false });

        await context.setOffline(false); // vuelve el internet
        await expect(enLinea).toBeVisible();
        const despues = (await enLinea.textContent()).trim();
        await captura(page, testInfo, "TC-115-de-nuevo-en-linea", { fullPage: false });

        await evidencia(testInfo, "TC-115", `Con internet: "${antes}" · Se corta el internet: "${sinConexion}" · `
            + `Vuelve el internet: "${despues}"`);
        expect(antes).toBe("En línea");
        expect(sinConexion).toMatch(/^Sin red/);
        expect(despues).toBe("En línea");
    });

    test("TC-117 · Sin exámenes asignados sale el aviso y no se puede verificar", async ({ page }, testInfo) => {
        await iniciarSesionOperadorLibre(page);
        const aviso = page.getByText("No tienes exámenes asignados");
        await expect(aviso).toBeVisible();
        const detalle = (await page.getByText(/Cuando te asignen el control de un examen/).textContent().catch(() => "")).trim();
        const botonesEntrar = await page.getByRole("button", { name: /Registrar ingreso|Ver ingresos/ }).count();
        const estacion = await page.getByRole("heading", { name: "Verificación de ingreso" }).count();
        const campoDocumento = await page.getByLabel("C.I. o Código SIS del estudiante").count();
        await captura(page, testInfo, "TC-117-sin-examenes");

        await evidencia(testInfo, "TC-117", `Aviso: "No tienes exámenes asignados" · "${detalle}" · Botones para entrar a un examen: ${botonesEntrar} · `
            + `Sección "Verificación de ingreso": ${estacion} · Campo para escribir C.I. o SIS: ${campoDocumento}`);
        expect(botonesEntrar, "No debe haber exámenes a los que entrar").toBe(0);
        expect(estacion, "No debe aparecer la verificación de ingreso").toBe(0);
        expect(campoDocumento, "No debe poder escribirse un C.I. o SIS").toBe(0);
    });
});