import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkUploadCard from "../../../pages/admin/components/BulkUploadCard";
import UsuarioFormModal from "../../../pages/admin/components/UsuarioFormModal";
import { previsualizarUsuariosMasivo } from "../../../services/usuarioService";
import { obtenerUsuarioActual } from "../../../services/authService";
import { obtenerAsignaturasPorDocente } from "../../../services/examenService";
import { obtenerAsignaturas, obtenerGruposPorDocente } from "../../../services/grupoService";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
vi.mock("../../../services/usuarioService", () => ({ previsualizarUsuariosMasivo: vi.fn() }));
vi.mock("../../../services/authService", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("../../../services/examenService", () => ({ obtenerAsignaturasPorDocente: vi.fn() }));
vi.mock("../../../services/grupoService", () => ({
    obtenerAsignaturas: vi.fn(),
    obtenerGruposPorAsignatura: vi.fn(),
    obtenerGruposPorDocente: vi.fn(),
    obtenerVinculaciones: vi.fn(async () => []),
    obtenerCatalogoGrupos: vi.fn(async () => []),
}));

const DOCENTE = { rol: "DOCENTE", idUsuario: 55, codigoSis: 202000055 };
const ADMIN = { rol: "ADMINISTRADOR", idUsuario: 112 };
const TODAS = [
    { idAsignatura: 10, nombreAsignatura: "Cálculo I" },
    { idAsignatura: 20, nombreAsignatura: "Álgebra I" },
    { idAsignatura: 30, nombreAsignatura: "Física I" },
];
const DEL_DOCENTE = [{ idAsignatura: 10, nombreAsignatura: "Cálculo I" }];

function excel(nombre) {
    const file = new File(["contenido"], nombre, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    Object.defineProperty(file, "size", { value: 1024 });
    return file;
}

const opciones = (select) => [...select.querySelectorAll("option")].map((o) => o.textContent);

/** Abre la carga masiva tal como la usa el panel del Docente (solo estudiantes). */
async function abrirComoDocente() {
    obtenerUsuarioActual.mockReturnValue(DOCENTE);
    const user = userEvent.setup({ applyAccept: false });
    render(<BulkUploadCard onProcesar={vi.fn()} soloEstudiantes />);
    await screen.findByRole("option", { name: "Cálculo I" });
    return user;
}

beforeEach(() => {
    vi.clearAllMocks();
    obtenerAsignaturas.mockResolvedValue(TODAS);
    obtenerAsignaturasPorDocente.mockResolvedValue(DEL_DOCENTE);
    obtenerGruposPorDocente.mockResolvedValue([{ idGrupo: 7, nombreGrupo: "1", estadoGrupo: true }]);
    previsualizarUsuariosMasivo.mockResolvedValue({ archivo: "lista.xlsx", filas: [] });
});

describe("HU01 · Carga masiva y registro (pruebas de seguridad)", () => {
    it("TC-242 · El docente solo carga estudiantes y no ve la opción Docentes", async () => {
        const user = await abrirComoDocente();
        await user.selectOptions(screen.getByRole("combobox", { name: "Asignatura del lote" }), "10");
        await screen.findByRole("option", { name: "Grupo 1" });
        await user.selectOptions(screen.getByRole("combobox", { name: "Grupo del lote" }), "7");
        await user.upload(screen.getByLabelText("Seleccionar archivo de usuarios"), excel("lista.xlsx"));
        await screen.findByRole("dialog");

        const veDocentes = screen.queryByRole("button", { name: "Docentes" }) !== null;
        const [, rolEnviado, grupoEnviado] = previsualizarUsuariosMasivo.mock.calls[0];
        const tituloEstudiantes = screen.queryByRole("heading", { name: "Carga de Estudiantes al Sistema" }) !== null;
        console.log(`[EVIDENCIA TC-242] Título "Carga de Estudiantes al Sistema": ${tituloEstudiantes} · `
            + `Ve la opción Docentes: ${veDocentes} · Rol enviado: ${rolEnviado} · Grupo enviado: ${grupoEnviado}`);

        expect(tituloEstudiantes, "El título debe ser Carga de Estudiantes al Sistema").toBe(true);
        expect(veDocentes, "El docente no debe ver la opción Docentes").toBe(false);
        expect(rolEnviado).toBe("ESTUDIANTE");
        expect(grupoEnviado).toBe(7);
        expect(obtenerGruposPorDocente).toHaveBeenCalledWith("10", DOCENTE.idUsuario); // solo sus grupos
    });

    it("TC-243 · En el registro individual no aparece la opción Administrador", async () => {
        obtenerUsuarioActual.mockReturnValue(ADMIN);
        render(<UsuarioFormModal boolAbierto modo="crear" onCerrar={vi.fn()} onGuardar={vi.fn()} />);
        await screen.findByRole("option", { name: "Cálculo I" });

        const roles = screen.getAllByRole("radio").map((r) => r.closest("label").textContent.trim());
        console.log(`[EVIDENCIA TC-243] Roles que ofrece el registro individual: ${roles.join(", ")}`);

        expect(roles).toEqual(["Docente", "Ayudante", "Estudiante"]);
        expect(screen.queryByRole("radio", { name: /Administrador/i })).not.toBeInTheDocument();
    });

    it("TC-246 · En la carga del docente la lista Asignatura muestra solo las suyas", async () => {
        await abrirComoDocente();
        const lista = opciones(screen.getByRole("combobox", { name: "Asignatura del lote" }));
        console.log(`[EVIDENCIA TC-246] Asignaturas del docente: ${DEL_DOCENTE.map((a) => a.nombreAsignatura).join(", ")} · `
            + `Lista mostrada: ${lista.join(", ")} · Pidió todas las asignaturas: ${obtenerAsignaturas.mock.calls.length > 0}`);

        expect(obtenerAsignaturasPorDocente).toHaveBeenCalledWith(DOCENTE.idUsuario, DOCENTE.codigoSis);
        expect(obtenerAsignaturas).not.toHaveBeenCalled();
        expect(lista).toEqual(["Seleccione una asignatura", "Cálculo I"]);
    });
});