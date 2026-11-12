import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CargaExamenesPasados from "../../../pages/admin/components/CargaExamenesPasados";

// HU17 · Sección de Exámenes Pasados · Pruebas de validación del formulario
// (TC-281, TC-288, TC-289, TC-290 y TC-291).
// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase y no guardan nada.
vi.mock("../../../services/examenesPasadosService", () => ({
    obtenerExamenesPasados: vi.fn().mockResolvedValue([]),
    descargarExamenPasado: vi.fn(),
    guardarExamenPasado: vi.fn(),
}));

const MB = 1024 * 1024;

function archivo(nombre, tipo, bytes) {
    const file = new File(["contenido"], nombre, { type: tipo });
    Object.defineProperty(file, "size", { value: bytes });
    return file;
}

// applyAccept: false permite elegir cualquier tipo de archivo, como cuando el
// usuario cambia el filtro del explorador a "Todos los archivos".
function preparar() {
    const user = userEvent.setup({ applyAccept: false, delay: null });
    render(<CargaExamenesPasados />);
    return { user, input: screen.getByLabelText("Seleccionar PDF del examen") };
}

function mensajeError() {
    const alerta = screen.queryByRole("alert");
    return alerta ? alerta.textContent : "ninguno";
}

describe("HU17 Exámenes pasados · Validación del formulario de carga", () => {
    it("TC-281 · El título del documento no admite más de 200 caracteres", async () => {
        const { user } = preparar();
        const titulo = screen.getByLabelText(/Título del documento/i);
        await user.type(titulo, "a".repeat(250));

        console.log(`[EVIDENCIA] TC-281 · Se escribieron 250 caracteres en "Título del documento"`);
        console.log(`[EVIDENCIA]   Caracteres que quedaron en el campo: ${titulo.value.length} (esperado: 200)`);
        expect(titulo.value.length).toBe(200);
    }, 30000);

    it("TC-288 · Al adjuntar un .docx o .jpg aparece \"Solo se permiten archivos PDF\"", async () => {
        const { user, input } = preparar();
        const resultados = [];
        for (const [nombre, tipo] of [["examen.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["foto.jpg", "image/jpeg"]]) {
            await user.upload(input, archivo(nombre, tipo, 0.5 * MB));
            resultados.push([nombre, mensajeError(), screen.queryByText(new RegExp(nombre.replace(".", "\\.")))]);
        }
        for (const [nombre, mensaje] of resultados)
            console.log(`[EVIDENCIA] TC-288 · ${nombre} -> mensaje mostrado: "${mensaje}" (esperado: "Solo se permiten archivos PDF")`);

        for (const [nombre, mensaje, adjunto] of resultados) {
            expect.soft(adjunto, `${nombre} no debe quedar adjunto`).toBeNull();
            expect.soft(mensaje, `${nombre} debe mostrar "Solo se permiten archivos PDF"`).toContain("Solo se permiten archivos PDF");
        }
    });

    it("TC-289 · Un PDF de más de 10 MB muestra \"El archivo supera el tamaño máximo de 10 MB\"", async () => {
        const { user, input } = preparar();
        await user.upload(input, archivo("examen-grande.pdf", "application/pdf", 11 * MB));
        const mensaje = mensajeError();

        console.log(`[EVIDENCIA] TC-289 · PDF de 11 MB -> mensaje mostrado: "${mensaje}" (esperado: "El archivo supera el tamaño máximo de 10 MB")`);
        expect.soft(screen.queryByText(/examen-grande\.pdf/), "El PDF de 11 MB no debe quedar adjunto").toBeNull();
        expect.soft(mensaje).toContain("El archivo supera el tamaño máximo de 10 MB");
    });

    it("TC-290 · Un PDF de 10 MB exactos se acepta sin mostrar error", async () => {
        const { user, input } = preparar();
        await user.upload(input, archivo("examen-10mb.pdf", "application/pdf", 10 * MB));
        const adjunto = screen.queryByText(/examen-10mb\.pdf/);

        console.log(`[EVIDENCIA] TC-290 · PDF de 10 MB exactos -> adjunto: ${adjunto ? adjunto.textContent : "no"} · mensaje de error: "${mensajeError()}"`);
        expect.soft(adjunto, "El PDF de 10 MB exactos debe quedar adjunto").not.toBeNull();
        expect.soft(screen.queryByRole("alert"), "No debe mostrarse ningún error").toBeNull();
    });

    it("TC-291 · Al pegar más de 500 caracteres en observaciones el texto se corta en 500", async () => {
        const { user } = preparar();
        const campo = screen.getByLabelText(/Descripción o fuente/i);
        await user.click(campo);
        await user.paste("a".repeat(600));

        console.log(`[EVIDENCIA] TC-291 · Se pegaron 600 caracteres en "Descripción o fuente"`);
        console.log(`[EVIDENCIA]   Caracteres que quedaron en el campo: ${campo.value.length} (esperado: 500)`);
        expect(campo.value.length).toBe(500);
    });
});