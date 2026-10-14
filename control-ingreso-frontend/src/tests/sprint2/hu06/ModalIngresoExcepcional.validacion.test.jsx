import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalIngresoExcepcional from "../../../components/incidencias/ModalIngresoExcepcional";
import { consultarEstudianteExcepcional } from "../../../services/ingresoExcepcionalService";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
vi.mock("../../../services/authService", () => ({
    obtenerUsuarioActual: vi.fn(() => ({ nombre: "Ana", apellido: "Pérez" })),
}));
vi.mock("../../../services/ingresoExcepcionalService", () => ({
    consultarEstudianteExcepcional: vi.fn(),
    autorizarIngresoExcepcional: vi.fn(),
}));
vi.mock("../../../services/incidenciaService", () => ({
    notificarCambioIncidencias: vi.fn(),
}));

const AFORO = { ocupados: 56, capacidad: 60, disponibles: 4 };
const AULAS = [
    { idAmbiente: 1, aula: "Aula 601", asignatura: "Cálculo I", fechaExamen: "2026-10-14", ingresoCerrado: false, aforo: AFORO },
];

const ESTUDIANTE = { nombreCompleto: "QA Masiva Prueba Cuatro", ci: "9900104", codSis: 202301004, aforo: AFORO, ingresoCerrado: false };

const INHABILITADO = {
    ...ESTUDIANTE,
    estado: "INHABILITADO",
    mensaje: "Inhabilitado para este examen.",
    puedeAutorizarExcepcional: true,
    puedeRegistrarIncidencia: true,
};
const DUPLICADO = {
    ...ESTUDIANTE,
    estado: "DUPLICADO",
    mensaje: "El estudiante ya registró su ingreso a las 07:41 en Aula 601.",
    horaIngresoPrevio: "2026-10-14T07:41:00",
    puedeAutorizarExcepcional: false,
    puedeRegistrarIncidencia: true,
};
const NO_ENCONTRADO = {
    estado: "NO_ENCONTRADO",
    mensaje: "Estudiante no encontrado: no está registrado en el sistema, por eso no se puede autorizar su ingreso.",
    puedeAutorizarExcepcional: false,
    puedeRegistrarIncidencia: true,
    aforo: AFORO,
    ingresoCerrado: false,
};

// Busca al estudiante y espera el resultado. applyAccept: false permite elegir
// cualquier tipo de archivo, como cuando el usuario cambia a "Todos los archivos".
async function buscar(resultado) {
    consultarEstudianteExcepcional.mockResolvedValue(resultado);
    const user = userEvent.setup({ applyAccept: false });
    const vista = render(<ModalIngresoExcepcional boolAbierto onCerrar={vi.fn()} aulasDisponibles={AULAS} />);
    await user.type(screen.getByPlaceholderText("CI o Código SIS"), "9900104");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText(resultado.mensaje);
    return { user, vista };
}

async function abrirFormulario() {
    const datos = await buscar(INHABILITADO);
    await datos.user.click(screen.getByRole("button", { name: /autorizar ingreso excepcional/i }));
    return datos;
}

const boton = (nombre) => screen.queryByRole("button", { name: nombre });

