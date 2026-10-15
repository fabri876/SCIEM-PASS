import { test, expect } from "@playwright/test";
import { captura, evidencia, iniciarSesionAdmin } from "../sistema.apoyo.js";

// HU06 · Incidencias (pruebas de carga) sobre el sistema publicado.
// TC-299 (parte de la pantalla): las 1000 incidencias son FALSAS y solo existen dentro de la prueba.
// La prueba responde en lugar del servidor cuando la pantalla pide la lista o el detalle de incidencias,
// así la base de datos nunca se entera. Además bloquea cualquier pedido que pueda guardar o cambiar algo.

const TIPOS = [
    { codigo: "SUPLANTACION", etiqueta: "Suplantación de identidad", descripcion: "El documento presentado no coincide con la persona que rinde el examen." },
    { codigo: "OBJETO_PROHIBIDO", etiqueta: "Objeto prohibido", descripcion: "Estudiante con celular encendido durante el examen." },
    { codigo: "CONDUCTA_INAPROPIADA", etiqueta: "Conducta inapropiada", descripcion: "Estudiante conversando con su compañero después de la advertencia." },
    { codigo: "FALLA_TECNICA", etiqueta: "Falla técnica", descripcion: "El proyector del aula dejó de funcionar." },
    { codigo: "PROBLEMA_AULA", etiqueta: "Problema del aula", descripcion: "El aula no tiene suficientes sillas para todos los estudiantes." },
    { codigo: "OTRO", etiqueta: "Otro", descripcion: "Estudiante solicitó salir del aula por un momento." },
];
const ESTADOS = [
    { codigo: "ABIERTA", etiqueta: "Abierta" },
    { codigo: "EN_REVISION", etiqueta: "En revisión" },
    { codigo: "CERRADA", etiqueta: "Cerrada" },
];
const SEVERIDADES = [
    { codigo: "BAJA", etiqueta: "Baja" },
    { codigo: "MEDIA", etiqueta: "Media" },
    { codigo: "ALTA", etiqueta: "Alta" },
];
const PRIMER_ID = 900001;

