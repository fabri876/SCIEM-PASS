import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ConectadoOperador from "../../../pages/control/conectado/ConectadoOperador";
import { ContextoOperador } from "../../../pages/control/operadorContexto";

// Se simulan la sesión, la cámara y el parlante. El servidor se simula con respuestas como las del backend real;
// la pantalla del operador, el control de ingreso y el servicio son los reales.
vi.mock("../../../services/authService", async (importOriginal) => ({
    ...(await importOriginal()),
    obtenerToken: vi.fn(() => "token-de-prueba"),
    obtenerUsuarioActual: vi.fn(() => ({ nombre: "Operador Prueba", rol: "OPERADOR", idUsuario: 9 })),
    cerrarSesion: vi.fn(),
}));
const { lector, Html5Qrcode } = vi.hoisted(() => ({ lector: {}, Html5Qrcode: vi.fn() }));
vi.mock("html5-qrcode", () => ({ Html5Qrcode }));

// Parlante falso: anota el tono (Hz) de cada sonido
const sonidos = [];
class ParlanteFalso {
    constructor() { this.currentTime = 0; this.destination = {}; }
    createOscillator() {
        const o = { type: "", frequency: { value: 0 }, connect() { }, start() { }, stop() { sonidos.push(o.frequency.value); } };
        return o;
    }
    createGain() { return { gain: { setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { } }; }
}
window.AudioContext = ParlanteFalso;

const AZUL = "bg-[#1860A3]";
const ROJO = "bg-[#B91C1C]";
const QR_ANA = "SCIEMPASS:1:QAREGRESION01";

const hoy = new Date();
const strHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
const DELEGADO = {
    idasignatura: 10, idexamen: 1, idambiente: 5, nombreAsignatura: "Cálculo I", nombreExamen: "Primer parcial",
    nombreAmbiente: "691A", fechaExamen: strHoy, horaInicio: "00:00:00", horaFin: "23:59:00", estadoMateria: "EN_CURSO",
    ingresaron: 0, faltantes: 2, totalHabilitados: 2,
};
const ESTUDIANTES = [
    { idusuario: 1, codsisestudiante: 202301245, ci: "8765432", nombreCompleto: "Ana Pérez", qr: QR_ANA },
    { idusuario: 2, codsisestudiante: 202301246, ci: "7654321", nombreCompleto: "Bruno Rojas", qr: null },
];

/* ---------------- Backend falso (como el real: QR, C.I. o SIS; duplicado con la primera marcación) ---------------- */
let ingresos = [];
let pedidos = [];
const responder = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

async function backendFalso(url, opciones = {}) {
    const u = new URL(url, "http://localhost:8080");
    const metodo = opciones.method || "GET";
    if (u.pathname === "/api/v1/examenes/delegados") return responder(200, [DELEGADO]);
    if (u.pathname === "/api/v1/control/examen-seleccionado") return responder(200, { ingresaron: ingresos.length, faltantes: 2 - ingresos.length, totalHabilitados: 2 });
    if (u.pathname === "/api/v1/control/ultimos-ingresos") {
        return responder(200, [...ingresos].reverse().map((i, n) => ({
            idIngreso: 100 + n, horaIngreso: i.hora, metodoIngreso: i.metodo, registradoPor: "Operador Prueba",
            estudiante: { nombreCompleto: i.e.nombreCompleto, ci: i.e.ci, codsisestudiante: i.e.codsisestudiante },
        })));
    }
    if (u.pathname === "/api/v1/control/ingresos" && metodo === "POST") {
        const cuerpo = JSON.parse(opciones.body);
        pedidos.push(cuerpo);
        const id = cuerpo.identificador;
        const e = ESTUDIANTES.find((x) => (x.qr && x.qr === id) || x.ci === id || String(x.codsisestudiante) === id);
        if (!e) return responder(404, { estado: "NO_ENCONTRADO", mensaje: "ESTUDIANTE NO ENCONTRADO" });
        const { qr, ...estudiante } = e;
        const previo = ingresos.find((i) => i.e === e);
        if (previo) return responder(409, { estado: "DUPLICADO", estudiante, primerIngreso: { horaIngreso: previo.hora, nombreAmbiente: "691A" } });
        const hora = `${strHoy}T08:0${ingresos.length + 1}:00`;
        ingresos.push({ e, hora, metodo: cuerpo.metodoIngreso });
        return responder(201, { estado: "PERMITIDO", estudiante, horaIngreso: hora });
    }
    return responder(200, []);
}

/* ---------------- Pantalla del operador ---------------- */
const contexto = { estadoRed: { net: "online", pend: 0 }, fnCambiarRed: vi.fn(), listExamenes: [], fnDescargar: vi.fn() };

async function abrirPanelOperador() {
    const user = userEvent.setup();
    render(
        <ContextoOperador.Provider value={contexto}>
            <MemoryRouter initialEntries={["/control/conectado"]}>
                <ConectadoOperador />
            </MemoryRouter>
        </ContextoOperador.Provider>
    );
    await user.click(await screen.findByRole("button", { name: "Registrar ingreso" }));
    await screen.findByRole("heading", { name: "Verificación de ingreso" });
    return user;
}

/** Lee un QR con la cámara simulada. */
async function leerQr(user, texto) {
    await user.click(screen.getByRole("button", { name: "Leer QR" }));
    await waitFor(() => expect(lector.start).toHaveBeenCalled());
    const alLeer = lector.start.mock.calls.at(-1)[2];
    await act(async () => { await alLeer(texto); });
}

async function verificarManual(user, documento) {
    await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
    const campo = screen.getByLabelText("C.I. o Código SIS del estudiante");
    await user.clear(campo);
    await user.type(campo, documento);
    await user.click(screen.getByRole("button", { name: "Verificar ingreso" }));
}

/** Tarjeta de resultado: texto y color de su banda. */
async function tarjeta(titulo) {
    const banda = (await screen.findByText(titulo)).closest("div.flex.items-center");
    const color = banda.className.includes(AZUL) ? "azul" : banda.className.includes(ROJO) ? "rojo" : "otro";
    return { texto: banda.parentElement.textContent, color };
}

/** Fila de "Mis últimos ingresos" del estudiante. */
async function filaUltimos(nombre) {
    const seccion = screen.getByRole("heading", { name: "Mis últimos ingresos" }).closest("section");
    return (await within(seccion).findByText(new RegExp(nombre))).closest("li").textContent;
}

beforeEach(() => {
    vi.clearAllMocks();
    sonidos.length = 0;
    ingresos = [];
    pedidos = [];
    globalThis.fetch = vi.fn(backendFalso);
    lector.isScanning = false;
    lector.start = vi.fn(async () => { lector.isScanning = true; });
    lector.stop = vi.fn(async () => { lector.isScanning = false; });
    lector.clear = vi.fn();
    Html5Qrcode.mockImplementation(function () { return lector; });
});

describe("HU05 · Control de ingreso (pruebas de regresión)", () => {
    it("TC-282 · Al escanear un QR válido sale Ingreso permitido en azul con sonido", async () => {
        const user = await abrirPanelOperador();
        await leerQr(user, QR_ANA);
        const t = await tarjeta("INGRESO PERMITIDO");
        const fila = await filaUltimos("Ana Pérez");
        console.log(`[EVIDENCIA TC-282] QR "${QR_ANA}" → envía ${JSON.stringify(pedidos[0])} · Tarjeta: "${t.texto}" · Color: ${t.color} · `
            + `Sonidos: ${JSON.stringify(sonidos)} Hz · Mis últimos ingresos: "${fila}"`);

        expect(pedidos[0]).toEqual(expect.objectContaining({ identificador: QR_ANA, metodoIngreso: "ESCANEO" }));
        expect(t.color, "La tarjeta de permitido debe ser azul").toBe("azul");
        expect(t.texto).toContain("Ana Pérez");
        expect(sonidos, "Debe sonar el tono de permitido (880 Hz)").toEqual([880]);
        expect(fila).toContain("QR");
    });

    it("TC-283 · En Ingreso manual un C.I. válido registra el ingreso en azul", async () => {
        const user = await abrirPanelOperador();
        await verificarManual(user, "8765432");
        const t = await tarjeta("INGRESO PERMITIDO");
        const fila = await filaUltimos("Ana Pérez");
        console.log(`[EVIDENCIA TC-283] C.I. 8765432 → envía ${JSON.stringify(pedidos[0])} · Tarjeta: "${t.texto}" · Color: ${t.color} · `
            + `Mis últimos ingresos: "${fila}"`);

        expect(pedidos[0]).toEqual(expect.objectContaining({ identificador: "8765432", metodoIngreso: "MANUAL" }));
        expect(t.color, "La tarjeta de permitido debe ser azul").toBe("azul");
        expect(t.texto).toContain("Ana Pérez");
        expect(fila).toContain("Manual");
    });

    it("TC-284 · En Ingreso manual un Código SIS de 9 dígitos registra el ingreso", async () => {
        const user = await abrirPanelOperador();
        await verificarManual(user, "202301246");
        const t = await tarjeta("INGRESO PERMITIDO");
        const fila = await filaUltimos("Bruno Rojas");
        console.log(`[EVIDENCIA TC-284] SIS 202301246 → envía ${JSON.stringify(pedidos[0])} · Tarjeta: "${t.texto}" · Color: ${t.color} · `
            + `Mis últimos ingresos: "${fila}"`);

        expect(pedidos[0]).toEqual(expect.objectContaining({ identificador: "202301246", metodoIngreso: "MANUAL" }));
        expect(t.color).toBe("azul");
        expect(t.texto).toContain("Bruno Rojas");
        expect(fila).toContain("SIS 202301246");
    });

    it("TC-285 · QR, manual y duplicado funcionan igual en una misma jornada", async () => {
        const user = await abrirPanelOperador();
        const pasos = [];

        await leerQr(user, QR_ANA);
        pasos.push(["QR de Ana", await tarjeta("INGRESO PERMITIDO")]);
        await user.click(screen.getByRole("button", { name: "Cerrar tarjeta" }));

        await verificarManual(user, "7654321");
        pasos.push(["C.I. de Bruno", await tarjeta("INGRESO PERMITIDO")]);
        await user.click(screen.getByRole("button", { name: "Cerrar tarjeta" }));

        await verificarManual(user, "8765432");
        pasos.push(["C.I. de Ana otra vez", await tarjeta("YA REGISTRADO")]);

        await filaUltimos("Bruno Rojas");
        const seccion = screen.getByRole("heading", { name: "Mis últimos ingresos" }).closest("section");
        const filas = within(seccion).getAllByRole("listitem").slice(1).map((li) => li.textContent);
        console.log(`[EVIDENCIA TC-285] ${pasos.map(([p, t]) => `${p} → ${t.color}: "${t.texto.slice(0, 60)}…"`).join(" · ")} · `
            + `Métodos enviados: ${pedidos.map((p) => p.metodoIngreso).join(", ")} · Ingresos guardados: ${ingresos.length} · `
            + `Sonidos: ${JSON.stringify(sonidos)} Hz · Mis últimos ingresos: ${JSON.stringify(filas)}`);

        expect(pasos.map(([, t]) => t.color)).toEqual(["azul", "azul", "rojo"]);
        expect(pasos[2][1].texto).toContain("No se creó un nuevo registro.");
        expect(pedidos.map((p) => p.metodoIngreso)).toEqual(["ESCANEO", "MANUAL", "MANUAL"]);
        expect(ingresos).toHaveLength(2);
        expect(sonidos).toEqual([880, 880, 220]);
        expect(filas).toHaveLength(2);
    });
});