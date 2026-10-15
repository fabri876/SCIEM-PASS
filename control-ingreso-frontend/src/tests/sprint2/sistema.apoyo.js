import { expect } from "@playwright/test";

// Ayudas comunes de las pruebas de sistema (QA · sprint 2).
// La contraseña NUNCA va en el código: se lee de variables de entorno de la terminal.

export function credencialesAdmin() {
    const correo = process.env.QA_ADMIN_CORREO;
    const password = process.env.QA_ADMIN_PASSWORD;
    if (!correo || !password) {
        throw new Error("Faltan las variables QA_ADMIN_CORREO y QA_ADMIN_PASSWORD en la terminal.");
    }
    return { correo, password };
}

/**
 * Abre una pantalla del sistema publicado.
 * Se entra por la página principal y luego se cambia de pantalla dentro de la aplicación,
 * porque en el publicado abrir directamente una dirección como /login responde 404.
 */
export async function abrirPantalla(page, ruta) {
    await page.goto("/");
    await page.evaluate((destino) => {
        window.history.pushState({}, "", destino);
        window.dispatchEvent(new PopStateEvent("popstate"));
    }, ruta);
}

/** Inicia sesión como administrador en el sistema publicado y espera su panel. */
export async function iniciarSesionAdmin(page) {
    const { correo, password } = credencialesAdmin();
    await abrirPantalla(page, "/login");
    await page.getByLabel("Correo").fill(correo);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: /Iniciar sesión/ }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    await expect(page.getByRole("button", { name: "Formato", exact: true })).toBeVisible();
}

/** Tarjeta de carga masiva del panel del administrador. */
export function tarjetaCargaMasiva(page) {
    return page.locator("div")
        .filter({ has: page.getByText("¿Qué vas a cargar?") })
        .filter({ has: page.getByRole("button", { name: "Formato", exact: true }) })
        .last();
}

/** Deja una línea de evidencia en la terminal y la adjunta al reporte. */
export async function evidencia(testInfo, tc, detalle) {
    console.log(`[EVIDENCIA ${tc}] ${detalle}`);
    await testInfo.attach(`evidencia-${tc}`, { body: detalle, contentType: "text/plain" });
}

/** Captura de pantalla adjunta al reporte (y guardada en resultados-sistema). */
export async function captura(page, testInfo, nombre, opciones = {}) {
    const ruta = testInfo.outputPath(`${nombre}.png`);
    await page.screenshot({ path: ruta, fullPage: true, ...opciones });
    await testInfo.attach(nombre, { path: ruta, contentType: "image/png" });
}