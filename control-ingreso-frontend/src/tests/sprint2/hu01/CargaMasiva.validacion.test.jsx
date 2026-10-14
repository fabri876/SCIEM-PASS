import { render, screen } from "@testing-library/react";
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
    obtenerAsignaturas: vi.fn(async () => [{ idAsignatura: 10, nombreAsignatura: "Cálculo I" }]),
    obtenerGruposPorAsignatura: vi.fn(),
    obtenerGruposPorDocente: vi.fn(),
}));

const MB = 1024 * 1024;
const MENSAJE_SIN_GRUPO = "Seleccione la asignatura y el grupo del lote.";
const MENSAJE_FORMATO = "Formato no válido. Solo se aceptan archivos Excel (.XLSX) o .PDF.";
const MENSAJE_TAMANO = "El archivo supera el tamaño máximo permitido de 10 MB. Por favor sube un archivo más liviano.";

const VISTA_PREVIA = {
    archivo: "lista.xlsx",
    filas: [{ fila: 2, nombre: "QA Validacion", apellido: "Prueba", ci: "9900952", codigoSis: 202301952, correo: "qa.val@test.com", telefono: null, rol: "ESTUDIANTE" }],
};

/** Archivo de prueba con el tamaño exacto en bytes que se indique. */
function archivo(nombre, bytes, tipo = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const file = new File(["contenido"], nombre, { type: tipo });
    Object.defineProperty(file, "size", { value: bytes });
    return file;
}

const selectAsignatura = () => screen.getByRole("combobox", { name: "Asignatura del lote" });
const selectGrupo = () => screen.getByRole("combobox", { name: "Grupo del lote" });
const entradaArchivo = () => screen.getByLabelText("Seleccionar archivo de usuarios");
const botonRevisar = () => screen.getByRole("button", { name: /revisar registros antes de guardar/i });

async function abrir() {
    const user = userEvent.setup({ applyAccept: false });
    render(<BulkUploadCard onProcesar={vi.fn()} />);
    await screen.findByRole("option", { name: "Cálculo I" });
    return user;
}

async function elegirGrupo(user) {
    await user.selectOptions(selectAsignatura(), "10");
    await screen.findByRole("option", { name: "Grupo 1" });
    await user.selectOptions(selectGrupo(), "7");
}

beforeEach(() => {
    vi.clearAllMocks();
    obtenerGruposPorAsignatura.mockResolvedValue([{ idGrupo: 7, nombreGrupo: "1", estadoGrupo: true }]);
    previsualizarUsuariosMasivo.mockResolvedValue(VISTA_PREVIA);
});

describe("HU01 · Carga masiva (pruebas de validación)", () => {
    it("TC-152 · Sin grupo no se revisa el archivo y se muestra el mensaje", async () => {
        const user = await abrir();
        await user.upload(entradaArchivo(), archivo("lista.xlsx", 0.5 * MB));
        await user.click(botonRevisar()); // intento de revisar sin grupo

        const mensajeVisible = screen.queryByText(MENSAJE_SIN_GRUPO) !== null;
        console.log(`[EVIDENCIA TC-152] Revisión llamada: ${previsualizarUsuariosMasivo.mock.calls.length} veces · `
            + `Botón bloqueado: ${botonRevisar().disabled} · Mensaje "${MENSAJE_SIN_GRUPO}" visible: ${mensajeVisible}`);

        expect(previsualizarUsuariosMasivo, "No debe revisarse el archivo sin grupo").not.toHaveBeenCalled();
        expect(botonRevisar(), "El botón de revisar debe estar bloqueado sin grupo").toBeDisabled();
        expect(mensajeVisible, `Debe mostrarse el mensaje: ${MENSAJE_SIN_GRUPO}`).toBe(true);
    });

    it("TC-153 · Se acepta un archivo .xlsx de exactamente 10 MB", async () => {
        const user = await abrir();
        await elegirGrupo(user);
        await user.upload(entradaArchivo(), archivo("lista-10mb.xlsx", 10 * MB));

        expect(await screen.findByRole("dialog")).toBeInTheDocument(); // se abrió la vista previa
        console.log(`[EVIDENCIA TC-153] Archivo de ${10 * MB} bytes (10 MB) · Revisión llamada: `
            + `${previsualizarUsuariosMasivo.mock.calls.length} vez · Mensaje de límite: ${screen.queryByText(MENSAJE_TAMANO) !== null}`);

        expect(previsualizarUsuariosMasivo).toHaveBeenCalledTimes(1);
        expect(previsualizarUsuariosMasivo.mock.calls[0][0].name).toBe("lista-10mb.xlsx");
        expect(screen.queryByText(MENSAJE_TAMANO)).not.toBeInTheDocument();
    });

    it("TC-154 · Un archivo .csv se rechaza con el mensaje de formato", async () => {
        const user = await abrir();
        await elegirGrupo(user);
        await user.upload(entradaArchivo(), archivo("lista.csv", 2048, "text/csv"));

        console.log(`[EVIDENCIA TC-154] Archivo lista.csv · Mensaje mostrado: "${screen.queryByText(MENSAJE_FORMATO)?.textContent ?? "(ninguno)"}"`);

        expect(screen.getByText(MENSAJE_FORMATO)).toBeInTheDocument();
        expect(screen.queryByText(/Archivo seleccionado: lista\.csv/)).not.toBeInTheDocument();
        expect(previsualizarUsuariosMasivo).not.toHaveBeenCalled();
    });

    it("TC-155 · Un archivo de más de 10 MB muestra el límite permitido", async () => {
        const user = await abrir();
        await elegirGrupo(user);
        await user.upload(entradaArchivo(), archivo("lista-grande.xlsx", 10 * MB + 1));

        console.log(`[EVIDENCIA TC-155] Archivo de ${10 * MB + 1} bytes (10 MB + 1 byte) · Mensaje mostrado: "${screen.queryByText(MENSAJE_TAMANO)?.textContent ?? "(ninguno)"}"`);

        expect(screen.getByText(MENSAJE_TAMANO)).toBeInTheDocument();
        expect(screen.queryByText(/Archivo seleccionado: lista-grande\.xlsx/)).not.toBeInTheDocument();
        expect(previsualizarUsuariosMasivo).not.toHaveBeenCalled();
    });
});