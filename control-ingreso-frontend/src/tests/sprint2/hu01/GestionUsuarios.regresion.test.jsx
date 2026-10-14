import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserTableCard from "../../../pages/admin/components/UserTableCard";
import BulkUploadCard from "../../../pages/admin/components/BulkUploadCard";
import { previsualizarUsuariosMasivo } from "../../../services/usuarioService";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
vi.mock("../../../services/usuarioService", () => ({ previsualizarUsuariosMasivo: vi.fn() }));
vi.mock("../../../services/authService", () => ({
    obtenerUsuarioActual: vi.fn(() => ({ rol: "ADMINISTRADOR", idUsuario: 112 })),
}));
vi.mock("../../../services/examenService", () => ({ obtenerAsignaturasPorDocente: vi.fn() }));
vi.mock("../../../services/grupoService", () => ({
    obtenerAsignaturas: vi.fn(async () => [{ idAsignatura: 10, nombreAsignatura: "Cálculo I" }]),
    obtenerGruposPorAsignatura: vi.fn(async () => [
        { idGrupo: 7, nombreGrupo: "1", estadoGrupo: true, idAsignatura: 10, nombreAsignatura: "Cálculo I" },
    ]),
    obtenerGruposPorDocente: vi.fn(),
    obtenerVinculaciones: vi.fn(async () => []),
    obtenerCatalogoGrupos: vi.fn(async () => []),
}));

const USUARIOS = [
    { idUsuario: 1, nombre: "Ana", apellido: "Prueba", ci: "9900001", correo: "ana@test.com", telefono: 70000001, rol: "ESTUDIANTE", estado: true, codigoSis: 202300001 },
    { idUsuario: 2, nombre: "Beto", apellido: "Inactivo", ci: "9900002", correo: "beto@test.com", telefono: 70000002, rol: "ESTUDIANTE", estado: false, codigoSis: 202300002 },
    { idUsuario: 3, nombre: "Carla", apellido: "Docente", ci: "9900003", correo: "carla@test.com", telefono: 70000003, rol: "DOCENTE", estado: true, codigoSis: 202300003 },
    { idUsuario: 4, nombre: "Dani", apellido: "Operador", ci: "9900004", correo: "dani@test.com", telefono: 70000004, rol: "OPERADOR", estado: true },
];

