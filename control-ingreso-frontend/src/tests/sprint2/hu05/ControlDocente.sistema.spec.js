import { test, expect, chromium, firefox, webkit } from "@playwright/test";
import { abrirPantalla, captura, evidencia } from "../sistema.apoyo.js";

// HU05 · Control de ingreso del DOCENTE (pruebas de sistema) sobre el sistema publicado.
// Examen de prueba: ARQUITECTURA DE COMPUTADORAS I · Segundo parcial (de hoy).
// Lo único que se guarda de verdad: ingresos de estudiantes de prueba (TC-113, TC-114 y quizás TC-116).
// TC-116 corta el internet del navegador; TC-118, TC-119 y TC-120 solo consultan.

const MATERIA = /arquitectura de computadoras/i;
const TIPO = /segundo parcial/i;
// C.I. de los estudiantes de prueba habilitados en ese examen (TC-113 y TC-114 usan el primero libre)
const ESTUDIANTES = ["74512301", "74512302", "74512303", "74512305", "74512306", "74512307"];
// Reservado para TC-116 (no lo usan las demás pruebas)
const ESTUDIANTE_SIN_RED = "74512308";
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

/** Tarjeta del examen de prueba en el Inicio del docente. */
function tarjetaExamen(page) {
    return page.locator("div")
        .filter({ hasText: MATERIA })
        .filter({ hasText: TIPO })
        .filter({ has: page.getByRole("button", { name: /Control de ingreso/ }) })
        .last();
}

/** Desde el Inicio del docente entra al control de ingreso del examen de prueba. */
async function abrirControl(page) {
    await tarjetaExamen(page).getByRole("button", { name: /Control de ingreso/ }).click();
    await expect(page.getByRole("heading", { name: "Verificación de ingreso" })).toBeVisible();
    await page.getByRole("button", { name: "Ingreso manual" }).click();
    await expect(page.getByLabel("C.I. o Código SIS del estudiante")).toBeVisible();
}

/** Verifica un C.I. con "Ingreso manual" y devuelve el título de la tarjeta o el mensaje de error. */
async function verificar(page, ci, espera = 20_000) {
    const campo = page.getByLabel("C.I. o Código SIS del estudiante");
    await campo.fill(ci);
    await page.getByRole("button", { name: "Verificar ingreso" }).click();
    const titulo = page.getByText(TITULOS);
    const alerta = page.locator("section[aria-labelledby='ci-t-verificacion'] [role='alert']");
    await expect(titulo.or(alerta).first()).toBeVisible({ timeout: espera });
    if (await titulo.count()) return (await titulo.first().textContent()).trim();
    return `MENSAJE: ${(await alerta.first().textContent()).trim()}`;
}

async function cerrarTarjeta(page) {
    const cerrar = page.getByRole("button", { name: "Cerrar tarjeta" });
    if (await cerrar.count()) await cerrar.first().click();
}

/** Registra el ingreso del primer estudiante de prueba que todavía no ingresó. Devuelve { ci, inicio }. */
async function registrarSiguiente(page) {
    const vistos = [];
    for (const ci of ESTUDIANTES) {
        const inicio = Date.now();
        const r = await verificar(page, ci);
        const confirmado = Date.now(); // la pantalla ya mostró el resultado
        vistos.push(`${ci}: ${r}`);
        if (r === "INGRESO PERMITIDO") return { ci, inicio, confirmado, vistos };
        await cerrarTarjeta(page);
    }
    throw new Error(`Ningún estudiante de prueba pudo ingresar: ${vistos.join(" | ")}`);
}

/** Espera (revisando en cada cuadro de pantalla) a que "Últimos ingresos" muestre ese C.I. */
async function esperarEnUltimos(page, ci) {
    await page.waitForFunction((c) => [...document.querySelectorAll("section")]
        .some((s) => /ltimos ingresos/.test(s.querySelector("h2")?.textContent || "") && s.textContent.includes(`C.I. ${c}`)),
        ci, { polling: "raf", timeout: 60_000 });
}

