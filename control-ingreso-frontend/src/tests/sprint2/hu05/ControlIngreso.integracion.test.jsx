import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ControlIngresoDocente from "../../../pages/control/ingreso/ControlIngresoDocente";
import { ContextoOperador } from "../../../pages/control/operadorContexto";

// Se simulan la sesión, el encabezado y la cámara. El servidor se simula con un "backend falso"
// (abajo) que responde como el real; la pantalla, el control de ingreso y el servicio son los reales.
vi.mock("../../../services/authService", () => ({
    obtenerToken: vi.fn(() => "token-de-prueba"),
    obtenerUsuarioActual: vi.fn(() => ({ nombre: "Docente", apellido: "Prueba", rol: "DOCENTE", idUsuario: 7 })),
    cerrarSesion: vi.fn(),
}));
vi.mock("../../../components/layout/Header", () => ({ default: () => <header>Encabezado</header> }));
vi.mock("html5-qrcode", () => ({ Html5Qrcode: vi.fn() }));

const hoy = new Date();
const strHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
const EXAMEN = {
    idExamen: 1, idAsignatura: 10, idambiente: 5, nombreAsignatura: "Cálculo I", tipoExamen: "Primer parcial",
    aulaNombre: "691A", fechaExamen: strHoy, horaInicio: "00:00", horaFin: "23:59", ingresados: 0, totalInscritos: 3,
};
const ESTUDIANTES = [
    { ci: "8765432", sis: 202301245, nombres: "Ana", apellidos: "Pérez" },
    { ci: "7654321", sis: 202301246, nombres: "Bruno", apellidos: "Rojas" },
];

/* ---------------- Backend falso ---------------- */
let ingresos = [];
let peticiones = [];
const responder = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

async function backendFalso(url, opciones = {}) {
    const u = new URL(url, "http://localhost:8080");
    const metodo = opciones.method || "GET";
    peticiones.push({ metodo, ruta: u.pathname + u.search, cuerpo: opciones.body ? JSON.parse(opciones.body) : null });

    if (u.pathname === "/api/v1/examenes/delegados") return responder(200, []);
    if (u.pathname === "/api/v1/control/examen-seleccionado") {
        return responder(200, { ingresaron: ingresos.length, faltantes: 3 - ingresos.length, totalHabilitados: 3 });
    }
    if (u.pathname === "/api/v1/control/ultimos-ingresos") {
        return responder(200, [...ingresos].reverse().slice(0, 5).map((i, n) => ({
            idIngreso: 100 + n, horaIngreso: `${strHoy}T${i.hora}`, metodoIngreso: "MANUAL", registradoPor: i.registradoPor,
            estudiante: { nombreCompleto: `${i.e.nombres} ${i.e.apellidos}`, ci: i.e.ci, codsisestudiante: i.e.sis },
        })));
    }
    if (u.pathname === "/api/v1/control/ingresos" && metodo === "POST") {
        await new Promise((r) => setTimeout(r, 150)); // demora de la red
        const { identificador } = JSON.parse(opciones.body);
        const e = ESTUDIANTES.find((x) => x.ci === identificador || String(x.sis) === identificador);
        const resumen = e && { idusuario: 1, codsisestudiante: e.sis, ci: e.ci, nombreCompleto: `${e.nombres} ${e.apellidos}` };
        if (!e) return responder(404, { estado: "NO_ENCONTRADO", mensaje: "No encontrado" });
        if (ingresos.some((i) => i.e === e)) return responder(409, { estado: "DUPLICADO", estudiante: resumen });
        const hora = `08:0${ingresos.length + 1}:00`;
        ingresos.push({ e, hora, registradoPor: "Docente Prueba" });
        return responder(201, { estado: "PERMITIDO", estudiante: resumen, horaIngreso: `${strHoy}T${hora}` });
    }
    const lista = u.pathname.match(/^\/api\/v1\/control\/examenes\/(\d+)\/lista-oficial$/);
    if (lista) {
        const buscar = (u.searchParams.get("buscar") || "").toLowerCase();
        return responder(200, ESTUDIANTES
            .filter((e) => !buscar || e.apellidos.toLowerCase().includes(buscar) || e.ci.includes(buscar))
            .map((e) => {
                const i = ingresos.find((x) => x.e === e);
                return { ...e, codSisEstudiante: e.sis, estado: i ? "INGRESO" : "PENDIENTE", horaIngreso: i?.hora };
            }));
    }
    // Ruta que el servidor real no reconoce (por ejemplo, un id de examen que no es un número)
    return responder(400, { mensaje: `Ruta no válida: ${u.pathname}` });
}

