import { test, expect } from "@playwright/test";
import { captura, evidencia, iniciarSesionAdmin } from "../sistema.apoyo.js";

// HU06 · Incidencias e ingresos excepcionales (pruebas de sistema) sobre el sistema publicado.
// Estas pruebas solo consultan: no registran, revisan ni cierran nada.

/** Entra como administrador a la sección Incidencias y espera que cargue la lista. */
async function abrirIncidencias(page) {
    await iniciarSesionAdmin(page);
    await page.locator("aside").getByRole("button", { name: /^Incidencias/ }).click();
    await expect(page.getByRole("button", { name: /^Abiertas \d+$/ })).toBeVisible();
    await expect(page.getByText(/Cargando incidencias/)).toHaveCount(0);
}

const numero = async (loc) => Number(((await loc.textContent()) || "").match(/\d+/)?.[0] ?? 0);

/** Tabla de incidencias (vista de computadora). */
const tablaIncidencias = (page) => page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Reportado por" }) });
/** Tabla de ingresos excepcionales (vista de computadora). */
const tablaExcepcionales = (page) => page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Autorizado por" }) });
/** Pestañas de la sección (no el menú lateral). */
const pestana = (page, nombre) => page.locator("main").getByRole("button", { name: new RegExp(`^${nombre}\\s*\\d*$`) });