test.describe("HU05 · Control de ingreso del docente (pruebas de sistema)", () => {
    test("TC-120 · El docente ve su examen de hoy y entra a su control de ingreso", async ({ page }, testInfo) => {
        await iniciarSesionDocente(page);
        const tarjeta = tarjetaExamen(page);
        await expect(tarjeta).toBeVisible();
        const textoTarjeta = (await tarjeta.innerText()).replace(/\s+/g, " ").trim();
        await captura(page, testInfo, "TC-120-inicio-docente", { fullPage: false });

        await abrirControl(page);
        const detalle = (await page.getByRole("heading", { name: "Control de ingreso", exact: true })
            .locator("xpath=following-sibling::p").first().textContent()).trim();
        await captura(page, testInfo, "TC-120-control-docente", { fullPage: false });

        await evidencia(testInfo, "TC-120", `Tarjeta en el Inicio: "${textoTarjeta}" · Al presionar "Control de ingreso" se abre: `
            + `"Control de ingreso" — "${detalle}" · Sección "Verificación de ingreso" visible`);
        expect(textoTarjeta).toMatch(/HOY|EN CURSO/);
        expect(detalle).toMatch(MATERIA);
    });

    test("TC-113 · Un ingreso aparece en la segunda pestaña en menos de 5 s", async ({ page, context }, testInfo) => {
        await iniciarSesionDocente(page);
        const pestana2 = await context.newPage(); // misma sesión, segunda pestaña
        await abrirPantalla(pestana2, "/home/docente");
        await abrirControl(page);
        await abrirControl(pestana2);

        const { ci, inicio, confirmado, vistos } = await registrarSiguiente(page);
        await esperarEnUltimos(pestana2, ci);
        const ms = Date.now() - confirmado;
        const msRegistro = confirmado - inicio;
        await captura(page, testInfo, "TC-113-pestana-1", { fullPage: false });
        await captura(pestana2, testInfo, "TC-113-pestana-2", { fullPage: false });

        await evidencia(testInfo, "TC-113", `Intentos: ${vistos.join(" | ")} · Ingreso registrado en la pestaña 1 (C.I. ${ci}) · `
            + `El registro tardó ${(msRegistro / 1000).toFixed(2)} s en confirmarse · Desde que se confirmó, apareció en "Últimos ingresos" `
            + `de la pestaña 2 a los ${(ms / 1000).toFixed(2)} s (límite 5 s)`);
        expect.soft(ms, "Debe aparecer en la segunda pestaña en menos de 5 s").toBeLessThan(5000);
    });

    test("TC-114 · Un ingreso aparece en otro dispositivo en máximo 5 s", async ({ page, browser }, testInfo) => {
        await iniciarSesionDocente(page);
        // Otro dispositivo: otro navegador independiente (otra sesión), con pantalla de celular
        const celular = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width: 390, height: 844 }, locale: "es-BO" });
        const otro = await celular.newPage();
        await iniciarSesionDocente(otro);
        await abrirControl(page);
        await abrirControl(otro);

        const { ci, inicio, confirmado, vistos } = await registrarSiguiente(page);
        await esperarEnUltimos(otro, ci);
        const ms = Date.now() - confirmado;
        const msRegistro = confirmado - inicio;
        await captura(page, testInfo, "TC-114-computadora", { fullPage: false });
        await captura(otro, testInfo, "TC-114-celular", { fullPage: false });
        await celular.close();

        await evidencia(testInfo, "TC-114", `Intentos: ${vistos.join(" | ")} · Ingreso registrado en la computadora (C.I. ${ci}) · `
            + `El registro tardó ${(msRegistro / 1000).toFixed(2)} s en confirmarse · Desde que se confirmó, apareció en el celular `
            + `(otra sesión) a los ${(ms / 1000).toFixed(2)} s (límite 5 s)`);
        expect.soft(ms, "Debe aparecer en el otro dispositivo en máximo 5 s").toBeLessThanOrEqual(5000);
    });

    test("TC-116 · Sin conexión no sale Ingreso permitido y se avisa que no se registró", async ({ page, context }, testInfo) => {
        await iniciarSesionDocente(page);
        await abrirControl(page);
        const ci = ESTUDIANTE_SIN_RED;
        const ultimos = page.locator("section[aria-labelledby='ci-t-ultimos']");
        const antes = (await ultimos.textContent()).includes(`C.I. ${ci}`);

        await context.setOffline(true); // se corta el internet del navegador
        const resultado = await verificar(page, ci, 30_000);
        const indicador = (await page.getByText(/^(En línea|Sin red.*|Red lenta.*|Sincronizando.*)$/).first().textContent().catch(() => "")).trim();
        const aviso = (await page.getByText(/MODO OFFLINE/).first().locator("xpath=..").textContent().catch(() => "")).replace(/\s+/g, " ").trim();
        await captura(page, testInfo, "TC-116-sin-conexion", { fullPage: false });
        await context.setOffline(false); // vuelve el internet

        // Con internet de nuevo: se espera 15 s y se revisa si ese ingreso llegó al servidor igual
        await page.waitForTimeout(15_000);
        const enUltimos = (await ultimos.textContent()).includes(`C.I. ${ci}`);
        await captura(page, testInfo, "TC-116-con-conexion-de-nuevo", { fullPage: false });
        await cerrarTarjeta(page);
        // Se verifica otra vez el mismo C.I. ya con internet: "YA REGISTRADO" = el ingreso sin conexión sí se guardó
        const despues = await verificar(page, ci);
        await captura(page, testInfo, "TC-116-verificacion-con-internet", { fullPage: false });

        await evidencia(testInfo, "TC-116", `Antes: el C.I. ${ci} ${antes ? "ya" : "no"} estaba en "Últimos ingresos" · `
            + `Sin internet, al verificarlo se muestra: "${resultado}" · Indicador de conexión: "${indicador}"`
            + (aviso ? ` · Aviso en pantalla: "${aviso}"` : "")
            + ` · 15 s después de volver el internet, ¿aparece en "Últimos ingresos"?: ${enUltimos ? "sí" : "no"}`
            + ` · Al verificarlo de nuevo con internet: "${despues}"`);
        expect(resultado, "Sin conexión no debe salir Ingreso permitido").not.toBe("INGRESO PERMITIDO");
        expect.soft(resultado, "Debe avisar con un mensaje claro que el ingreso no se registró")
            .toMatch(/no se (pudo )?registr|sin conexi|sin red|no hay conexi/i);
    });

    test("TC-118 · El control de ingreso se ve completo en celular, tablet y computadora", async ({ page }, testInfo) => {
        await iniciarSesionDocente(page);
        await abrirControl(page);
        const tamanos = [{ nombre: "celular", width: 375, height: 812 }, { nombre: "tablet", width: 768, height: 1024 },
        { nombre: "computadora", width: 1366, height: 768 }];
        const medidas = [];
        for (const t of tamanos) {
            await page.setViewportSize({ width: t.width, height: t.height });
            await page.waitForTimeout(500);
            const anchoPagina = await page.evaluate(() => document.documentElement.scrollWidth);
            const borde = async (loc) => { const b = await loc.boundingBox(); return b ? Math.round(b.x + b.width) : null; };
            const campo = await borde(page.getByLabel("C.I. o Código SIS del estudiante"));
            const boton = await borde(page.getByRole("button", { name: "Verificar ingreso" }));
            const ultimos = await borde(page.locator("section[aria-labelledby='ci-t-ultimos']"));
            medidas.push({ ...t, anchoPagina, campo, boton, ultimos });
            await captura(page, testInfo, `TC-118-${t.nombre}`);
        }
        await evidencia(testInfo, "TC-118", medidas.map((m) => `${m.nombre} ${m.width} px: ancho de la página ${m.anchoPagina} px, `
            + `borde derecho del campo ${m.campo} px, del botón "Verificar ingreso" ${m.boton} px, de "Últimos ingresos" ${m.ultimos} px`).join(" | "));
        for (const m of medidas) {
            expect.soft(m.anchoPagina, `${m.nombre}: no debe haber scroll horizontal`).toBeLessThanOrEqual(m.width);
            for (const [nombre, valor] of [["campo", m.campo], ["botón", m.boton], ["Últimos ingresos", m.ultimos]]) {
                expect.soft(valor ?? 99999, `${m.nombre}: ${nombre} debe entrar completo en pantalla`).toBeLessThanOrEqual(m.width);
            }
        }
    });

    test("TC-119 · El control funciona igual en Chrome, Firefox, Edge y Safari (motor WebKit)", async ({ }, testInfo) => {
        test.setTimeout(300_000);
        const navegadores = [
            { nombre: "Chrome", tipo: chromium, opciones: {} },
            { nombre: "Firefox", tipo: firefox, opciones: {} },
            { nombre: "Edge", tipo: chromium, opciones: { channel: "msedge" } },
            { nombre: "Safari (motor WebKit)", tipo: webkit, opciones: {} },
        ];
        const resultados = [];
        for (const n of navegadores) {
            let navegador;
            try {
                navegador = await n.tipo.launch(n.opciones);
                const ctx = await navegador.newContext({ baseURL: testInfo.project.use.baseURL, locale: "es-BO" });
                const page = await ctx.newPage();
                await iniciarSesionDocente(page);
                await abrirControl(page);
                // Un C.I. ya registrado: se toma de "Últimos ingresos" (así no se registra nada nuevo)
                await page.waitForFunction(() => /C\.I\. \d+/.test([...document.querySelectorAll("section")]
                    .find((s) => /ltimos ingresos/.test(s.querySelector("h2")?.textContent || ""))?.textContent || ""), null, { timeout: 30_000 });
                const textoUltimos = await page.locator("section[aria-labelledby='ci-t-ultimos']").textContent();
                const ciRegistrado = textoUltimos.match(/C\.I\. (\d+)/)[1];
                const inexistente = await verificar(page, "99999999");
                await cerrarTarjeta(page);
                const registrado = await verificar(page, ciRegistrado);
                await captura(page, testInfo, `TC-119-${n.nombre.split(" ")[0].toLowerCase()}`, { fullPage: false });
                resultados.push({ navegador: n.nombre, version: navegador.version(), inexistente, registrado, ciRegistrado });
            } catch (e) {
                resultados.push({ navegador: n.nombre, error: String(e.message).split("\n")[0] });
            } finally {
                await navegador?.close();
            }
        }
        await evidencia(testInfo, "TC-119", resultados.map((r) => r.error
            ? `${r.navegador}: NO SE PUDO PROBAR (${r.error})`
            : `${r.navegador} ${r.version}: C.I. inexistente 99999999 → "${r.inexistente}", C.I. ya registrado ${r.ciRegistrado} → "${r.registrado}"`).join(" | "));
        for (const r of resultados) {
            expect.soft(r.error, `${r.navegador}: debe poder probarse`).toBeUndefined();
            if (!r.error) {
                expect.soft(r.inexistente, `${r.navegador}: C.I. inexistente`).toBe("ESTUDIANTE NO ENCONTRADO");
                expect.soft(r.registrado, `${r.navegador}: C.I. ya registrado`).toBe("YA REGISTRADO");
            }
        }
    });
});