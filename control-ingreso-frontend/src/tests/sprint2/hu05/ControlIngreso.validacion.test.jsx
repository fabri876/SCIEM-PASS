import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import useControlIngreso from "../../../pages/control/ingreso/useControlIngreso";
import SeccionControlIngreso from "../../../pages/control/ingreso/SeccionControlIngreso";

// Se simulan la sesión y la cámara. El servidor se simula con respuestas iguales a las del backend real.
vi.mock("../../../services/authService", () => ({
    obtenerToken: vi.fn(() => "token-de-prueba"),
    obtenerUsuarioActual: vi.fn(() => ({ nombre: "Operador", apellido: "Prueba", rol: "OPERADOR", idUsuario: 9 })),
    cerrarSesion: vi.fn(),
}));
const { lector, Html5Qrcode } = vi.hoisted(() => ({ lector: {}, Html5Qrcode: vi.fn() }));
vi.mock("html5-qrcode", () => ({ Html5Qrcode }));

const EXAMEN = {
    id: "10-1-5", idasignatura: 10, idexamen: 1, idambiente: 5, materia: "Cálculo I", tipo: "Primer parcial",
    aula: "691A", fecha: "2026-10-14", horaInicio: "08:00", horaFin: "10:00", estado: "EN_CURSO",
    contador: { ingresaron: 0, pendientes: 3, inhabilitados: 0, habilitados: 3 },
};
const ANA = { idusuario: 1, codsisestudiante: 202301245, ci: "8765432", nombreCompleto: "Ana Pérez" };

/* ---------------- Backend falso (respuestas con la forma del backend real) ---------------- */
let respuestasIngreso = [];
let pedidosIngreso = [];
const responder = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

async function backendFalso(url, opciones = {}) {
    const ruta = new URL(url, "http://localhost:8080").pathname;
    if (ruta === "/api/v1/control/ingresos") {
        pedidosIngreso.push(JSON.parse(opciones.body));
        const [status, data] = respuestasIngreso.shift();
        return responder(status, data);
    }
    if (ruta === "/api/v1/control/examen-seleccionado") return responder(200, { ingresaron: 0, faltantes: 3, totalHabilitados: 3 });
    return responder(200, []);
}

function Pantalla({ strRol }) {
    const ctrl = useControlIngreso(EXAMEN.id, { examenInicial: EXAMEN });
    return <SeccionControlIngreso ctrl={ctrl} strRol={strRol} boolPermitirVolver={false} />;
}

function abrir(strRol = "operador") {
    const user = userEvent.setup();
    render(<Pantalla strRol={strRol} />);
    return user;
}

async function verificar(user, documento) {
    await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
    const campo = screen.getByLabelText("C.I. o Código SIS del estudiante");
    await user.clear(campo);
    await user.type(campo, documento);
    await user.click(screen.getByRole("button", { name: "Verificar ingreso" }));
}

/** La tarjeta de resultado (desde su banda de color) y si su banda es roja. */
async function tarjeta(titulo) {
    const banda = (await screen.findByText(titulo)).closest("div.flex.items-center");
    return { tarjeta: banda.parentElement, roja: banda.className.includes("bg-[#B91C1C]") };
}

beforeEach(() => {
    vi.clearAllMocks();
    respuestasIngreso = [];
    pedidosIngreso = [];
    globalThis.fetch = vi.fn(backendFalso);
    lector.isScanning = false;
    lector.start = vi.fn(async () => { lector.isScanning = true; });
    lector.stop = vi.fn(async () => { lector.isScanning = false; });
    lector.clear = vi.fn();
    Html5Qrcode.mockImplementation(function () { return lector; });
});