test.describe("HU06 · Incidencias e ingresos excepcionales (pruebas de sistema)", () => {
    test("TC-122 · La sección Incidencias muestra la lista y los totales por estado", async ({ page }, testInfo) => {
        await abrirIncidencias(page);
        const totales = {
            abiertas: await numero(page.getByRole("button", { name: /^Abiertas \d+$/ })),
            enRevision: await numero(page.getByRole("button", { name: /^En revisión \d+$/ })),
            cerradas: await numero(page.getByRole("button", { name: /^Cerradas \d+$/ })),
        };
        const estados = (await tablaIncidencias(page).locator("tbody tr td:last-child").allTextContents()).map((t) => t.trim().toLowerCase());
        const enLista = {
            abiertas: estados.filter((e) => e.includes("abiert")).length,
            enRevision: estados.filter((e) => e.includes("revisi")).length,
            cerradas: estados.filter((e) => e.includes("cerrad")).length,
        };
        await captura(page, testInfo, "TC-122-incidencias");
        await evidencia(testInfo, "TC-122", `Filas en la lista: ${estados.length} · Totales mostrados: Abiertas ${totales.abiertas}, `
            + `En revisión ${totales.enRevision}, Cerradas ${totales.cerradas} · Contadas en la lista: Abiertas ${enLista.abiertas}, `
            + `En revisión ${enLista.enRevision}, Cerradas ${enLista.cerradas}`);

        expect(estados.length, "Para esta prueba deben existir incidencias registradas").toBeGreaterThan(0);
        expect.soft(enLista, "Los totales por estado deben coincidir con la lista").toEqual(totales);
    });

    test("TC-123 · La pestaña Ingresos excepcionales lista estudiante, motivo y autor", async ({ page }, testInfo) => {
        await abrirIncidencias(page);
        await pestana(page, "Ingresos excepcionales").click();
        const tabla = tablaExcepcionales(page);
        await expect(tabla).toBeVisible();
        await expect(page.getByText(/Cargando ingresos excepcionales/)).toHaveCount(0);

        const filas = [];
        for (const fila of await tabla.locator("tbody tr").all()) {
            const celdas = (await fila.locator("td").allTextContents()).map((t) => t.trim());
            if (celdas.length < 7) continue; // fila de "No hay registros"
            filas.push({ estudiante: celdas[1], motivo: celdas[4], autor: celdas[6] });
        }
        const incompletas = filas.filter((f) => [f.estudiante, f.motivo, f.autor].some((v) => !v || v === "-"));
        await captura(page, testInfo, "TC-123-excepcionales");
        await evidencia(testInfo, "TC-123", `Ingresos excepcionales listados: ${filas.length} · Primeros: `
            + `${JSON.stringify(filas.slice(0, 3))} · Filas sin estudiante, motivo o autor: ${incompletas.length}`);

        expect(filas.length, "Para esta prueba debe existir al menos un ingreso excepcional").toBeGreaterThan(0);
        expect.soft(incompletas, "Cada fila debe tener estudiante, motivo y autor").toEqual([]);
    });

    test("TC-124 · El detalle de una incidencia muestra su línea de tiempo con horas", async ({ page }, testInfo) => {
        await abrirIncidencias(page);
        const filas = tablaIncidencias(page).locator("tbody tr");
        const total = await filas.count();
        const tituloLinea = page.getByText("Línea de tiempo (desde auditoría)");
        let resultado = null;

        // Se revisan hasta 5 incidencias, hasta encontrar una con eventos en su línea de tiempo
        for (let i = 0; i < Math.min(total, 5) && !resultado; i++) {
            const codigo = ((await filas.nth(i).locator("td").first().textContent()) || "").trim();
            await filas.nth(i).click();
            await expect(tituloLinea).toBeVisible();
            await expect(page.getByText(/Cargando detalle/)).toHaveCount(0);
            const linea = tituloLinea.locator("xpath=..");
            const eventos = await linea.locator("div.relative").all();
            if (eventos.length === 0) continue;
            const detalle = [];
            for (const ev of eventos) {
                const [hora, accion] = (await ev.locator("span").allTextContents()).map((t) => t.trim());
                detalle.push({ hora, accion });
            }
            await linea.scrollIntoViewIfNeeded();
            resultado = { codigo, detalle };
        }
        await captura(page, testInfo, "TC-124-linea-de-tiempo", { fullPage: false });
        await evidencia(testInfo, "TC-124", resultado
            ? `Incidencia ${resultado.codigo} · Línea de tiempo: ${resultado.detalle.map((e) => `${e.hora} ${e.accion}`).join(" | ")}`
            : `Se revisaron ${Math.min(total, 5)} incidencias y ninguna mostró eventos en su línea de tiempo`);

        expect(resultado, "Al menos una incidencia debe mostrar eventos en su línea de tiempo").not.toBeNull();
        for (const ev of resultado.detalle) {
            expect.soft(ev.hora, `Cada evento debe tener hora (evento "${ev.accion}")`).toMatch(/\d{1,2}:\d{2}/);
            expect.soft(ev.accion, "Cada evento debe decir qué pasó").toBeTruthy();
        }
    });

    test("TC-125 · El menú lateral muestra la cantidad de incidencias abiertas", async ({ page }, testInfo) => {
        // Se anotan las respuestas del servidor al contador del menú (para saber qué número le dio)
        const respuestasContador = [];
        page.on("response", async (r) => {
            if (!r.url().includes("/api/incidencias/abiertas/total")) return;
            respuestasContador.push(`${r.status()} ${await r.text().catch(() => "(sin cuerpo)")}`);
        });

        await abrirIncidencias(page);
        const abiertas = await numero(page.getByRole("button", { name: /^Abiertas \d+$/ }));
        const botonMenu = page.locator("aside").getByRole("button", { name: /^Incidencias/ });
        // Se da hasta 10 segundos al menú para mostrar el número
        if (abiertas > 0) {
            await expect.poll(async () => /\d/.test((await botonMenu.textContent()) || ""), { timeout: 10_000 }).toBe(true).catch(() => { });
        }
        const textoMenu = ((await botonMenu.textContent()) || "").trim();
        const numeroMenu = textoMenu.match(/\d+/)?.[0] ?? null;
        await captura(page, testInfo, "TC-125-menu-lateral", { fullPage: false });
        await evidencia(testInfo, "TC-125", `Menú lateral: "${textoMenu}" · Número en el menú: ${numeroMenu ?? "(ninguno)"} · `
            + `Total "Abiertas" en la sección: ${abiertas} · Respuestas del servidor al contador del menú: `
            + `${respuestasContador.length ? respuestasContador.join(" | ") : "(ninguna)"}`);

        if (abiertas === 0) {
            expect(numeroMenu, "Sin incidencias abiertas, el menú no muestra número").toBeNull();
        } else {
            expect(numeroMenu, "El menú debe mostrar la cantidad de incidencias abiertas").toBe(String(abiertas));
        }
    });

    test("TC-127 · Incidencias e ingresos excepcionales se ven completos en celular", async ({ page }, testInfo) => {
        await abrirIncidencias(page);
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(page.getByText(/Cargando incidencias/)).toHaveCount(0);
        const medir = () => page.evaluate(() => ({ anchoPagina: document.documentElement.scrollWidth, anchoPantalla: window.innerWidth }));
        const borde = async (loc) => {
            const b = await loc.boundingBox({ timeout: 10_000 }).catch(() => null);
            return b ? Math.round(b.x + b.width) : null;
        };

        const incidencias = await medir();
        const bordeDetalle = await borde(page.locator("#detalle-incidencia"));
        await captura(page, testInfo, "TC-127-incidencias-celular");

        await pestana(page, "Ingresos excepcionales").click();
        await expect(page.getByText(/Cargando ingresos excepcionales/)).toHaveCount(0);
        const excepcionales = await medir();
        const bordeLista = await borde(page.getByText("Estudiantes autorizados manualmente con motivo justificado y auditoría.").locator("xpath=../.."));
        await captura(page, testInfo, "TC-127-excepcionales-celular");

        await evidencia(testInfo, "TC-127", `Pantalla de 375 px · Incidencias: ancho de la página ${incidencias.anchoPagina} px, `
            + `borde derecho del detalle ${bordeDetalle} px · Ingresos excepcionales: ancho de la página ${excepcionales.anchoPagina} px, `
            + `borde derecho de la lista ${bordeLista} px`);

        expect.soft(incidencias.anchoPagina, "Incidencias no debe tener scroll horizontal").toBeLessThanOrEqual(incidencias.anchoPantalla);
        expect.soft(bordeDetalle ?? 0, "El detalle de la incidencia debe entrar completo").toBeLessThanOrEqual(375);
        expect.soft(excepcionales.anchoPagina, "Ingresos excepcionales no debe tener scroll horizontal").toBeLessThanOrEqual(excepcionales.anchoPantalla);
        expect.soft(bordeLista ?? 0, "La lista de ingresos excepcionales debe entrar completa").toBeLessThanOrEqual(375);
    });
});