function excel(nombre) {
    const file = new File(["contenido"], nombre, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    Object.defineProperty(file, "size", { value: 1024 });
    return file;
}

function abrirTabla(props = {}) {
    const acciones = {
        onCrear: vi.fn(async () => { }),
        onEditar: vi.fn(async () => { }),
        onCambiarRol: vi.fn(async () => { }),
        onCambiarEstado: vi.fn(async () => { }),
        onEliminar: vi.fn(async () => { }),
    };
    render(<UserTableCard usuarios={USUARIOS} boolCargando={false} strError="" {...acciones} {...props} />);
    return acciones;
}

/** Nombres de los usuarios que se ven en la tabla. */
const filasVisibles = () => within(screen.getByRole("region", { name: "Lista de usuarios" }))
    .getAllByRole("row").slice(1)
    .map((fila) => fila.querySelector("td span")?.textContent.trim())
    .filter(Boolean);

beforeEach(() => {
    vi.clearAllMocks();
    previsualizarUsuariosMasivo.mockResolvedValue({
        archivo: "lista.xlsx",
        filas: [{ fila: 2, nombre: "QA", apellido: "Uno", ci: "9900901", codigoSis: 202301901, correo: "qa.uno@test.com", telefono: null, rol: "ESTUDIANTE" }],
    });
});

describe("HU01 · Gestión de Usuarios (pruebas de regresión)", () => {
    it("TC-276 · En Gestión de Usuarios el admin puede registrar y cargar estudiantes y docentes", async () => {
        const user = userEvent.setup({ applyAccept: false });
        abrirTabla();
        render(<BulkUploadCard onProcesar={vi.fn()} />);
        await screen.findAllByRole("option", { name: "Cálculo I" });

        // Carga masiva: se puede elegir Estudiantes o Docentes
        const tituloInicial = screen.getByRole("heading", { name: /Carga de .* al Sistema/ }).textContent;
        await user.click(screen.getByRole("button", { name: "Docentes" }));
        const tituloDocentes = screen.getByRole("heading", { name: /Carga de .* al Sistema/ }).textContent;

        // Registro individual: el botón Nuevo Usuario ofrece Docente y Estudiante
        await user.click(screen.getByRole("button", { name: /Nuevo Usuario/ }));
        const roles = screen.getAllByRole("radio").map((r) => r.closest("label").textContent.trim());
        console.log(`[EVIDENCIA TC-276] Carga masiva: "${tituloInicial}" → al elegir Docentes: "${tituloDocentes}" · `
            + `Registro individual ofrece: ${roles.join(", ")}`);

        expect(tituloInicial).toBe("Carga de Estudiantes al Sistema");
        expect(tituloDocentes).toBe("Carga de Docentes al Sistema");
        expect(roles).toEqual(expect.arrayContaining(["Docente", "Estudiante"]));
    });

    it("TC-277 · Al confirmar la carga masiva se muestran los nuevos, los fallidos y el error de cada fila", async () => {
        const user = userEvent.setup({ applyAccept: false });
        const onProcesar = vi.fn(async () => ({
            mensaje: "Carga masiva procesada con observaciones.",
            totalProcesados: 3,
            exitosos: 1,
            fallidos: 2,
            detallesErrores: [
                { fila: 3, correo: "qa.sinci@test.com", errores: ["El Carnet de Identidad (CI) es obligatorio."] },
                { fila: 4, correo: "qa.dup@test.com", errores: ["El CI '9900901' está duplicado en el mismo archivo."] },
            ],
        }));
        render(<BulkUploadCard onProcesar={onProcesar} />);
        await screen.findByRole("option", { name: "Cálculo I" });
        await user.selectOptions(screen.getByRole("combobox", { name: "Asignatura del lote" }), "10");
        await screen.findByRole("option", { name: "Grupo 1" });
        await user.selectOptions(screen.getByRole("combobox", { name: "Grupo del lote" }), "7");
        await user.upload(screen.getByLabelText("Seleccionar archivo de usuarios"), excel("lista.xlsx"));
        await user.click(await screen.findByRole("button", { name: /Confirmar y registrar/ }));

        const nuevos = await screen.findByText("Nuevos: 1");
        const lineas = [...document.querySelectorAll("li.text-accent-red")].map((li) => li.textContent);
        console.log(`[EVIDENCIA TC-277] Resultado mostrado → ${nuevos.textContent} · ${screen.getByText(/^Fallidos:/).textContent} · `
            + `Errores listados: ${lineas.join(" | ")}`);

        expect(onProcesar).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Fallidos: 2")).toBeInTheDocument();
        expect(lineas).toEqual([
            "Fila 3 (qa.sinci@test.com): El Carnet de Identidad (CI) es obligatorio.",
            "Fila 4 (qa.dup@test.com): El CI '9900901' está duplicado en el mismo archivo.",
        ]);
    });

    it("TC-279 · Tras un registro individual sale un mensaje de éxito y el formulario queda limpio", async () => {
        const user = userEvent.setup();
        const { onCrear } = abrirTabla();

        await user.click(screen.getByRole("button", { name: /Nuevo Usuario/ }));
        await screen.findByRole("option", { name: "Cálculo I" });
        await user.click(screen.getByRole("radio", { name: "Estudiante" }));
        await screen.findByRole("option", { name: "Cálculo I" });
        await user.type(screen.getByLabelText("Primer nombre"), "Ana");
        await user.type(screen.getByLabelText("Apellido paterno"), "Regresion");
        await user.type(screen.getByLabelText("Correo electrónico"), "qa.regresion@test.com");
        await user.type(screen.getByPlaceholderText("71234567"), "71234567");
        await user.type(screen.getByLabelText("Carnet de Identidad"), "9912379");
        await user.type(screen.getByPlaceholderText("Ej. 123456"), "202301279");
        await user.selectOptions(screen.getByRole("combobox"), "10");
        await user.click(await screen.findByRole("checkbox", { name: "Grupo 1" }));
        fireEvent.submit(screen.getByRole("button", { name: "Guardar" }).closest("form"));

        await waitFor(() => expect(onCrear).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByRole("heading", { name: "Nuevo usuario" })).not.toBeInTheDocument());
        const mensajeExito = screen.queryByText(/(éxito|exitosamente|correctamente|fue registrad|se registró|creado)/i);

        await user.click(screen.getByRole("button", { name: /Nuevo Usuario/ }));
        const valores = ["Primer nombre", "Apellido paterno", "Correo electrónico", "Carnet de Identidad"]
            .map((campo) => screen.getByLabelText(campo).value);
        const formularioLimpio = valores.every((v) => v === "");
        console.log(`[EVIDENCIA TC-279] Registro enviado: sí · Ventana cerrada: sí · Mensaje de éxito: `
            + `${mensajeExito ? `"${mensajeExito.textContent}"` : "(ninguno)"} · Formulario limpio al volver a abrir: ${formularioLimpio}`);

        expect.soft(mensajeExito, "Debe mostrarse un mensaje de éxito tras el registro").not.toBeNull();
        expect.soft(formularioLimpio, "El formulario debe estar vacío al volver a abrirlo").toBe(true);
    });

    it("TC-281 · En Gestión de Usuarios se sigue listando, filtrando, editando y activando usuarios", async () => {
        const user = userEvent.setup();
        const { onCambiarEstado } = abrirTabla();

        const estudiantes = filasVisibles();
        await user.click(screen.getByRole("button", { name: /^Docentes/ }));
        const docentes = filasVisibles();
        await user.click(screen.getByRole("button", { name: /^Todos \d/ }));
        await user.click(screen.getByRole("button", { name: "Inactivos" }));
        const inactivos = filasVisibles();
        await user.click(screen.getByRole("button", { name: "Todos los estados" }));
        await user.type(screen.getByLabelText("Buscar usuarios por nombre, CI o correo"), "9900004");
        const busqueda = filasVisibles();

        await user.click(screen.getByTitle("Editar"));
        const tituloEdicion = screen.getByRole("heading", { name: "Editar usuario" }).textContent;
        const nombreCargado = screen.getByLabelText("Primer nombre").value;
        await user.click(screen.getByRole("button", { name: "Cancelar" }));

        await user.click(screen.getByTitle("Desactivar"));
        await user.click(screen.getByRole("button", { name: "Confirmar" }));
        await waitFor(() => expect(onCambiarEstado).toHaveBeenCalled());

        console.log(`[EVIDENCIA TC-281] Pestaña Estudiantes: ${estudiantes.join(", ")} · Docentes: ${docentes.join(", ")} · `
            + `Inactivos: ${inactivos.join(", ")} · Búsqueda "9900004": ${busqueda.join(", ")} · `
            + `Editar abre "${tituloEdicion}" con nombre "${nombreCargado}" · Desactivar envía: ${JSON.stringify(onCambiarEstado.mock.calls[0])}`);

        expect(estudiantes).toEqual(["Ana Prueba", "Beto Inactivo"]);
        expect(docentes).toEqual(["Carla Docente"]);
        expect(inactivos).toEqual(["Beto Inactivo"]);
        expect(busqueda).toEqual(["Dani Operador"]);
        expect(nombreCargado).toBe("Dani");
        expect(onCambiarEstado).toHaveBeenCalledWith(4, "INACTIVO");
    });
});