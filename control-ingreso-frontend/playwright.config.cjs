const { defineConfig, devices } = require("@playwright/test");

// Pruebas de sistema (*.sistema.spec.js) y de carga (*.carga.spec.js) de QA · sprint 2,
// sobre el sistema publicado.
module.exports = defineConfig({
    testDir: "./src/tests",
    testMatch: /\.(sistema|carga)\.spec\.js$/,
    outputDir: "./resultados-sistema",
    timeout: 90_000,
    expect: { timeout: 20_000 },
    workers: 1,
    reporter: [["list"], ["html", { outputFolder: "reporte-sistema", open: "never" }]],
    use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.QA_URL || "https://sciem-pass.vercel.app",
        locale: "es-BO",
        screenshot: "on",
        video: "retain-on-failure",
        trace: "retain-on-failure",
    },
});