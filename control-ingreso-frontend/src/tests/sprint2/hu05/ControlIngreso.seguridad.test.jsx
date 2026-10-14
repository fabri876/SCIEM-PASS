import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConectadoOperador from "../../../pages/control/conectado/ConectadoOperador";
import ControlIngresoDocente from "../../../pages/control/ingreso/ControlIngresoDocente";
import LoginForm from "../../../components/login/LoginForm";
import { ContextoOperador } from "../../../pages/control/operadorContexto";
import { cerrarSesion, obtenerUsuarioActual } from "../../../services/authService";

// Se simulan la sesión, el encabezado y la cámara. El servidor se simula con respuestas como las del backend real.
vi.mock("../../../services/authService", async (importOriginal) => ({
    ...(await importOriginal()),
    obtenerToken: vi.fn(() => "token-de-prueba"),
    obtenerUsuarioActual: vi.fn(),
    cerrarSesion: vi.fn(),
}));
vi.mock("../../../components/layout/Header", () => ({ default: () => <header>Encabezado</header> }));
vi.mock("html5-qrcode", () => ({ Html5Qrcode: vi.fn() }));

const OPERADOR = { nombre: "Operador Prueba", rol: "OPERADOR", idUsuario: 9 };
const DOCENTE = { nombre: "Docente Prueba", rol: "DOCENTE", idUsuario: 7 };
const AVISO_SESION = "Tu sesión expiró, vuelve a iniciar sesión";

const hoy = new Date();
const strHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

// Examen delegado al operador (como lo devuelve /api/v1/examenes/delegados)
const DELEGADO = {
    idasignatura: 10, idexamen: 1, idambiente: 5, nombreAsignatura: "Cálculo I", nombreExamen: "Primer parcial",
    nombreAmbiente: "691A", fechaExamen: strHoy, horaInicio: "00:00:00", horaFin: "23:59:00", estadoMateria: "EN_CURSO",
    ingresaron: 1, faltantes: 2, totalHabilitados: 3,
};
// Examen que recibe la pantalla del docente desde "Mis exámenes"
const EXAMEN_DOCENTE = {
    idExamen: 1, idAsignatura: 10, idambiente: 5, nombreAsignatura: "Cálculo I", tipoExamen: "Primer parcial",
    aulaNombre: "691A", fechaExamen: strHoy, horaInicio: "00:00", horaFin: "23:59", ingresados: 1, totalInscritos: 3,
};
const INGRESO_REGISTRADO = {
    idIngreso: 100, horaIngreso: `${strHoy}T08:01:15`, metodoIngreso: "MANUAL", registradoPor: "Operador Prueba",
    estudiante: { nombreCompleto: "Ana Pérez", ci: "8765432", codsisestudiante: 202301245 },
};

/* ---------------- Backend falso ---------------- */
let delegados = [];
let ultimos = [];
let respuestaIngreso = null;
let peticiones = [];
const responder = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

async function backendFalso(url, opciones = {}) {
    const u = new URL(url, "http://localhost:8080");
    const metodo = opciones.method || "GET";
    peticiones.push({ metodo, ruta: u.pathname });
    if (u.pathname === "/api/v1/examenes/delegados") return responder(200, delegados);
    if (u.pathname === "/api/v1/control/examen-seleccionado") return responder(200, { ingresaron: ultimos.length, faltantes: 2, totalHabilitados: 3 });
    if (u.pathname === "/api/v1/control/ultimos-ingresos") return responder(200, ultimos);
    if (u.pathname === "/api/v1/control/ingresos" && metodo === "POST") return responder(...respuestaIngreso);
    return responder(200, []);
}

/* ---------------- Pantallas ---------------- */
const contexto = { estadoRed: { net: "online", pend: 0 }, fnCambiarRed: vi.fn(), listExamenes: [], fnDescargar: vi.fn() };

/** Panel del operador (/control/conectado): entra al examen con "Registrar ingreso". */
async function abrirPanelOperador() {
    obtenerUsuarioActual.mockReturnValue(OPERADOR);
    delegados = [DELEGADO];
    const user = userEvent.setup();
    render(
        <ContextoOperador.Provider value={contexto}>
            <MemoryRouter initialEntries={["/control/conectado"]}>
                <ConectadoOperador />
            </MemoryRouter>
        </ContextoOperador.Provider>
    );
    const botonEntrar = await screen.findByRole("button", { name: "Registrar ingreso" });
    const enListaDeExamenes = botonesListaOficial().length;
    await user.click(botonEntrar);
    await screen.findByRole("heading", { name: "Verificación de ingreso" });
    return { user, enListaDeExamenes };
}

/** Control de ingreso del docente (/home/docente/examenes/1/control-ingreso). */
async function abrirControlDocente() {
    obtenerUsuarioActual.mockReturnValue(DOCENTE);
    delegados = [];
    render(
        <ContextoOperador.Provider value={contexto}>
            <MemoryRouter initialEntries={[{ pathname: "/home/docente/examenes/1/control-ingreso", state: { examen: EXAMEN_DOCENTE } }]}>
                <Routes>
                    <Route path="/home/docente/examenes/:idExamen/control-ingreso" element={<ControlIngresoDocente />} />
                </Routes>
            </MemoryRouter>
        </ContextoOperador.Provider>
    );
    await screen.findByRole("heading", { name: "Verificación de ingreso" });
}