function archivo(nombre, tipo, megas) {
    const file = new File(["contenido"], nombre, { type: tipo });
    Object.defineProperty(file, "size", { value: Math.round(megas * 1024 * 1024) });
    return file;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("HU06 · Ingreso excepcional (pruebas de validación)", () => {
    it("TC-177 · Un inhabilitado muestra Autorizar, Registrar incidencia y Rechazar", async () => {
        await buscar(INHABILITADO);

        expect(boton(/autorizar ingreso excepcional/i)).toBeInTheDocument();
        expect(boton(/registrar incidencia/i)).toBeInTheDocument();
        expect(boton(/rechazar y continuar/i)).toBeInTheDocument();
    });

    it("TC-178 · Un duplicado muestra solo la opción Registrar incidencia", async () => {
        await buscar(DUPLICADO);

        expect(boton(/registrar incidencia/i)).toBeInTheDocument();
        expect(boton(/autorizar ingreso excepcional/i)).not.toBeInTheDocument();
        expect(boton(/rechazar y continuar/i)).not.toBeInTheDocument();
    });

    it("TC-192 · Un no encontrado no ofrece Autorizar ingreso excepcional", async () => {
        await buscar(NO_ENCONTRADO);

        expect(boton(/autorizar ingreso excepcional/i)).not.toBeInTheDocument();
        expect(boton(/registrar incidencia/i)).toBeInTheDocument();
        expect(boton(/rechazar y continuar/i)).toBeInTheDocument();
    });

    it("TC-179 · La ventana muestra estudiante, motivos, quién autoriza, observación, respaldo y aforo", async () => {
        await abrirFormulario();

        expect(screen.getByText("QA Masiva Prueba Cuatro")).toBeInTheDocument();
        expect(screen.getByText(/SIS 202301004/)).toBeInTheDocument();
        for (const motivo of ["Sin carnet o QR", "No figura en la lista", "Llegada tardía", "Traslado desde otra aula"]) {
            expect(screen.getByText(motivo)).toBeInTheDocument();
        }
        expect(screen.getByText("Docente que autoriza")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Ana Pérez")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/explica por qué se autoriza/i)).toBeInTheDocument();
        expect(screen.getByText(/^Respaldo/)).toBeInTheDocument();
        expect(screen.getByText("56 / 60 · quedan 4")).toBeInTheDocument();
    });

    it("TC-180 · Sin motivo el botón Confirmar ingreso queda bloqueado", async () => {
        const { user } = await abrirFormulario();
        await user.type(screen.getByPlaceholderText(/explica por qué se autoriza/i), "Presentó su CI físico en la puerta.");

        expect(boton(/confirmar ingreso/i)).toBeDisabled();
        expect(screen.getByText(/\(obligatorio\)/)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /llegada tardía/i }));
        expect(boton(/confirmar ingreso/i)).toBeEnabled();
    });

    it("TC-181 · Con observación menor a 20 caracteres Confirmar ingreso se bloquea", async () => {
        const { user } = await abrirFormulario();
        await user.click(screen.getByRole("button", { name: /llegada tardía/i }));
        const observacion = screen.getByPlaceholderText(/explica por qué se autoriza/i);

        await user.type(observacion, "a".repeat(19));
        expect(boton(/confirmar ingreso/i)).toBeDisabled();
        expect(screen.getByText(/mín\. 20/)).toBeInTheDocument();

        await user.type(observacion, "a");
        expect(boton(/confirmar ingreso/i)).toBeEnabled();
    });

    it("TC-182 · El respaldo acepta JPG o PNG hasta 5 MB y rechaza otros formatos", async () => {
        const { user, vista } = await abrirFormulario();
        const entrada = vista.container.querySelector('input[type="file"]');

        await user.upload(entrada, archivo("documento.pdf", "application/pdf", 1));
        expect(screen.getByText(/La imagen debe ser JPG o PNG/)).toBeInTheDocument();

        await user.upload(entrada, archivo("foto-grande.png", "image/png", 6));
        expect(screen.getByText(/La imagen supera los 5 MB/)).toBeInTheDocument();

        await user.upload(entrada, archivo("respaldo.jpg", "image/jpeg", 1.5));
        expect(screen.getByText("respaldo.jpg")).toBeInTheDocument();
        expect(screen.getByText("1.50 MB")).toBeInTheDocument();
        expect(screen.queryByText(/La imagen supera los 5 MB/)).not.toBeInTheDocument();

        await user.upload(entrada, archivo("respaldo.png", "image/png", 5));
        expect(screen.getByText("respaldo.png")).toBeInTheDocument();
    });
});