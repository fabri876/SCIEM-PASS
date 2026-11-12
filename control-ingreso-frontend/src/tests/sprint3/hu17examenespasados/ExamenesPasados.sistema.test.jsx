import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CargaExamenesPasados from "../../../pages/admin/components/CargaExamenesPasados";
import ExamenesPasados from "../../../pages/examenesHome/ExamenesPasados";

// HU17 · Sección de Exámenes Pasados · TC-197, TC-202 y TC-205 (pruebas de sistema).
// Se simula la respuesta del servidor: estas pruebas no llaman al backend ni a Supabase.
// El encabezado se reemplaza por uno vacío porque no es parte de lo que se prueba.
vi.mock("../../../components/layout/Header", () => ({ default: () => null }));

const DOCUMENTO = {
    intId: 12,
    strNombre: "Primer examen de ingreso FCyT 1-2025",
    strPeriodo: "1-2025",
    strFecha: "2025-01-23",
    strObservaciones: "Fuente de prueba",
};

// Respuesta correcta del servidor con los datos indicados
function respuesta(datos) {
    return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => datos,
        blob: async () => new Blob(["%PDF-1.4"], { type: "application/pdf" }),
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("HU17 Exámenes pasados · Pruebas de sistema", () => {
    it("TC-197 · Al arrastrar un PDF a la zona de carga se adjunta y se muestra su nombre", () => {
        vi.stubGlobal("fetch", vi.fn(() => respuesta([])));
        render(<CargaExamenesPasados />);

        const zona = screen.getByText("Seleccionar PDF del examen").closest("label");
        const archivo = new File(["%PDF-1.4"], "examen-prueba.pdf", { type: "application/pdf" });
        const dataTransfer = {
            files: [archivo],
            items: [{ kind: "file", type: "application/pdf", getAsFile: () => archivo }],
            types: ["Files"],
        };
        fireEvent.dragEnter(zona, { dataTransfer });
        fireEvent.dragOver(zona, { dataTransfer });
        fireEvent.drop(zona, { dataTransfer });

        const adjunto = screen.queryByText(/examen-prueba\.pdf/);
        console.log(`[EVIDENCIA] TC-197 · Se soltó "examen-prueba.pdf" sobre la zona "Seleccionar PDF del examen"`);
        console.log(`[EVIDENCIA]   Nombre del archivo adjunto en pantalla: ${adjunto ? adjunto.textContent : "no aparece"}`);

        expect(adjunto, "El PDF soltado sobre la zona de carga debe adjuntarse y mostrar su nombre").not.toBeNull();
    });

    it("TC-202 · Si la descarga falla aparece \"No se pudo descargar el archivo del examen.\"", async () => {
        // La lista carga bien, pero al pedir el PDF el servidor no responde
        vi.stubGlobal("fetch", vi.fn((url) =>
            String(url).includes("/pdf") ? Promise.reject(new TypeError("Failed to fetch")) : respuesta([DOCUMENTO])));
        const user = userEvent.setup();
        render(<MemoryRouter><ExamenesPasados /></MemoryRouter>);

        await user.click(await screen.findByRole("button", { name: /Descargar PDF/ }));
        const alerta = await screen.findByRole("alert");
        console.log(`[EVIDENCIA] TC-202 · Se presionó "Descargar PDF" y el servidor no respondió`);
        console.log(`[EVIDENCIA]   Mensaje mostrado: "${alerta.textContent}"`);
        console.log(`[EVIDENCIA]   Mensaje esperado: "No se pudo descargar el archivo del examen."`);

        expect(alerta).toHaveTextContent("No se pudo descargar el archivo del examen.");
    });

    it("TC-205 · Sin exámenes cargados se muestra \"Aún no hay exámenes pasados\"", async () => {
        vi.stubGlobal("fetch", vi.fn(() => respuesta([])));
        render(<MemoryRouter><ExamenesPasados /></MemoryRouter>);

        const mensaje = await screen.findByText(/No hay documentos|Aún no hay exámenes pasados/);
        console.log(`[EVIDENCIA] TC-205 · La lista de exámenes pasados no tiene documentos`);
        console.log(`[EVIDENCIA]   Mensaje mostrado: "${mensaje.textContent}"`);
        console.log(`[EVIDENCIA]   Mensaje esperado: "Aún no hay exámenes pasados"`);

        expect(screen.queryByText("Aún no hay exámenes pasados"),
            "Con la lista vacía debe mostrarse \"Aún no hay exámenes pasados\"").not.toBeNull();
    });
});