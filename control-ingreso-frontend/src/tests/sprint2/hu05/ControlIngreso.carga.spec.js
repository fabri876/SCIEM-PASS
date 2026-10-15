import { test, expect } from "@playwright/test";
import { abrirPantalla, captura, evidencia } from "../sistema.apoyo.js";

// HU05 · Control de ingreso (pruebas de carga) sobre el sistema publicado.
// Examen de prueba: ARQUITECTURA DE COMPUTADORAS I · Segundo parcial (de hoy).
// Lo que se guarda: TC-296 → 1 ingreso (y quizás 1 intento rechazado);
// TC-297 → 5 intentos rechazados ("ya registrado") de estudiantes de prueba.

const MATERIA = /arquitectura de computadoras/i;
const TIPO = /segundo parcial/i;
// TC-296: estudiante habilitado y sin ingreso (Joaquín Mamani Lara)
const ESTUDIANTE_TC296 = "74512306";
// TC-297: estudiantes de prueba que YA ingresaron (no se vuelven a registrar)
const YA_INGRESARON = ["74512301", "74512302", "74512303", "74512305", "74512308"];
const INEXISTENTE = "99999999";
const TITULOS = /^(INGRESO PERMITIDO|YA REGISTRADO|ESTUDIANTE NO ENCONTRADO|ESTUDIANTE INHABILITADO|NO INSCRITO EN ESTE EXAMEN|INGRESO A UN AMBIENTE DIFERENTE|NO PERTENECE A TU FILA|QR INVÁLIDO|INGRESO DENEGADO)$/;

/** Inicia sesión con la cuenta del docente (sus datos se leen de la terminal). */
async function iniciarSesionDocente(page) {
    const correo = process.env.QA_DOCENTE_CORREO;
    const password = process.env.QA_DOCENTE_PASSWORD;
    if (!correo || !password) throw new Error("Faltan las variables QA_DOCENTE_CORREO y QA_DOCENTE_PASSWORD en la terminal.");
    await abrirPantalla(page, "/login");
    await page.getByLabel("Correo").fill(correo);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: /Iniciar sesión/ }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Desde el Inicio del docente entra al control de ingreso del examen de prueba (modo Ingreso manual). */
async function abrirControl(page) {
    const tarjeta = page.locator("div")
        .filter({ hasText: MATERIA })
        .filter({ hasText: TIPO })
        .filter({ has: page.getByRole("button", { name: /Control de ingreso/ }) })
        .last();
    await tarjeta.getByRole("button", { name: /Control de ingreso/ }).click();
    await expect(page.getByRole("heading", { name: "Verificación de ingreso" })).toBeVisible();
    await page.getByRole("button", { name: "Ingreso manual" }).click();
    await expect(page.getByLabel("C.I. o Código SIS del estudiante")).toBeVisible();
}

/** Lee el resultado de la verificación: el título de la tarjeta o el mensaje de error. */
async function leerResultado(page, espera = 30_000) {
    const titulo = page.getByText(TITULOS);
    const alerta = page.locator("section[aria-labelledby='ci-t-verificacion'] [role='alert']");
    await expect(titulo.or(alerta).first()).toBeVisible({ timeout: espera });
    if (await titulo.count()) return (await titulo.first().textContent()).trim();
    return `MENSAJE: ${(await alerta.first().textContent()).trim()}`;
}

/** Cuántas veces aparece ese C.I. en "Últimos ingresos". */
async function vecesEnUltimos(page, ci) {
    const texto = (await page.locator("section[aria-labelledby='ci-t-ultimos']").textContent()) || "";
    return texto.split(`C.I. ${ci}`).length - 1;
}

