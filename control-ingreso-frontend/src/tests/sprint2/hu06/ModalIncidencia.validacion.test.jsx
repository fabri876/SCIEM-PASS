import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalIncidencia from "../../../components/incidencias/ModalIncidencia";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
vi.mock("../../../services/incidenciaService", () => ({
    consultarEstudianteIncidencia: vi.fn(),
    registrarIncidencia: vi.fn(),
    notificarCambioIncidencias: vi.fn(),
}));

const AULAS = [{ idAmbiente: 1, aula: "Aula 601", asignatura: "Cálculo I", fechaExamen: "2026-10-14" }];

function archivo(nombre, tipo, megas) {
    const file = new File(["contenido"], nombre, { type: tipo });
    Object.defineProperty(file, "size", { value: Math.round(megas * 1024 * 1024) });
    return file;
}

// applyAccept: false permite elegir cualquier tipo de archivo, como cuando el
// usuario cambia a "Todos los archivos" en la ventana de selección.
function abrir() {
    const user = userEvent.setup({ applyAccept: false });
    const vista = render(<ModalIncidencia boolAbierto onCerrar={vi.fn()} aulasDisponibles={AULAS} />);
    return { user, vista };
}

const botonRegistrar = () => screen.getByRole("button", { name: /registrar incidencia/i });

beforeAll(() => {
    // El navegador de pruebas no genera vistas previas de imágenes: se simula.
    globalThis.URL.createObjectURL = vi.fn(() => "blob:vista-previa");
    globalThis.URL.revokeObjectURL = vi.fn();
});

describe("HU06 · Registrar incidencia (pruebas de validación)", () => {
    it("TC-185 · Registrar incidencia muestra aula, examen, hora, tipos y severidad", () => {
        abrir();

        expect(screen.getByText(/Aula 601 · Cálculo I · 14\/10\/2026 · .*\(automático\)/)).toBeInTheDocument();
        for (const tipo of ["Suplantación", "Objeto prohibido", "Conducta inapropiada", "Falla técnica", "Problema del aula", "Otro"]) {
            expect(screen.getByRole("button", { name: tipo })).toBeInTheDocument();
        }
        for (const severidad of ["Baja", "Media", "Alta"]) {
            expect(screen.getByRole("button", { name: severidad })).toBeInTheDocument();
        }
        expect(screen.getByText(/^Estudiante involucrado/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/describe qué ocurrió/i)).toBeInTheDocument();
        expect(screen.getByText(/^Foto de evidencia/)).toBeInTheDocument();
    });

    it("TC-186 · Sin tipo, severidad o 15 caracteres el registro queda bloqueado", async () => {
        const { user } = abrir();
        const aviso = () => screen.getByText(/Para registrar falta/);

        expect(botonRegistrar()).toBeDisabled();
        expect(aviso()).toHaveTextContent("el tipo");
        expect(aviso()).toHaveTextContent("la severidad");

        await user.click(screen.getByRole("button", { name: "Otro" }));
        expect(botonRegistrar()).toBeDisabled();
        expect(aviso()).not.toHaveTextContent("el tipo");

        await user.click(screen.getByRole("button", { name: "Media" }));
        await user.type(screen.getByPlaceholderText(/describe qué ocurrió/i), "a".repeat(14));
        expect(botonRegistrar()).toBeDisabled();
        expect(aviso()).toHaveTextContent("al menos 15 caracteres");

        await user.type(screen.getByPlaceholderText(/describe qué ocurrió/i), "a");
        expect(botonRegistrar()).toBeEnabled();
        expect(screen.queryByText(/Para registrar falta/)).not.toBeInTheDocument();
    });

    it("TC-187 · La evidencia acepta JPG o PNG hasta 5 MB y rechaza otros formatos", async () => {
        const { user, vista } = abrir();
        const entrada = () => vista.container.querySelector('input[type="file"]');

        await user.upload(entrada(), archivo("documento.pdf", "application/pdf", 1));
        expect(screen.getByText(/La imagen debe ser JPG o PNG/)).toBeInTheDocument();

        await user.upload(entrada(), archivo("foto-grande.jpg", "image/jpeg", 6));
        expect(screen.getByText(/La imagen supera los 5 MB/)).toBeInTheDocument();

        await user.upload(entrada(), archivo("evidencia.png", "image/png", 2));
        expect(screen.getByAltText("Evidencia")).toBeInTheDocument();
        expect(screen.getByText("evidencia.png")).toBeInTheDocument();
        expect(screen.queryByText(/La imagen supera los 5 MB/)).not.toBeInTheDocument();
    });
});