import { test, expect } from "@playwright/test";
import { abrirPantalla, captura, evidencia } from "../sistema.apoyo.js";

// HU06 · Ingreso excepcional (pruebas de sistema) sobre el sistema publicado.
// Examen de prueba: ARQUITECTURA DE COMPUTADORAS I · Segundo parcial (de hoy), aula 693B.
// Ninguna de estas pruebas guarda nada: TC-121 bloquea cualquier autorización y
// TC-126 simula la falla en el navegador, así que el pedido nunca llega al servidor.

const MATERIA = /arquitectura de computadoras/i;
const AULA = /693B/i;
// Estudiante de prueba registrado en el sistema pero NO habilitado en este examen
const ESTUDIANTE = "74512309";
const ESTADOS = /^(No figura en la lista|Inhabilitado|No encontrado|Ya ingresó|Retirado|Habilitado)$/;
const OBSERVACION = "Presentó su carnet físico en puerta y el docente verificó su identidad.";

/** ¿Es el pedido que autoriza (guarda) un ingreso excepcional? */
const esAutorizacion = (request) =>
    request.method() !== "GET" && new URL(request.url()).pathname.endsWith("/api/ingresos-excepcionales");

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

/** Ventana del ingreso excepcional (sirve para el paso 1 y el paso 2). */
const modal = (page) => page.locator("div.fixed.inset-0").filter({ hasText: /ingreso excepcional/i }).last();

/** Entra a Incidencias, abre "Excepcional" y elige el aula del examen de prueba. */
async function abrirIngresoExcepcional(page) {
    await iniciarSesionDocente(page);
    const aulasCargadas = page.waitForResponse(
        (r) => r.url().includes("/api/incidencias/ambientes") && r.request().method() === "GET",
        { timeout: 30_000 });
    await page.getByRole("button", { name: /^Incidencias(\s*\d+)?$/ }).filter({ visible: true }).first().click();
    await aulasCargadas;
    const boton = page.getByRole("button", { name: "Excepcional", exact: true });
    await expect(boton).toBeEnabled({ timeout: 20_000 });
    await boton.click();

    const ventana = modal(page);
    const aviso = ventana.getByText(/solo se autoriza el día del examen/);
    const select = ventana.locator("select");
    await expect(select.or(aviso).first()).toBeVisible();
    if (await aviso.count()) throw new Error("El modal dice que hoy no hay exámenes asignados para este docente.");

    const opciones = await select.locator("option").evaluateAll((os) => os.map((o) => ({ value: o.value, texto: o.textContent || "" })));
    const opcion = opciones.find((o) => MATERIA.test(o.texto) && AULA.test(o.texto)) || opciones.find((o) => MATERIA.test(o.texto));
    if (!opcion) throw new Error(`No aparece el aula del examen de prueba. Aulas: ${opciones.map((o) => o.texto).join(" | ")}`);
    if (/ingreso cerrado/i.test(opcion.texto)) throw new Error(`El ingreso del examen ya cerró: ${opcion.texto}`);
    await select.selectOption(opcion.value);
    return opcion.texto.trim();
}

/** Busca un C.I. en el paso 1 y devuelve { estado, detalle } del resultado. */
async function buscar(page, ci) {
    const ventana = modal(page);
    await ventana.getByPlaceholder("CI o Código SIS", { exact: true }).fill(ci);
    await ventana.getByRole("button", { name: "Buscar", exact: true }).click();
    const estado = ventana.getByText(ESTADOS);
    const error = ventana.locator("p.text-rose-600");
    await expect(estado.or(error).first()).toBeVisible({ timeout: 20_000 });
    if (await error.count()) return { estado: "ERROR", detalle: (await error.first().innerText()).trim() };
    const tarjeta = ventana.locator("div.rounded-2xl.border").filter({ has: page.getByText(ESTADOS) }).last();
    return {
        estado: (await estado.first().innerText()).trim(),
        detalle: (await tarjeta.innerText()).replace(/\s+/g, " ").trim(),
    };
}

/** Comprueba que el estudiante de prueba esté listo (registrado y sin habilitar en este examen). */
function exigirEstudianteListo(resultado) {
    if (resultado.estado === "No encontrado") {
        throw new Error(`El C.I. ${ESTUDIANTE} no existe: primero sube el Excel estudiante-sistema-hu06.xlsx (sin habilitarlo).`);
    }
    if (resultado.estado === "Habilitado") {
        throw new Error(`El C.I. ${ESTUDIANTE} está habilitado en el examen: debe quedar SIN habilitar para esta prueba.`);
    }
    expect(resultado.estado, "El estudiante de prueba no debe tener ingreso").not.toMatch(/Ya ingresó|Retirado/);
}