test.describe("HU05 · Control de ingreso (pruebas de carga)", () => {
    test("TC-296 · Dos operadores a la vez registran al estudiante solo una vez", async ({ page, browser }, testInfo) => {
        // Operador 1: esta ventana · Operador 2: otro navegador independiente (otra sesión)
        const otroContexto = await browser.newContext({ baseURL: testInfo.project.use.baseURL, locale: "es-BO" });
        const operador2 = await otroContexto.newPage();
        await Promise.all([iniciarSesionDocente(page), iniciarSesionDocente(operador2)]);
        await Promise.all([abrirControl(page), abrirControl(operador2)]);
        const ci = ESTUDIANTE_TC296;

        // Los dos escriben el mismo C.I. y presionan "Verificar ingreso" en el mismo instante
        await page.getByLabel("C.I. o Código SIS del estudiante").fill(ci);
        await operador2.getByLabel("C.I. o Código SIS del estudiante").fill(ci);
        const boton1 = page.getByRole("button", { name: "Verificar ingreso" });
        const boton2 = operador2.getByRole("button", { name: "Verificar ingreso" });
        const tiempos = await Promise.all([
            boton1.click().then(() => Date.now()),
            boton2.click().then(() => Date.now()),
        ]);
        const [r1, r2] = await Promise.all([leerResultado(page), leerResultado(operador2)]);
        await captura(page, testInfo, "TC-296-operador-1", { fullPage: false });
        await captura(operador2, testInfo, "TC-296-operador-2", { fullPage: false });
        if (r1 === "YA REGISTRADO" && r2 === "YA REGISTRADO") {
            throw new Error(`El C.I. ${ci} ya había ingresado antes de la prueba: cambia ESTUDIANTE_TC296 por "74512307".`);
        }

        // Se espera a que el ingreso figure en "Últimos ingresos" y se cuentan las apariciones
        await expect.poll(() => vecesEnUltimos(page, ci), { timeout: 30_000 }).toBeGreaterThan(0);
        await page.waitForTimeout(6_000); // una vuelta más de la actualización automática (cada 5 s)
        const veces1 = await vecesEnUltimos(page, ci);
        const veces2 = await vecesEnUltimos(operador2, ci);
        await captura(page, testInfo, "TC-296-ultimos-ingresos", { fullPage: false });
        await otroContexto.close();

        const permitidos = [r1, r2].filter((r) => r === "INGRESO PERMITIDO").length;
        const otro = r1 === "INGRESO PERMITIDO" ? r2 : r1;
        await evidencia(testInfo, "TC-296",
            `C.I. ${ci} verificado por 2 operadores a la vez (diferencia entre clics: ${Math.abs(tiempos[0] - tiempos[1])} ms) · `
            + `Operador 1: "${r1}" · Operador 2: "${r2}" · "INGRESO PERMITIDO" salió ${permitidos} vez/veces · `
            + `En "Últimos ingresos" aparece ${veces1} vez/veces (operador 1) y ${veces2} vez/veces (operador 2)`);

        expect(permitidos, "Solo uno de los dos debe registrar el ingreso").toBe(1);
        expect(veces1, "El estudiante debe aparecer una sola vez en Últimos ingresos").toBe(1);
        expect(veces2, "El estudiante debe aparecer una sola vez en Últimos ingresos (operador 2)").toBe(1);
        expect.soft(otro, "Al otro operador se le debe avisar que el estudiante ya está registrado").toBe("YA REGISTRADO");
    });

    test("TC-297 · Con varios usuarios la verificación responde en menos de 2 s", async ({ page }, testInfo) => {
        await iniciarSesionDocente(page);
        await abrirControl(page);

        // Se toma una verificación real (C.I. inexistente: no guarda nada) como modelo del pedido
        const pedidoModelo = page.waitForRequest((r) => r.method() === "POST" && r.url().includes("/api/v1/control/ingresos"));
        await page.getByLabel("C.I. o Código SIS del estudiante").fill(INEXISTENTE);
        await page.getByRole("button", { name: "Verificar ingreso" }).click();
        const modelo = await pedidoModelo;
        await leerResultado(page);
        const url = modelo.url();
        const autorizacion = (await modelo.allHeaders()).authorization;
        const cuerpo = modelo.postDataJSON();

        // 10 usuarios a la vez: 5 con un C.I. que no existe y 5 con estudiantes que ya ingresaron
        const identificadores = [...Array(5).fill(INEXISTENTE), ...YA_INGRESARON];
        const resultados = await Promise.all(identificadores.map(async (identificador, i) => {
            const inicio = Date.now();
            const resp = await page.request.post(url, {
                headers: { Authorization: autorizacion, "Content-Type": "application/json" },
                data: { ...cuerpo, identificador },
                timeout: 60_000,
            });
            const ms = Date.now() - inicio;
            const json = await resp.json().catch(() => ({}));
            const estado = json.resultado || json.estado || json.mensaje || "";
            return { usuario: i + 1, identificador, status: resp.status(), estado: String(estado), ms };
        }));
        await captura(page, testInfo, "TC-297-control", { fullPage: false });

        const tiempos = resultados.map((r) => r.ms);
        const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        const maximo = Math.max(...tiempos);
        const lentas = resultados.filter((r) => r.ms >= 2000);
        const errores = resultados.filter((r) => r.status >= 500);
        await evidencia(testInfo, "TC-297",
            `10 verificaciones a la vez · ` + resultados.map((r) => `Usuario ${r.usuario} (C.I. ${r.identificador}): ${r.status} ${r.estado} en ${(r.ms / 1000).toFixed(2)} s`).join(" | ")
            + ` · Promedio: ${(promedio / 1000).toFixed(2)} s · Más lenta: ${(maximo / 1000).toFixed(2)} s · `
            + `Respuestas de 2 s o más: ${lentas.length} · Errores del servidor (500): ${errores.length}`);

        expect(errores.length, "Ninguna verificación debe fallar con error del servidor").toBe(0);
        expect(maximo, "Cada verificación debe responder en menos de 2 s").toBeLessThan(2000);
    });
});