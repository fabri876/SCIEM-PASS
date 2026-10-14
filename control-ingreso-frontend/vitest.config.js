import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Configuración solo para las pruebas (no toca vite.config.js ni el PWA).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.js",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
