import { test, expect } from "@playwright/test";
import { captura, evidencia, iniciarSesionAdmin, tarjetaCargaMasiva } from "../sistema.apoyo.js";
import { bloquearGuardado, excelEstudiantes, generarEstudiantes } from "../carga.apoyo.js";

// HU01 · Carga masiva de usuarios (pruebas de carga) sobre el sistema publicado.
// TC-294 solo usa la vista previa: no se confirma la carga y no se guarda ningún usuario.
// Además, la prueba bloquea cualquier pedido de guardado por si algo se pulsara por error.
// TC-295 registra 10 estudiantes y SIEMPRE los elimina al terminar (aunque la prueba falle).

/** Elige la primera asignatura que tenga un grupo activo (la vista previa no guarda, así que da igual cuál). */
async function elegirGrupoDelLote(page) {
    const tarjeta = tarjetaCargaMasiva(page);
    const asignatura = tarjeta.getByLabel("Asignatura del lote");
    const grupo = tarjeta.getByLabel("Grupo del lote");
    await expect(asignatura).toBeEnabled();
    const opciones = await asignatura.locator("option").evaluateAll((ops) => ops.map((o) => ({ valor: o.value, texto: o.textContent })));

    for (const op of opciones.filter((o) => o.valor)) {
        // Se espera la respuesta del servidor con los grupos de esa asignatura
        const respuestaGrupos = page.waitForResponse((r) => r.url().includes(`/api/grupos/asignaturas/${op.valor}`));
        await asignatura.selectOption(op.valor);
        await respuestaGrupos;
        await expect(grupo.locator("option").first()).not.toHaveText(/Cargando/);
        const grupos = await grupo.locator("option").evaluateAll((ops) => ops.filter((o) => o.value).map((o) => ({ valor: o.value, texto: o.textContent })));
        if (grupos.length) {
            await grupo.selectOption(grupos[0].valor);
            return `${op.texto} · ${grupos[0].texto}`;
        }
    }
    throw new Error("No hay ninguna asignatura con un grupo activo para elegir el lote.");
}