test.describe("HU06 · Ingreso excepcional (pruebas de sistema)", () => {
    test("TC-121 · Rechazar y continuar en Ingreso excepcional no autoriza el ingreso", async ({ page }, testInfo) => {
        // Seguridad: si algo intentara autorizar, se corta antes de llegar al servidor y se cuenta.
        const autorizaciones = [];
        await page.route((url) => new URL(url).pathname.endsWith("/api/ingresos-excepcionales"), async (route) => {
            if (esAutorizacion(route.request())) {
                autorizaciones.push(route.request().method());
                return route.abort();
            }
            return route.continue();
        });

        const aula = await abrirIngresoExcepcional(page);
        const ventana = modal(page);
        const antes = await buscar(page, ESTUDIANTE);
        exigirEstudianteListo(antes);
        const podiaAutorizar = await ventana.getByRole("button", { name: "Autorizar ingreso excepcional" }).isVisible();
        await captura(page, testInfo, "TC-121-antes-de-rechazar");

        await ventana.getByRole("button", { name: "Rechazar y continuar" }).click();
        const campo = ventana.getByPlaceholder("CI o Código SIS", { exact: true });
        await expect(ventana.getByText(ESTADOS), "El resultado debe desaparecer").toHaveCount(0);
        await expect(campo, "El campo de búsqueda debe quedar vacío").toHaveValue("");
        await expect.soft(campo, "El cursor debe quedar listo para el siguiente estudiante").toBeFocused();
        await captura(page, testInfo, "TC-121-despues-de-rechazar");

        await page.waitForTimeout(1500);
        const despues = await buscar(page, ESTUDIANTE);
        await captura(page, testInfo, "TC-121-busqueda-de-nuevo");

        await evidencia(testInfo, "TC-121",
            `Aula: ${aula} · C.I. ${ESTUDIANTE} antes de rechazar: "${antes.estado}" (${antes.detalle}) · `
            + `Botón "Autorizar ingreso excepcional" disponible: ${podiaAutorizar ? "sí" : "no"} · `
            + `Tras "Rechazar y continuar": resultado borrado y campo vacío · Autorizaciones enviadas al servidor: ${autorizaciones.length} · `
            + `Al buscarlo de nuevo: "${despues.estado}"`);

        expect(autorizaciones.length, "Rechazar no debe enviar ninguna autorización").toBe(0);
        expect(despues.estado, "Después de rechazar, el estudiante no debe quedar con ingreso").toBe(antes.estado);
    });

    const variantes = [
        {
            nombre: "A sin conexión",
            archivo: "A-sin-conexion",
            simular: (route) => route.abort("internetdisconnected"),
        },
        {
            nombre: "B error del servidor",
            archivo: "B-error-servidor",
            // Mismo formato que devuelve el backend ante un error inesperado (GlobalExceptionHandler)
            simular: (route) => route.fulfill({
                status: 500,
                contentType: "application/json",
                body: JSON.stringify({
                    codigo: 500,
                    error: "Internal Server Error",
                    mensaje: "Ha ocurrido un error inesperado en el servidor: could not execute statement",
                    detalles: null,
                    timestamp: new Date().toISOString(),
                }),
            }),
        },
    ];

    for (const variante of variantes) {
        test(`TC-126 (${variante.nombre}) · Si falla guardar un ingreso excepcional se avisa y no se registra`, async ({ page }, testInfo) => {
            // La falla se simula en el navegador: el pedido de guardar NUNCA llega al servidor.
            const interceptados = [];
            await page.route((url) => new URL(url).pathname.endsWith("/api/ingresos-excepcionales"), async (route) => {
                if (esAutorizacion(route.request())) {
                    interceptados.push(route.request().method());
                    return variante.simular(route);
                }
                return route.continue();
            });

            const aula = await abrirIngresoExcepcional(page);
            const ventana = modal(page);
            const antes = await buscar(page, ESTUDIANTE);
            exigirEstudianteListo(antes);
            await ventana.getByRole("button", { name: "Autorizar ingreso excepcional" }).click();

            await ventana.getByRole("button", { name: /No figura en la lista/ }).click();
            await ventana.getByPlaceholder(/Explica por qué se autoriza/).fill(OBSERVACION);
            const confirmar = ventana.getByRole("button", { name: "Confirmar ingreso" });
            await expect(confirmar).toBeEnabled();
            await confirmar.click();

            const error = ventana.locator("div.bg-rose-50").filter({ hasText: "✕" });
            await expect(error, "Debe aparecer un aviso de que no se pudo guardar").toBeVisible({ timeout: 20_000 });
            const mensaje = (await error.innerText()).replace(/\s+/g, " ").trim();
            const exito = ventana.getByText(/Ingreso registrado a las/);
            await expect(exito, "No debe salir el mensaje de ingreso registrado").toHaveCount(0);
            await expect(confirmar, "El botón debe quedar listo para reintentar").toBeEnabled();
            await captura(page, testInfo, `TC-126-${variante.archivo}-aviso`);

            // Vuelve al paso 1 y busca de nuevo: el estudiante debe seguir sin ingreso.
            await ventana.getByRole("button", { name: "Volver" }).click();
            const despues = await buscar(page, ESTUDIANTE);
            await captura(page, testInfo, `TC-126-${variante.archivo}-busqueda-de-nuevo`);

            await evidencia(testInfo, `TC-126-${variante.archivo}`,
                `Aula: ${aula} · C.I. ${ESTUDIANTE}: "${antes.estado}" · Falla simulada: ${variante.nombre} · `
                + `Pedidos de guardar interceptados (no llegaron al servidor): ${interceptados.length} · `
                + `Aviso en pantalla: "${mensaje}" · Mensaje de éxito: no · Botón "Confirmar ingreso" habilitado para reintentar: sí · `
                + `Al buscarlo de nuevo: "${despues.estado}"`);

            expect(interceptados.length, "El guardado debe haberse intentado una vez").toBe(1);
            expect(despues.estado, "Si falla el guardado, el estudiante no debe quedar con ingreso").toBe(antes.estado);
        });
    }
});