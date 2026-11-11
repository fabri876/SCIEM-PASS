import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CargaExamenesPasados from "../../../pages/admin/components/CargaExamenesPasados";

// HU17 · Sección de Exámenes Pasados · TC-037 (prueba unitaria).
// Se simulan los servicios: esta prueba no llama al backend ni a Supabase.
vi.mock("../../../services/examenesPasadosService", () => ({
    obtenerExamenesPasados: vi.fn().mockResolvedValue([]),
    descargarExamenPasado: vi.fn(),
    guardarExamenPasado: vi.fn(),
}));

describe("HU17 Exámenes pasados · TC-037 · Contador de observaciones", () => {
    it("TC-037 · El contador de observaciones cuenta los caracteres y se detiene en 500", async () => {
        const user = userEvent.setup({ delay: null });
        render(<CargaExamenesPasados />);

        // Campo de observaciones del formulario de carga ("Descripción o fuente")
        const campo = screen.getByLabelText(/Descripción o fuente/i);
        await user.type(campo, "a".repeat(600));

        const largo = campo.value.length;
        const contador = screen.queryByText(/\d+\s*\/\s*500/);
        console.log(`[EVIDENCIA] TC-037 · Se escribieron 600 caracteres en "Descripción o fuente"`);
        console.log(`[EVIDENCIA]   Caracteres que quedaron en el campo: ${largo} (esperado: 500)`);
        console.log(`[EVIDENCIA]   Límite del campo en el formulario: ${campo.maxLength} caracteres`);
        console.log(`[EVIDENCIA]   Contador de caracteres en pantalla: ${contador ? contador.textContent : "no existe"}`);

        expect.soft(contador, "Debe mostrarse un contador de caracteres con el máximo de 500").not.toBeNull();
        expect.soft(largo, "El campo debe detenerse en 500 caracteres").toBe(500);
    }, 30000);
});