test.describe("HU01 · Carga masiva de usuarios (pruebas de carga)", () => {
    test("TC-294 · La vista previa de 2000 filas válidas aparece en menos de 5 s", async ({ page }, testInfo) => {
        const CANTIDAD = 2000;
        const LIMITE_MS = 5000;
        const bloqueados = await bloquearGuardado(page);

        await iniciarSesionAdmin(page);
        const tarjeta = tarjetaCargaMasiva(page);
        await tarjeta.getByRole("button", { name: "Estudiantes", exact: true }).click();
        const lote = await elegirGrupoDelLote(page);

        const estudiantes = generarEstudiantes(CANTIDAD);
        const archivo = await excelEstudiantes(estudiantes, "estudiantes-2000.xlsx");

        // Al elegir el archivo, la pantalla pide la vista previa sola. Desde aquí se mide.
        const respuestaPromesa = page.waitForResponse((r) => r.url().includes("/api/usuarios/carga-masiva/vista-previa"), { timeout: 60_000 });
        const inicio = Date.now();
        await tarjeta.getByLabel("Seleccionar archivo de usuarios").setInputFiles(archivo);
        const respuesta = await respuestaPromesa;
        const msServidor = Date.now() - inicio;

        const ventana = page.getByRole("dialog").filter({ hasText: "registros encontrados" }).last();
        await expect(ventana.getByText(`${CANTIDAD} registros encontrados`)).toBeVisible({ timeout: 60_000 });
        await expect(ventana.locator("tbody tr")).toHaveCount(CANTIDAD, { timeout: 60_000 });
        const msTotal = Date.now() - inicio;

        const filasMostradas = await ventana.locator("tbody tr").count();
        const primeras = (await ventana.locator("tbody tr").evaluateAll((trs) => trs.slice(0, 3).map((tr) => tr.children[1]?.textContent?.trim())));
        const avisoSinGuardar = await ventana.getByText("Todavía no se ha registrado ningún usuario.", { exact: false }).isVisible();
        await captura(page, testInfo, "TC-294-vista-previa-2000", { fullPage: false });

        // Se cierra la vista previa SIN guardar
        await ventana.getByRole("button", { name: "Volver sin guardar" }).click();
        await expect(page.getByText("registros encontrados")).toHaveCount(0);

        await evidencia(testInfo, "TC-294", `Lote elegido: ${lote} · Archivo: ${CANTIDAD} filas (${Math.round(archivo.buffer.length / 1024)} KB) · `
            + `Respuesta del servidor: ${respuesta.status()} en ${(msServidor / 1000).toFixed(2)} s · `
            + `Vista previa completa en pantalla: ${(msTotal / 1000).toFixed(2)} s (límite ${LIMITE_MS / 1000} s) · `
            + `Filas mostradas: ${filasMostradas} · Primeras: ${primeras.join(", ")} · `
            + `Aviso "Todavía no se ha registrado ningún usuario": ${avisoSinGuardar ? "sí" : "no"} · `
            + `Pedidos de guardado bloqueados: ${bloqueados.length ? bloqueados.join(" | ") : "ninguno (no se intentó guardar)"}`);

        expect(respuesta.status(), "La vista previa debe responder bien").toBe(200);
        expect(filasMostradas, "Deben mostrarse las 2000 filas").toBe(CANTIDAD);
        expect(bloqueados, "La prueba nunca debe intentar guardar usuarios").toEqual([]);
        expect(msTotal, `La vista previa debe aparecer en menos de ${LIMITE_MS / 1000} s`).toBeLessThan(LIMITE_MS);
    });

    test("TC-295 · 10 registros individuales a la vez responden en menos de 2 s", async ({ page }, testInfo) => {
        test.setTimeout(300_000);
        const CANTIDAD = 10;
        const LIMITE_MS = 2000;
        const ESPERA_MAXIMA_MS = 120_000; // se espera a cada registro hasta 2 minutos, para conocer su tiempo real

        // Se inicia sesión como administrador y se toma la dirección del servidor y el token de la sesión
        const loginPromesa = page.waitForResponse((r) => r.url().includes("/api/auth/login"));
        await iniciarSesionAdmin(page);
        const servidor = new URL((await loginPromesa).url()).origin;
        const token = await page.evaluate(() => localStorage.getItem("token"));
        const api = (metodo, ruta, datos, espera = 60_000) => page.request.fetch(`${servidor}${ruta}`, {
            method: metodo,
            headers: { Authorization: `Bearer ${token}` },
            ...(datos ? { data: datos } : {}),
            timeout: espera,
        });

        const estudiantes = generarEstudiantes(CANTIDAD, 1990);
        const correos = estudiantes.map((e) => e.correo.toLowerCase());
        const buscarDePrueba = async () => (await (await api("GET", "/api/admin/usuarios")).json())
            .filter((u) => correos.includes(String(u.correo).toLowerCase()));

        // Grupo activo para los estudiantes (el registro de un estudiante exige asignatura y grupo)
        let grupo = null;
        for (const a of await (await api("GET", "/api/grupos/catalogo")).json()) {
            const activos = (await (await api("GET", `/api/grupos/asignaturas/${a.idAsignatura}`)).json()).filter((g) => g.estadoGrupo);
            if (activos.length) { grupo = { ...activos[0], asignatura: a.nombreAsignatura }; break; }
        }
        expect(grupo, "Debe existir al menos un grupo activo").not.toBeNull();

        // Seguro: si alguno de esos correos ya existe, NO se toca nada y la prueba se detiene
        const previos = await buscarDePrueba();
        expect(previos.map((u) => u.correo), "Ninguno de los correos de prueba debe existir antes de empezar").toEqual([]);

        let resultados = [];
        let msTotal = 0;
        const eliminados = [];
        let quedan = [];
        try {
            // Los 10 registros se envían al mismo tiempo y se espera a TODOS, aunque alguno tarde
            const inicio = Date.now();
            resultados = await Promise.all(estudiantes.map(async (e) => {
                const t0 = Date.now();
                try {
                    const r = await api("POST", "/api/usuarios/registro-individual", {
                        nombre: e.nombres, apellido: e.apellidos, ci: e.ci, correo: e.correo,
                        telefono: e.telefono, rol: "ESTUDIANTE", codigoSis: e.codsis, idGrupo: grupo.idGrupo,
                    }, ESPERA_MAXIMA_MS);
                    const cuerpo = await r.json().catch(() => ({}));
                    return { nombre: `${e.nombres} ${e.apellidos}`, estado: r.status(), ms: Date.now() - t0, mensaje: cuerpo.mensaje || cuerpo.message || "" };
                } catch {
                    return { nombre: `${e.nombres} ${e.apellidos}`, estado: "sin respuesta", ms: Date.now() - t0, mensaje: `no respondió en ${ESPERA_MAXIMA_MS / 1000} s` };
                }
            }));
            msTotal = Date.now() - inicio;
        } finally {
            // Limpieza: se eliminan por correo TODOS los estudiantes de esta prueba, pase lo que pase
            // (también los que el servidor guardó tarde). Antes de empezar se comprobó que esos correos no existían.
            for (const u of await buscarDePrueba()) {
                const r = await api("DELETE", `/api/admin/usuarios/${u.idUsuario}`);
                eliminados.push(`${u.idUsuario}:${r.status()}`);
            }
            quedan = (await buscarDePrueba()).map((u) => `${u.idUsuario} ${u.correo}`);
        }

        const tiempos = resultados.map((r) => r.ms);
        const masLento = Math.max(...tiempos);
        const conError = resultados.filter((r) => r.estado !== 201);
        const lentos = resultados.filter((r) => r.ms >= LIMITE_MS).length;
        await evidencia(testInfo, "TC-295", `Grupo usado: ${grupo.asignatura} · Grupo ${grupo.nombreGrupo} · `
            + `${CANTIDAD} registros enviados a la vez · Respuestas: ${resultados.map((r) => r.estado).join(", ")} · `
            + `Tiempo de cada uno (s): ${tiempos.map((t) => (t / 1000).toFixed(2)).join(", ")} · `
            + `El más lento: ${(masLento / 1000).toFixed(2)} s (límite ${LIMITE_MS / 1000} s) · `
            + `Registros que pasaron el límite: ${lentos} de ${CANTIDAD} · Los 10 juntos: ${(msTotal / 1000).toFixed(2)} s · `
            + `Con error: ${conError.length ? JSON.stringify(conError) : "ninguno"} · `
            + `Eliminados al terminar (id:respuesta): ${eliminados.join(", ") || "ninguno"} · `
            + `Usuarios de prueba que quedaron guardados: ${quedan.length}${quedan.length ? ` (${quedan.join(" | ")})` : ""}`);

        expect(quedan, "No debe quedar ningún estudiante de prueba en la base de datos").toEqual([]);
        expect.soft(conError, "Los 10 registros deben guardarse bien (201)").toEqual([]);
        expect.soft(masLento, `Cada registro debe responder en menos de ${LIMITE_MS / 1000} s`).toBeLessThan(LIMITE_MS);
    });
});