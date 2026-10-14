import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkUploadCard from "../../../pages/admin/components/BulkUploadCard";
import { previsualizarUsuariosMasivo } from "../../../services/usuarioService";
import { obtenerGruposPorAsignatura } from "../../../services/grupoService";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
vi.mock("../../../services/usuarioService", () => ({ previsualizarUsuariosMasivo: vi.fn() }));
vi.mock("../../../services/authService", () => ({
    obtenerUsuarioActual: vi.fn(() => ({ rol: "ADMINISTRADOR", idUsuario: 112 })),
}));
vi.mock("../../../services/examenService", () => ({ obtenerAsignaturasPorDocente: vi.fn() }));
vi.mock("../../../services/grupoService", () => ({
    obtenerAsignaturas: vi.fn(async () => [
        { idAsignatura: 10, nombreAsignatura: "Cálculo I" },
        { idAsignatura: 20, nombreAsignatura: "Álgebra I" },
        { idAsignatura: 30, nombreAsignatura: "Física I" },
    ]),
    obtenerGruposPorAsignatura: vi.fn(),
    obtenerGruposPorDocente: vi.fn(),
}));

const GRUPOS = {
    10: [
        { idGrupo: 7, nombreGrupo: "1", estadoGrupo: true },
        { idGrupo: 8, nombreGrupo: "2", estadoGrupo: true },
    ],
    20: [{ idGrupo: 9, nombreGrupo: "1", estadoGrupo: true }],
    30: [{ idGrupo: 11, nombreGrupo: "3", estadoGrupo: false }], // solo un grupo inactivo
};

const VISTA_PREVIA = {
    archivo: "lista.xlsx",
    filas: [{ fila: 2, nombre: "QA Masiva", apellido: "Prueba Uno", ci: "9900901", codigoSis: 202301901, correo: "qa.masiva@test.com", telefono: null, rol: "ESTUDIANTE" }],
};

function excel(nombre, megas = 0.5) {
    const file = new File(["contenido"], nombre, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    Object.defineProperty(file, "size", { value: Math.round(megas * 1024 * 1024) });
    return file;
}

const selectAsignatura = () => screen.getByRole("combobox", { name: "Asignatura del lote" });
const selectGrupo = () => screen.getByRole("combobox", { name: "Grupo del lote" });
const entradaArchivo = () => screen.getByLabelText("Seleccionar archivo de usuarios");
const botonRevisar = () => screen.getByRole("button", { name: /revisar registros antes de guardar/i });

async function abrir() {
    const user = userEvent.setup({ applyAccept: false });
    const onProcesar = vi.fn();
    render(<BulkUploadCard onProcesar={onProcesar} />);
    await screen.findByRole("option", { name: "Cálculo I" });
    return { user, onProcesar };
}

async function elegirGrupo(user, idAsignatura, idGrupo) {
    await user.selectOptions(selectAsignatura(), String(idAsignatura));
    if (idGrupo) {
        await screen.findAllByRole("option", { name: /^Grupo / });
        await user.selectOptions(selectGrupo(), String(idGrupo));
    }
}

beforeEach(() => {
    vi.clearAllMocks();
    obtenerGruposPorAsignatura.mockImplementation(async (id) => GRUPOS[id] || []);
    previsualizarUsuariosMasivo.mockResolvedValue(VISTA_PREVIA);
});

describe("HU01 · Carga masiva (pruebas unitarias)", () => {
    it("TC-001 · La lista Grupo está bloqueada mientras no se elige una asignatura", async () => {
        const { user } = await abrir();
        expect(selectGrupo()).toBeDisabled();

        await elegirGrupo(user, 10);
        await screen.findByRole("option", { name: "Grupo 1" });
        expect(selectGrupo()).toBeEnabled();
    });

    it("TC-002 · Al cambiar la asignatura se limpia el grupo elegido", async () => {
        const { user } = await abrir();
        await elegirGrupo(user, 10, 8);
        expect(selectGrupo()).toHaveValue("8");

        await user.selectOptions(selectAsignatura(), "20");
        expect(selectGrupo()).toHaveValue("");
    });

    it("TC-003 · Se muestra un mensaje cuando la asignatura no tiene grupos activos", async () => {
        const { user } = await abrir();
        await elegirGrupo(user, 30);

        expect(await screen.findByText("No hay grupos activos disponibles en esta asignatura.")).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "Grupo 3" })).not.toBeInTheDocument();
    });

    it("TC-004 · Al soltar un archivo se ven su nombre y su tamaño", async () => {
        await abrir();
        const zona = screen.getByText("Arrastra y suelta tu archivo aquí").parentElement;

        fireEvent.drop(zona, { dataTransfer: { files: [excel("lista-estudiantes.xlsx", 1.5)] } });

        expect(await screen.findByText("Archivo seleccionado: lista-estudiantes.xlsx")).toBeInTheDocument();
        expect(screen.getByText(/1\.50 MB · Carga de estudiantes/)).toBeInTheDocument();
    });

    it("TC-005 · Un segundo archivo reemplaza al anterior", async () => {
        const { user } = await abrir();

        await user.upload(entradaArchivo(), excel("primera-lista.xlsx"));
        expect(screen.getByText("Archivo seleccionado: primera-lista.xlsx")).toBeInTheDocument();

        await user.upload(entradaArchivo(), excel("segunda-lista.xlsx"));
        expect(screen.getByText("Archivo seleccionado: segunda-lista.xlsx")).toBeInTheDocument();
        expect(screen.queryByText(/primera-lista\.xlsx/)).not.toBeInTheDocument();
    });

    it("TC-008 · El botón de revisar archivo está bloqueado sin archivo o sin grupo", async () => {
        const { user } = await abrir();
        expect(botonRevisar()).toBeDisabled(); // sin archivo y sin grupo

        await user.upload(entradaArchivo(), excel("lista.xlsx"));
        expect(botonRevisar()).toBeDisabled(); // con archivo, sin grupo

        await elegirGrupo(user, 10, 7);
        expect(botonRevisar()).toBeEnabled(); // con archivo y con grupo
    });

    it("TC-009 · Volver sin guardar no registra datos y permite subir otro archivo", async () => {
        const { user, onProcesar } = await abrir();
        await elegirGrupo(user, 10, 7);
        await user.upload(entradaArchivo(), excel("lista.xlsx"));
        expect(await screen.findByRole("dialog")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Volver sin guardar" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(onProcesar).not.toHaveBeenCalled();

        await user.upload(entradaArchivo(), excel("otra-lista.xlsx"));
        expect(screen.getByText("Archivo seleccionado: otra-lista.xlsx")).toBeInTheDocument();
        expect(previsualizarUsuariosMasivo).toHaveBeenCalledTimes(2);
        expect(onProcesar).not.toHaveBeenCalled();
    });
});