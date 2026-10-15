import { test, expect } from "@playwright/test";
import { abrirPantalla, captura, evidencia } from "../sistema.apoyo.js";
import { generarEstudiantes } from "../carga.apoyo.js";

// HU05 · Lista oficial del aula con 300 estudiantes (prueba de carga, parte PANTALLA).
// La respuesta del servidor se reemplaza en el navegador por 300 estudiantes inventados:
// no se guarda ni se cambia nada en la base de datos. La parte del SERVIDOR se mide con JUnit.

test.use({ video: "off" }); // el video vuelve lenta la pantalla y altera los tiempos

const MATERIA = /arquitectura de computadoras/i;
const TIPO = /segundo parcial/i;
const CANTIDAD = 300;
const LIMITE_MS = 2000;

// 300 estudiantes inventados con estados variados (como respondería el servidor)
const ESTUDIANTES = generarEstudiantes(CANTIDAD, 3000).map((e, i) => {
    const estado = i % 30 === 0 ? "INHABILITADO" : i % 7 === 0 ? "INGRESO" : "PENDIENTE";
    return {
        codSisEstudiante: e.codsis,
        sis: e.codsis,
        ci: e.ci,
        nombres: e.nombres,
        apellidos: e.apellidos,
        nombre: `${e.nombres} ${e.apellidos}`,
        habilitado: estado !== "INHABILITADO",
        estado,
        horaIngreso: estado === "INGRESO" ? `13:${String(10 + (i % 50)).padStart(2, "0")}:00` : null,
        aulaAsignada: "Aula 693B",
    };
});

/** Mismo filtro que hace el servidor: apellido, nombre, C.I. o SIS que contenga el texto. */
function filtrar(texto) {
    const f = texto.trim().toLowerCase();
    if (!f) return ESTUDIANTES;
    return ESTUDIANTES.filter((e) => e.apellidos.toLowerCase().includes(f) || e.nombres.toLowerCase().includes(f)
        || e.ci.toLowerCase().includes(f) || String(e.codSisEstudiante).includes(f));
}

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

/** Desde el Inicio del docente entra al control de ingreso del examen de prueba. */
async function abrirControl(page) {
    const tarjeta = page.locator("div")
        .filter({ hasText: MATERIA })
        .filter({ hasText: TIPO })
        .filter({ has: page.getByRole("button", { name: /Control de ingreso/ }) })
        .last();
    await tarjeta.getByRole("button", { name: /Control de ingreso/ }).click();
    await expect(page.getByRole("heading", { name: "Verificación de ingreso" })).toBeVisible();
}

/**
 * Espera (revisando en cada cuadro de pantalla) a que la lista muestre exactamente "n" estudiantes
 * y que TODOS contengan el texto buscado (así no se confunde con lo que quedó del filtro anterior).
 */
async function esperarFilas(page, n, texto = "") {
    await page.waitForFunction(({ esperado, buscado }) => {
        const panel = document.querySelector("[role='dialog'][aria-labelledby='ci-t-lista']");
        if (!panel) return false;
        const filas = [...panel.querySelectorAll("li")].filter((li) => li.textContent.includes("C.I."));
        return filas.length === esperado
            && filas.every((li) => li.textContent.toLowerCase().includes(buscado.toLowerCase()));
    }, { esperado: n, buscado: texto }, { polling: "raf", timeout: 30_000 });
}

test.describe("HU05 · Lista oficial del aula (pruebas de carga)", () => {
    test("TC-298 · La Lista oficial con 300 estudiantes carga y filtra en menos de 2 s", async ({ page }, testInfo) => {
        const pedidos = [];
        await page.route((url) => new URL(url).pathname.endsWith("/lista-oficial"), async (route) => {
            const url = new URL(route.request().url());
            pedidos.push(url.pathname + url.search);
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(filtrar(url.searchParams.get("buscar") || "")) });
        });

        await iniciarSesionDocente(page);
        await abrirControl(page);

        // 1) Abrir la lista: desde el clic hasta ver los 300 estudiantes
        let inicio = Date.now();
        await page.getByRole("button", { name: /Lista oficial del aula/ }).click();
        await esperarFilas(page, CANTIDAD);
        const msCarga = Date.now() - inicio;
        await captura(page, testInfo, "TC-298-lista-300", { fullPage: false });

        // 2) Filtros: desde que se escribe hasta ver solo los que coinciden
        const panel = page.getByRole("dialog", { name: "Lista oficial del aula" });
        const buscador = panel.getByPlaceholder("Buscar por apellido, C.I. o SIS");
        // El C.I. y el SIS son de estudiantes DISTINTOS: así cada filtro obliga a cambiar la fila que se ve
        const filtros = [
            { nombre: "apellido", texto: "Paredes" },
            { nombre: "C.I.", texto: ESTUDIANTES[150].ci },
            { nombre: "SIS", texto: String(ESTUDIANTES[220].codSisEstudiante) },
        ];
        const medidos = [];
        for (const f of filtros) {
            const esperado = filtrar(f.texto).length;
            inicio = Date.now();
            await buscador.fill(f.texto);
            await esperarFilas(page, esperado, f.texto);
            medidos.push({ ...f, esperado, ms: Date.now() - inicio });
            await captura(page, testInfo, `TC-298-filtro-${f.nombre.replace(/\W/g, "")}`, { fullPage: false });
        }
        // Volver a la lista completa (borrar el filtro)
        inicio = Date.now();
        await buscador.fill("");
        await esperarFilas(page, CANTIDAD);
        medidos.push({ nombre: "borrar filtro", texto: "", esperado: CANTIDAD, ms: Date.now() - inicio });

        const maximo = Math.max(msCarga, ...medidos.map((m) => m.ms));
        await evidencia(testInfo, "TC-298",
            `Lista con ${CANTIDAD} estudiantes (respuesta reemplazada en el navegador) · Abrir la lista: ${(msCarga / 1000).toFixed(2)} s · `
            + medidos.map((m) => `Filtro por ${m.nombre}${m.texto ? ` "${m.texto}"` : ""} → ${m.esperado} fila(s) en ${(m.ms / 1000).toFixed(2)} s`).join(" · ")
            + ` · Más lento: ${(maximo / 1000).toFixed(2)} s (límite 2 s) · Dirección que pide la pantalla: ${pedidos[0] || "ninguna"}`);

        expect.soft(msCarga, "La lista debe cargar en menos de 2 s").toBeLessThan(LIMITE_MS);
        for (const m of medidos) {
            expect.soft(m.ms, `El filtro por ${m.nombre} debe responder en menos de 2 s`).toBeLessThan(LIMITE_MS);
        }
    });
});