const botonesListaOficial = () => screen.queryAllByRole("button", { name: /Lista oficial/i });

/** Sección de últimos ingresos ya cargada con el ingreso de Ana Pérez. */
async function seccionUltimos(titulo) {
    const seccion = screen.getByRole("heading", { name: titulo }).closest("section");
    await within(seccion).findByText(/Ana Pérez/);
    return seccion;
}

beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    delegados = [];
    ultimos = [];
    respuestaIngreso = null;
    peticiones = [];
    globalThis.fetch = vi.fn(backendFalso);
});

describe("HU05 · Control de ingreso (pruebas de seguridad)", () => {
    it("TC-249 · El operador no ve el botón Lista oficial del aula", async () => {
        const { enListaDeExamenes } = await abrirPanelOperador();
        const enControl = botonesListaOficial().length;
        cleanup();

        await abrirControlDocente(); // control: en la pantalla del docente el botón sí está
        const enDocente = botonesListaOficial().map((b) => b.textContent.trim());
        console.log(`[EVIDENCIA TC-249] Operador → botones "Lista oficial" en Mis exámenes: ${enListaDeExamenes} · `
            + `en el control del examen: ${enControl} · Docente → botones: ${JSON.stringify(enDocente)}`);

        expect(enListaDeExamenes, "El operador no debe ver el botón en Mis exámenes").toBe(0);
        expect(enControl, "El operador no debe ver el botón en el control del examen").toBe(0);
        expect(enDocente, "El docente sí debe ver el botón").toEqual(["Lista oficial del aula"]);
    });

    it("TC-252 · Con sesión vencida sale el aviso y no se registra el ingreso", async () => {
        respuestaIngreso = [401, { error: "Unauthorized" }];
        const { user } = await abrirPanelOperador();

        await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
        await user.type(screen.getByLabelText("C.I. o Código SIS del estudiante"), "8765432");
        await user.click(screen.getByRole("button", { name: "Verificar ingreso" }));
        const aviso = await screen.findByText(AVISO_SESION);
        const tarjetaPermitido = screen.queryByText("INGRESO PERMITIDO") !== null;
        const sinIngresos = screen.queryByText("Todavía no registraste ingresos en este examen.") !== null;
        const avisoGuardado = sessionStorage.getItem("mensajeSesion");
        const sesionCerrada = cerrarSesion.mock.calls.length > 0;
        const posts = peticiones.filter((p) => p.metodo === "POST").length;
        cleanup();

        render(<MemoryRouter><LoginForm /></MemoryRouter>);
        const avisoEnLogin = screen.queryByText(AVISO_SESION) !== null;
        console.log(`[EVIDENCIA TC-252] Verificar ingreso con sesión vencida → servidor 401 · Aviso en pantalla: "${aviso.textContent}" · `
            + `Tarjeta INGRESO PERMITIDO: ${tarjetaPermitido} · Tabla sigue sin ingresos: ${sinIngresos} · Sesión cerrada: ${sesionCerrada} · `
            + `Aviso guardado para el login: "${avisoGuardado}" · Aviso visible en el login: ${avisoEnLogin} · Pedidos de registro: ${posts}`);

        expect(aviso).toHaveTextContent(AVISO_SESION);
        expect(tarjetaPermitido, "No debe mostrarse un ingreso permitido").toBe(false);
        expect(sinIngresos, "No debe aparecer ningún ingreso registrado").toBe(true);
        expect(sesionCerrada, "La sesión debe cerrarse").toBe(true);
        expect(avisoGuardado).toBe(AVISO_SESION);
        expect(avisoEnLogin, `En el login debe verse: ${AVISO_SESION}`).toBe(true);
        expect(posts).toBe(1);
    });

    it("TC-253 · Los ingresos registrados no tienen opción de modificar ni eliminar", async () => {
        ultimos = [INGRESO_REGISTRADO];
        await abrirPanelOperador();
        const operador = await seccionUltimos("Mis últimos ingresos");
        const botonesOperador = within(operador).queryAllByRole("button").map((b) => b.getAttribute("aria-label") || b.textContent);
        const textoOperador = operador.textContent;
        cleanup();

        await abrirControlDocente();
        const docente = await seccionUltimos("Últimos ingresos");
        const botonesDocente = within(docente).queryAllByRole("button").map((b) => b.getAttribute("aria-label") || b.textContent);
        console.log(`[EVIDENCIA TC-253] Operador · Mis últimos ingresos: "${textoOperador}" · Botones: ${JSON.stringify(botonesOperador)} · `
            + `Docente · Últimos ingresos: "${docente.textContent}" · Botones: ${JSON.stringify(botonesDocente)}`);

        expect(botonesOperador, "El operador no debe tener botones sobre los ingresos").toEqual([]);
        expect(botonesDocente, "El docente no debe tener botones sobre los ingresos").toEqual([]);
        expect(textoOperador + docente.textContent).not.toMatch(/editar|modificar|eliminar|borrar|anular/i);
    });
});