describe("HU05 · Control de ingreso (pruebas de validación)", () => {
    it("TC-166 · Un segundo intento muestra Ya registrado con la hora del primero", async () => {
        respuestasIngreso = [
            [201, { estado: "PERMITIDO", estudiante: ANA, horaIngreso: "2026-10-14T08:01:15" }],
            [409, { estado: "DUPLICADO", estudiante: ANA, primerIngreso: { horaIngreso: "2026-10-14T08:01:15", nombreAmbiente: "691A" } }],
        ];
        const user = abrir();
        await verificar(user, "8765432");
        await screen.findByText("INGRESO PERMITIDO");
        await verificar(user, "8765432");
        const { tarjeta: t, roja } = await tarjeta("YA REGISTRADO");
        console.log(`[EVIDENCIA TC-166] Segundo intento → "${t.textContent}" · Banda roja: ${roja}`);

        expect(roja).toBe(true);
        expect(within(t).getByText("Primera marcación")).toBeInTheDocument();
        expect(within(t).getByText("08:01:15")).toBeInTheDocument();
        expect(t).toHaveTextContent("No se creó un nuevo registro.");
    });

    it("TC-167 · Un inhabilitado sale en rojo con su motivo y sin opción de dejarlo pasar", async () => {
        respuestasIngreso = [[403, { estado: "INHABILITADO", estudiante: ANA, motivoInhabilitacion: "Debe el informe de laboratorio" }]];
        const user = abrir("operador");
        await verificar(user, "8765432");
        const { tarjeta: t, roja } = await tarjeta("ESTUDIANTE INHABILITADO");
        const botones = within(t).getAllByRole("button").map((b) => b.getAttribute("aria-label") || b.textContent);
        console.log(`[EVIDENCIA TC-167] Operador · Tarjeta: "${t.textContent}" · Banda roja: ${roja} · Botones en la tarjeta: ${botones.join(", ")}`);

        expect(roja).toBe(true);
        expect(t).toHaveTextContent("Motivo del bloqueo:");
        expect(t).toHaveTextContent("Debe el informe de laboratorio");
        expect(t).toHaveTextContent("El rol operador no puede autorizar este ingreso.");
        expect(botones).toEqual(["Cerrar tarjeta"]); // ninguna opción para dejarlo pasar
    });

    it("TC-168 · El docente ve el motivo del bloqueo sin el aviso dirigido al operador", async () => {
        respuestasIngreso = [[403, { estado: "INHABILITADO", estudiante: ANA, motivoInhabilitacion: "Debe el informe de laboratorio" }]];
        const user = abrir("docente");
        await verificar(user, "8765432");
        const { tarjeta: t } = await tarjeta("ESTUDIANTE INHABILITADO");
        console.log(`[EVIDENCIA TC-168] Docente · Tarjeta: "${t.textContent}"`);

        expect(t).toHaveTextContent("Debe el informe de laboratorio");
        expect(t).not.toHaveTextContent("El rol operador no puede autorizar este ingreso.");
    });

    it("TC-170 · Un estudiante de otra aula no ingresa y se muestra su aula", async () => {
        respuestasIngreso = [[409, {
            estado: "AMBIENTE_DIFERENTE", estudiante: ANA,
            mensaje: "INGRESO A UN AMBIENTE DIFERENTE - El estudiante debe dirigirse al Aula 692B.",
            primerIngreso: { horaIngreso: null, nombreAmbiente: "692B" }
        }]];
        const user = abrir();
        await verificar(user, "8765432");
        const { tarjeta: t, roja } = await tarjeta("INGRESO A UN AMBIENTE DIFERENTE");
        console.log(`[EVIDENCIA TC-170] Tarjeta: "${t.textContent}" · Banda roja: ${roja}`);

        expect(roja).toBe(true);
        expect(t).toHaveTextContent("El estudiante debe dirigirse al Aula 692B");
        expect(screen.getByText("Todavía no registraste ingresos en este examen.")).toBeInTheDocument();
    });

    it("TC-171 · Un C.I. inexistente muestra Estudiante no encontrado sin registrar", async () => {
        respuestasIngreso = [[404, { estado: "NO_ENCONTRADO", mensaje: "ESTUDIANTE NO ENCONTRADO" }]];
        const user = abrir();
        await verificar(user, "99999999");
        const { tarjeta: t, roja } = await tarjeta("ESTUDIANTE NO ENCONTRADO");
        console.log(`[EVIDENCIA TC-171] Tarjeta: "${t.textContent}" · Banda roja: ${roja}`);

        expect(roja).toBe(true);
        expect(t).toHaveTextContent("El dato «99999999» no corresponde a ningún estudiante registrado.");
        expect(screen.getByText("Todavía no registraste ingresos en este examen.")).toBeInTheDocument();
    });

    it("TC-172 · Ingreso manual rechaza letras y menos de 6 números con mensaje", async () => {
        const user = abrir();
        await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
        const campo = screen.getByLabelText("C.I. o Código SIS del estudiante");

        await user.type(campo, "12a");
        const conLetra = { valor: campo.value, mensaje: document.getElementById("ci-ayuda").textContent };
        await user.type(campo, "345");
        const corto = {
            valor: campo.value, mensaje: document.getElementById("ci-ayuda").textContent,
            boton: screen.getByRole("button", { name: "Verificar ingreso" }).disabled ? "bloqueado" : "habilitado"
        };
        console.log(`[EVIDENCIA TC-172] Al escribir "12a" → campo "${conLetra.valor}" · mensaje "${conLetra.mensaje}" · `
            + `Con "12345" → mensaje "${corto.mensaje}" · botón ${corto.boton}`);

        expect(conLetra).toEqual({ valor: "12", mensaje: "Ingresa solo números (sin letras ni símbolos)" });
        expect(corto).toEqual({ valor: "12345", mensaje: "5 dígitos · mínimo 6", boton: "bloqueado" });
        expect(pedidosIngreso).toHaveLength(0);
    });

    it("TC-174 · Sin permiso de cámara sale el aviso y se puede usar el Ingreso manual", async () => {
        lector.start = vi.fn(async () => { throw new Error("NotAllowedError: Permission denied"); });
        const user = abrir();
        await user.click(screen.getByRole("button", { name: "Leer QR" }));
        const aviso = await screen.findByText(/No se pudo abrir la cámara/);

        await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
        await user.type(screen.getByLabelText("C.I. o Código SIS del estudiante"), "8765432");
        const botonManual = screen.getByRole("button", { name: "Verificar ingreso" });
        console.log(`[EVIDENCIA TC-174] Cámara sin permiso → aviso: "${aviso.textContent}" · `
            + `Ingreso manual con "8765432" → botón ${botonManual.disabled ? "bloqueado" : "habilitado"}`);

        expect(aviso).toHaveTextContent("No se pudo abrir la cámara. Revisa el permiso del navegador o usa el ingreso manual.");
        expect(botonManual).toBeEnabled();
    });
});