/* ---------------- Pantalla ---------------- */
function abrirControl() {
    const user = userEvent.setup();
    render(
        <ContextoOperador.Provider value={{ estadoRed: { net: "online", pend: 0 }, fnCambiarRed: vi.fn() }}>
            <MemoryRouter initialEntries={[{ pathname: "/home/docente/examenes/1/control-ingreso", state: { examen: EXAMEN } }]}>
                <Routes>
                    <Route path="/home/docente/examenes/:idExamen/control-ingreso" element={<ControlIngresoDocente />} />
                </Routes>
            </MemoryRouter>
        </ContextoOperador.Provider>
    );
    return user;
}

const contadorIngresaron = () => screen.getByText("Ingresaron").querySelector("b").textContent;
const posts = () => peticiones.filter((p) => p.metodo === "POST");

async function verificarManual(user, documento, { doble = false } = {}) {
    await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
    await user.type(screen.getByLabelText("C.I. o Código SIS del estudiante"), documento);
    const boton = screen.getByRole("button", { name: "Verificar ingreso" });
    if (doble) await user.dblClick(boton);
    else await user.click(boton);
}

beforeEach(() => {
    ingresos = [];
    peticiones = [];
    globalThis.fetch = vi.fn(backendFalso);
});

describe("HU05 · Control de ingreso (pruebas de integración)", () => {
    it("TC-044 · El equipo no envía su hora al registrar: la pone el servidor", async () => {
        const user = abrirControl();
        await verificarManual(user, "8765432");
        await screen.findByText("INGRESO PERMITIDO");

        const cuerpo = posts()[0].cuerpo;
        console.log(`[EVIDENCIA TC-044] Datos que envía el equipo al registrar: ${JSON.stringify(cuerpo)} · `
            + `Hora mostrada (la que devolvió el servidor): ${screen.getAllByText("08:01:00")[0].textContent}`);

        // El equipo solo envía qué estudiante, examen, aula y método; ningún dato de fecha u hora
        expect(Object.keys(cuerpo).filter((k) => /hora|fecha|time|date/i.test(k))).toEqual([]);
        expect(cuerpo).toEqual(expect.objectContaining({ identificador: "8765432", idexamen: 1, idasignatura: 10, idambiente: 5 }));
    });

    it("TC-045 · Últimos ingresos muestra estudiante, hora, método y quién registró", async () => {
        ingresos = [{ e: ESTUDIANTES[1], hora: "07:55:00", registradoPor: "Operador Uno" }];
        abrirControl();
        const tabla = (await screen.findByRole("heading", { name: "Últimos ingresos" })).closest("section");
        await within(tabla).findByText(/Bruno Rojas/);
        const fila = within(tabla).getByText(/Bruno Rojas/).closest("li");
        console.log(`[EVIDENCIA TC-045] Fila de Últimos ingresos: "${fila.textContent}"`);

        expect(fila).toHaveTextContent("07:55:00");
        expect(fila).toHaveTextContent("Bruno Rojas");
        expect(fila).toHaveTextContent("SIS 202301246");
        expect(fila).toHaveTextContent("Manual");
        expect(fila).toHaveTextContent("Operador Uno");
    });

    it("TC-046 · Un doble clic en Verificar ingreso registra una sola vez", async () => {
        const user = abrirControl();
        await verificarManual(user, "8765432", { doble: true });
        await screen.findByText("INGRESO PERMITIDO");
        await new Promise((r) => setTimeout(r, 400)); // por si llegara un segundo pedido

        console.log(`[EVIDENCIA TC-046] Doble clic en Verificar ingreso → pedidos de registro enviados: ${posts().length} · `
            + `Ingresos guardados: ${ingresos.length} · Resultado mostrado: INGRESO PERMITIDO`);

        expect(posts()).toHaveLength(1);
        expect(ingresos).toHaveLength(1);
    });

    it("TC-048 · La Lista oficial muestra Sin coincidencias si no hay ese apellido", async () => {
        const user = abrirControl();
        await user.click(screen.getByRole("button", { name: /Lista oficial del aula/ }));
        const panel = screen.getByRole("dialog");
        const buscador = within(panel).getByLabelText("Buscar en la lista oficial");

        await user.type(buscador, "rojas");
        const encontrado = await within(panel).findByText("Rojas, Bruno").then(() => true).catch(() => false);
        await user.clear(buscador);
        await user.type(buscador, "zzz");
        await waitFor(() => expect(peticiones.some((p) => p.ruta.includes("buscar=zzz"))).toBe(true));
        const mensaje = await within(panel).findByText("Sin coincidencias en la lista oficial.").then(() => true).catch(() => false);
        const rutas = peticiones.filter((p) => p.ruta.includes("lista-oficial")).map((p) => p.ruta);
        console.log(`[EVIDENCIA TC-048] Buscar "rojas" muestra a Rojas, Bruno: ${encontrado} · Buscar "zzz" muestra `
            + `"Sin coincidencias en la lista oficial.": ${mensaje} · Direcciones consultadas: ${rutas.join(" | ")}`);

        expect(encontrado, "Primero debe encontrar un apellido que sí existe").toBe(true);
        expect(mensaje).toBe(true);
    });

    it("TC-049 · Registrar ingreso en la Lista oficial cambia el estado a Ingresó", async () => {
        const user = abrirControl();
        await user.click(screen.getByRole("button", { name: /Lista oficial del aula/ }));
        const panel = screen.getByRole("dialog");
        const fila = await within(panel).findByText("Pérez, Ana").then((n) => n.closest("li")).catch(() => null);
        const rutas = () => peticiones.filter((p) => p.ruta.includes("lista-oficial")).map((p) => p.ruta);
        if (!fila) {
            console.log(`[EVIDENCIA TC-049] La lista oficial no cargó estudiantes · Direcciones consultadas: ${rutas().join(" | ")}`);
        }
        expect(fila, "La lista oficial debe mostrar a Pérez, Ana").not.toBeNull();

        await user.click(within(fila).getByRole("button", { name: "Registrar ingreso" }));
        await waitFor(() => expect(within(panel).getByText("Pérez, Ana").closest("li")).toHaveTextContent("Ingresó"));
        const filaDespues = within(panel).getByText("Pérez, Ana").closest("li");
        console.log(`[EVIDENCIA TC-049] Antes: "${fila.textContent}" · Registrar ingreso envía: ${JSON.stringify(posts()[0].cuerpo)} · `
            + `Después: "${filaDespues.textContent}"`);

        expect(filaDespues).toHaveTextContent("Ingresó 08:01:00");
        expect(within(filaDespues).queryByRole("button", { name: "Registrar ingreso" })).not.toBeInTheDocument();
    });

    it("TC-050 · El contador y Últimos ingresos se actualizan sin recargar la página", async () => {
        const user = abrirControl();
        await waitFor(() => expect(peticiones.some((p) => p.ruta.includes("ultimos-ingresos"))).toBe(true));
        const antes = contadorIngresaron();

        await verificarManual(user, "8765432");
        await screen.findByText("INGRESO PERMITIDO");
        const tabla = screen.getByRole("heading", { name: "Últimos ingresos" }).closest("section");
        await within(tabla).findByText(/Ana Pérez/);
        await waitFor(() => expect(contadorIngresaron()).toBe("1"));
        console.log(`[EVIDENCIA TC-050] Contador "Ingresaron" antes: ${antes} · después: ${contadorIngresaron()} · `
            + `Últimos ingresos muestra a Ana Pérez: sí · La página no se recargó (misma pantalla)`);

        expect(antes).toBe("0");
        expect(contadorIngresaron()).toBe("1");
    });
});