const dosDigitos = (n) => String(n).padStart(2, "0");
const fechaLocal = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}T`
    + `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}:00`;

/** Arma 1000 incidencias falsas repartidas entre las aulas reales, los 6 tipos y los 3 estados. */
function incidenciasFalsas(cantidad, aulas) {
    const ahora = Date.now();
    return Array.from({ length: cantidad }, (_, n) => {
        const tipo = TIPOS[n % TIPOS.length];
        const estado = ESTADOS[Math.floor(n / TIPOS.length) % ESTADOS.length];
        const severidad = SEVERIDADES[n % SEVERIDADES.length];
        const aula = aulas[Math.floor(n / 18) % aulas.length]; // así cada aula tiene de todos los tipos y estados
        const id = PRIMER_ID + n;
        return {
            idIncidencia: id, codigo: `INC-${id}`, fechaHora: fechaLocal(new Date(ahora - n * 60_000)),
            idAmbiente: aula.idAmbiente, aula: aula.aula, asignatura: aula.asignatura, idExamen: aula.idExamen,
            tipo: tipo.codigo, tipoEtiqueta: tipo.etiqueta, severidad: severidad.codigo, severidadEtiqueta: severidad.etiqueta,
            estado: estado.codigo, estadoEtiqueta: estado.etiqueta, reportadoPor: "Administrador", estudiante: null,
            descripcion: tipo.descripcion,
        };
    });
}

/** Igual que el servidor: filtra por examen, aula y tipo; los totales no dependen del estado. */
function filtrar(lista, p) {
    const delFiltro = lista
        .filter((i) => !p.get("idExamen") || String(i.idExamen) === p.get("idExamen"))
        .filter((i) => !p.get("idAmbiente") || String(i.idAmbiente) === p.get("idAmbiente"))
        .filter((i) => !p.get("tipo") || i.tipo === p.get("tipo"));
    const totales = {
        abiertas: delFiltro.filter((i) => i.estado === "ABIERTA").length,
        enRevision: delFiltro.filter((i) => i.estado === "EN_REVISION").length,
        cerradas: delFiltro.filter((i) => i.estado === "CERRADA").length,
    };
    const incidencias = delFiltro.filter((i) => !p.get("estado") || i.estado === p.get("estado"))
        .map(({ descripcion, ...fila }) => fila);
    return { totales, incidencias };
}

/**
 * Espera dentro del navegador (revisando en cada cuadro de pantalla) hasta que la tabla muestre
 * exactamente n incidencias y la pestaña diga "Incidencias n". Así el tiempo medido es el de la pantalla,
 * sin la demora propia de las revisiones de Playwright.
 */
async function esperarFilas(page, n) {
    await page.waitForFunction((esperadas) => {
        const main = document.querySelector("main");
        if (!main) return false;
        const tabla = [...main.querySelectorAll("table")].find((t) => t.querySelector("thead")?.textContent.includes("Reportado por"));
        if (!tabla) return false;
        const filas = [...tabla.querySelectorAll("tbody tr")]
            .filter((tr) => /^INC-\d+/.test(tr.firstElementChild?.textContent.trim() || "")).length;
        const pestana = [...main.querySelectorAll("button")]
            .map((b) => b.textContent.trim().match(/^Incidencias\s*(\d+)$/)).find(Boolean);
        return filas === esperadas && pestana && Number(pestana[1]) === esperadas;
    }, n, { polling: "raf", timeout: 60_000 });
}

// Sin video en esta prueba: grabar la pantalla hace más lento al navegador y alteraría los tiempos
test.use({ video: "off" });

test.describe("HU06 · Incidencias (pruebas de carga)", () => {
    test("TC-299 · Con 1000 incidencias, la pantalla muestra cada filtro en menos de 2 s", async ({ page }, testInfo) => {
        test.setTimeout(240_000);
        const CANTIDAD = 1000;
        const LIMITE_MS = 2000;

        await iniciarSesionAdmin(page);

        // Seguro: después de iniciar sesión, ningún pedido que guarde o cambie algo llega al servidor
        const bloqueados = [];
        await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
            if (route.request().method() === "GET") return route.continue();
            bloqueados.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
            return route.abort("blockedbyclient");
        });

        // Las aulas son las reales (solo se consultan); las incidencias, falsas
        let falsas = [];
        let marcarListas;
        const listas = new Promise((resolver) => { marcarListas = resolver; });
        const pedidosLista = [];
        await page.route((url) => /^\/api\/incidencias(\/\d+)?$/.test(url.pathname), async (route) => {
            if (route.request().method() !== "GET") return route.fallback();
            await listas; // la pantalla puede pedir la lista antes de que lleguen las aulas
            const url = new URL(route.request().url());
            const detalle = url.pathname.match(/\/(\d+)$/);
            if (detalle) {
                const inc = falsas.find((i) => i.idIncidencia === Number(detalle[1]));
                if (!inc) return route.fallback();
                return route.fulfill({
                    json: {
                        ...inc, codSisEstudiante: null, estudianteRetirado: false, evidenciaUrl: null,
                        resolucion: null, lineaTiempo: [{ fechaHora: inc.fechaHora, accion: "Registrada", usuario: "Administrador", detalle: null }]
                    }
                });
            }
            pedidosLista.push(url.search || "(sin filtro)");
            return route.fulfill({ json: filtrar(falsas, url.searchParams) });
        });

        // Se arman las incidencias falsas apenas llegan las aulas reales, antes de que la pantalla pida la lista
        let aulasReales = 0;
        const falsasListas = page.waitForResponse((r) => r.url().includes("/api/incidencias/aulas-asignadas"))
            .then(async (r) => {
                const todas = await r.json().catch(() => []);
                aulasReales = Array.isArray(todas) ? todas.length : 0;
                const aulas = Array.isArray(todas) ? todas.slice(0, 3) : [];
                falsas = aulas.length ? incidenciasFalsas(CANTIDAD, aulas) : [];
                marcarListas();
            });
        const inicioCarga = Date.now();
        await page.locator("aside").getByRole("button", { name: /^Incidencias/ }).click();
        await falsasListas;
        expect(falsas.length, `Debe haber aulas para repartir las incidencias falsas (aulas recibidas: ${aulasReales})`)
            .toBe(CANTIDAD);

        const main = page.locator("main");
        const selectTipo = main.locator("select").filter({ has: page.locator("option", { hasText: "Tipo: Todos" }) });
        const selectAula = main.locator("select").filter({ has: page.locator("option", { hasText: "Aula: Todas" }) });
        const aulaElegida = String(falsas[0].idAmbiente);
        const nombreAula = falsas[0].aula;

        /** Cuántas filas debe mostrar la pantalla con esos filtros. */
        const esperadas = ({ tipo, estado, aula }) => falsas
            .filter((i) => !tipo || i.tipo === tipo)
            .filter((i) => !estado || i.estado === estado)
            .filter((i) => !aula || String(i.idAmbiente) === aula).length;

        /**
         * Hace la acción y mide hasta que la pantalla muestra todas las filas del filtro.
         * También anota cuánto tardó el pedido de "ingresos excepcionales" que la pantalla hace en cada cambio de filtro.
         */
        async function medir(lista, nombre, accion, filtro) {
            const n = esperadas(filtro);
            const respExcepcionales = page.waitForResponse((r) => r.url().includes("/api/ingresos-excepcionales"), { timeout: 60_000 })
                .catch(() => null);
            const inicio = Date.now();
            await accion();
            await esperarFilas(page, n);
            const ms = Date.now() - inicio;
            const r = await respExcepcionales;
            let msExcepcionales = null;
            if (r) {
                await r.finished().catch(() => { });
                const fin = r.request().timing().responseEnd;
                msExcepcionales = fin >= 0 ? Math.round(fin) : null;
            }
            lista.push({ nombre, ms, filas: n, msExcepcionales });
        }

        /** Recorre todos los filtros, en el mismo orden, y devuelve los tiempos. */
        async function recorrerFiltros() {
            const lista = [];
            await medir(lista, "Abiertas", () => estadoBtn("Abiertas").click(), { estado: "ABIERTA" });
            await medir(lista, "En revisión", () => estadoBtn("En revisión").click(), { estado: "EN_REVISION" });
            await medir(lista, "Cerradas", () => estadoBtn("Cerradas").click(), { estado: "CERRADA" });
            await medir(lista, "Todas", () => estadoBtn("Todas").click(), {});
            await medir(lista, "Tipo Objeto prohibido", () => selectTipo.selectOption("OBJETO_PROHIBIDO"), { tipo: "OBJETO_PROHIBIDO" });
            await medir(lista, "Tipo Todos", () => selectTipo.selectOption("TODOS"), {});
            await medir(lista, `Aula ${nombreAula}`, () => selectAula.selectOption(aulaElegida), { aula: aulaElegida });
            await medir(lista, `Aula ${nombreAula} + Objeto prohibido`, () => selectTipo.selectOption("OBJETO_PROHIBIDO"),
                { aula: aulaElegida, tipo: "OBJETO_PROHIBIDO" });
            await medir(lista, `Aula ${nombreAula} + Objeto prohibido + Abiertas`, () => estadoBtn("Abiertas").click(),
                { aula: aulaElegida, tipo: "OBJETO_PROHIBIDO", estado: "ABIERTA" });
            return lista;
        }

        /** Vuelve a dejar todos los filtros en "Todos" (sin medir). */
        async function limpiarFiltros() {
            await estadoBtn("Todas").click();
            await esperarFilas(page, esperadas({ aula: aulaElegida, tipo: "OBJETO_PROHIBIDO" }));
            await selectTipo.selectOption("TODOS");
            await esperarFilas(page, esperadas({ aula: aulaElegida }));
            await selectAula.selectOption("TODOS");
            await esperarFilas(page, CANTIDAD);
        }

        const texto = (lista) => lista.map((m) => `${m.nombre} ${(m.ms / 1000).toFixed(2)} s (${m.filas} filas`
            + `${m.msExcepcionales === null ? "" : `; ingresos excepcionales ${(m.msExcepcionales / 1000).toFixed(2)} s`})`).join(" | ");

        // Apertura de la sección: solo como dato (incluye consultas reales al servidor, como las aulas;
        // no es un filtro, así que no se compara con el límite)
        await esperarFilas(page, CANTIDAD);
        const msApertura = Date.now() - inicioCarga;
        const estadoBtn = (txt) => main.getByRole("button", { name: new RegExp(`^${txt}( \\d+)?$`) });

        // Ronda 1 · como lo vive el usuario: los ingresos excepcionales los responde el servidor real (solo consulta)
        let ultimosExcepcionales = [];
        page.on("response", async (r) => {
            if (r.url().includes("/api/ingresos-excepcionales") && r.ok()) {
                ultimosExcepcionales = await r.json().catch(() => ultimosExcepcionales);
            }
        });
        const ronda1 = await recorrerFiltros();
        await captura(page, testInfo, "TC-299-filtro-combinado", { fullPage: false });

        // Ronda 2 · solo la pantalla: los ingresos excepcionales también los responde la prueba (con los mismos datos reales)
        await limpiarFiltros();
        await page.route((url) => url.pathname === "/api/ingresos-excepcionales", async (route) => {
            if (route.request().method() !== "GET") return route.fallback();
            return route.fulfill({ json: ultimosExcepcionales });
        });
        const ronda2 = await recorrerFiltros();

        const masLento = (lista) => Math.max(...lista.map((m) => m.ms));
        await evidencia(testInfo, "TC-299-PANTALLA", `${CANTIDAD} incidencias falsas (solo existen dentro de la prueba) · `
            + `Apertura de la sección (dato): ${(msApertura / 1000).toFixed(2)} s · `
            + `RONDA 1, como lo vive el usuario (ingresos excepcionales del servidor real): ${texto(ronda1)} · `
            + `El más lento: ${(masLento(ronda1) / 1000).toFixed(2)} s · `
            + `RONDA 2, solo la pantalla (todo respondido por la prueba): ${texto(ronda2)} · `
            + `El más lento: ${(masLento(ronda2) / 1000).toFixed(2)} s · Límite: ${LIMITE_MS / 1000} s · `
            + `Pedidos de lista respondidos por la prueba: ${pedidosLista.length} · `
            + `Pedidos de guardado bloqueados: ${bloqueados.length ? bloqueados.join(" | ") : "ninguno"}`);

        for (const m of ronda1) {
            expect.soft(m.ms, `Ronda 1 · El filtro "${m.nombre}" debe mostrarse en menos de ${LIMITE_MS / 1000} s`).toBeLessThan(LIMITE_MS);
        }
        for (const m of ronda2) {
            expect.soft(m.ms, `Ronda 2 · El filtro "${m.nombre}" debe mostrarse en menos de ${LIMITE_MS / 1000} s`).toBeLessThan(LIMITE_MS);
        }
    });
});