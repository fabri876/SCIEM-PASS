import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsuarioFormModal from "../../../pages/admin/components/UsuarioFormModal";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
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

const campo = {
    primerNombre: () => screen.getByLabelText("Primer nombre"),
    apellidoPaterno: () => screen.getByLabelText("Apellido paterno"),
    correo: () => screen.getByLabelText("Correo electrónico"),
    telefono: () => screen.getByPlaceholderText("71234567"),
    ci: () => screen.getByLabelText("Carnet de Identidad"),
    sis: () => screen.getByPlaceholderText("Ej. 123456"),
};

/** Caja del campo: el campo y el mensaje que aparece debajo de él. */
const cajaDe = (input) => input.closest(".min-w-0").parentElement;
const mensajesRojos = (caja) => [...caja.querySelectorAll(".text-accent-red")].map((p) => p.textContent);

async function abrirComoEstudiante() {
    const user = userEvent.setup();
    const onGuardar = vi.fn(async () => { });
    render(<UsuarioFormModal boolAbierto modo="crear" onCerrar={vi.fn()} onGuardar={onGuardar} />);
    await screen.findByRole("option", { name: "Cálculo I" });
    await user.click(screen.getByRole("radio", { name: "Estudiante" }));
    await screen.findByRole("option", { name: "Cálculo I" }); // la lista se recarga al cambiar de rol
    return { user, onGuardar };
}

async function llenar(user, datos) {
    for (const [nombre, valor] of Object.entries(datos)) {
        await user.clear(campo[nombre]());
        if (valor) await user.type(campo[nombre](), valor);
    }
}

/** Envía el formulario con la validación propia del sistema (sin el aviso nativo del navegador). */
const enviar = () => fireEvent.submit(screen.getByRole("button", { name: "Guardar" }).closest("form"));

const DATOS_VALIDOS = {
    primerNombre: "Ana",
    apellidoPaterno: "Prueba",
    correo: "qa.individual@test.com",
    telefono: "71234567",
    ci: "9912345",
    sis: "202301999",
};

beforeEach(() => vi.clearAllMocks());

describe("HU01 · Registro individual (pruebas de validación)", () => {
    it("TC-163 · El registro individual pide nombres, C.I., correo, teléfono y SIS", async () => {
        const { onGuardar } = await abrirComoEstudiante();
        enviar(); // todo vacío

        const esperados = {
            primerNombre: "El primer nombre es obligatorio",
            apellidoPaterno: "El apellido paterno es obligatorio",
            ci: "El carnet de identidad es obligatorio",
            correo: "El correo es obligatorio",
            telefono: "El teléfono es obligatorio",
            sis: "El código SIS es obligatorio para este rol",
        };
        for (const [nombre, mensaje] of Object.entries(esperados)) {
            console.log(`[EVIDENCIA TC-163] Campo ${nombre} · Obligatorio: ${campo[nombre]().required} · Mensaje: "${mensajesRojos(cajaDe(campo[nombre]())).join(" | ") || "(ninguno)"}"`);
            expect(campo[nombre](), `El campo ${nombre} debe ser obligatorio`).toBeRequired();
            expect(screen.getByText(mensaje)).toBeInTheDocument();
        }
        expect(screen.getByText("Revisa los campos marcados en rojo antes de continuar.")).toBeInTheDocument();
        expect(onGuardar).not.toHaveBeenCalled();
    });

    it("TC-164 · El registro individual exige un grupo y vincula a la persona", async () => {
        const { user, onGuardar } = await abrirComoEstudiante();
        await llenar(user, DATOS_VALIDOS);

        enviar(); // sin grupo
        expect(screen.getByText("Seleccione una asignatura y al menos un grupo.")).toBeInTheDocument();
        expect(onGuardar).not.toHaveBeenCalled();
        console.log("[EVIDENCIA TC-164] Sin grupo → mensaje: \"Seleccione una asignatura y al menos un grupo.\" · Guardado: no");

        await user.selectOptions(screen.getByRole("combobox"), "10");
        await user.click(await screen.findByRole("checkbox", { name: "Grupo 1" }));
        expect(screen.getByText("1 grupo(s) seleccionados")).toBeInTheDocument();

        enviar(); // con grupo
        await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
        const enviado = onGuardar.mock.calls[0][0];
        console.log(`[EVIDENCIA TC-164] Con grupo → datos enviados: rol ${enviado.rol} · C.I. ${enviado.ci} · SIS ${enviado.codigoSis} · Grupos ${JSON.stringify(enviado.idGrupos)}`);

        expect(enviado).toEqual(expect.objectContaining({
            nombre: "Ana",
            apellido: "Prueba",
            ci: "9912345",
            correo: "qa.individual@test.com",
            telefono: 71234567,
            rol: "ESTUDIANTE",
            codigoSis: 202301999,
            idGrupos: [7],
        }));
    });

    it("TC-165 · En el registro individual el error sale junto al campo incorrecto", async () => {
        const { user, onGuardar } = await abrirComoEstudiante();
        await llenar(user, { ...DATOS_VALIDOS, correo: "qa.individual@test", telefono: "123", ci: "ABC", sis: "20230A" });
        enviar();

        const esperados = {
            correo: "Ingrese un correo válido, con dominio y extensión (ej. usuario@dominio.com)",
            telefono: "Ingrese un teléfono válido, solo números (7 u 8 dígitos)",
            ci: "Ingrese un carnet de identidad válido (número, con complemento opcional como \"1N\")",
            sis: "Ingrese un código SIS válido, solo números",
        };
        for (const [nombre, mensaje] of Object.entries(esperados)) {
            const caja = cajaDe(campo[nombre]());
            console.log(`[EVIDENCIA TC-165] Campo ${nombre} · Mensaje debajo del campo: "${mensajesRojos(caja).join(" | ") || "(ninguno)"}"`);
            expect(within(caja).getByText(mensaje)).toBeInTheDocument();
            expect(mensajesRojos(caja), `Debajo de ${nombre} solo debe estar su propio error`).toEqual([mensaje]);
        }
        // Los campos correctos no muestran error
        expect(mensajesRojos(cajaDe(campo.primerNombre()))).toEqual([]);
        expect(mensajesRojos(cajaDe(campo.apellidoPaterno()))).toEqual([]);
        expect(onGuardar).not.toHaveBeenCalled();
    });
});