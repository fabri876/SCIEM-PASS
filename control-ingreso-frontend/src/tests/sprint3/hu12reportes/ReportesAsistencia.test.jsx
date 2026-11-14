import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeccionReportesAsistencia from "../../../components/reportes/SeccionReportesAsistencia";
import { obtenerExamenesFinalizadosDocente } from "../../../services/examenService";
import { obtenerDocentesAdmin } from "../../../services/adminNormasService";
import { obtenerListaOficial } from "../../../services/ingresoService";
import { descargarReporteAsistencia } from "../../../services/reporteService";
import { cerrarSesion } from "../../../services/authService";

// HU12 · Reportes de asistencia, ausentes y cantidad de registrados (pantalla "Reportes y Asistencia").
// Pruebas unitarias, de integración (pantalla), de sistema, de validación y de seguridad de la pantalla.
// Se simulan las respuestas del servidor: no se llama al backend ni a Supabase.

vi.mock("../../../services/examenService", () => ({ obtenerExamenesFinalizadosDocente: vi.fn() }));
vi.mock("../../../services/adminNormasService", () => ({ obtenerDocentesAdmin: vi.fn() }));
vi.mock("../../../services/ingresoService", () => ({ obtenerListaOficial: vi.fn() }));
vi.mock("../../../services/reporteService", async () => {
    const real = await vi.importActual("../../../services/reporteService");
    return { ...real, descargarReporteAsistencia: vi.fn(), descargaReal: real.descargarReporteAsistencia };
});
vi.mock("../../../services/authService", () => ({
    obtenerToken: () => "token-de-prueba",
    cerrarSesion: vi.fn(),
    obtenerUsuarioActual: () => ({ idUsuario: 9, nombre: "Carla", apellido: "Salazar Serrudo", rol: "DOCENTE" }),
}));

// ---------- Datos de ejemplo ----------

const MATERIA = 10;
const examen = (idExamen, tipo, fecha, aulas, extra = {}) => ({
    idExamen, idAsignatura: MATERIA, nombreAsignatura: "INTRODUCCION A LA PROGRAMACION", nombreTipoExamen: tipo,
    nombreGrupo: "6", fechaExamen: fecha, horaInicio: "13:50", horaFin: "19:50", idUsuario: 9,
    nombreDocente: "Carla Salazar Serrudo", ambientes: aulas.map((a) => ({ nombreAmbiente: a, horaInicio: "13:50", horaFin: "19:50" })), ...extra,
});
const UNA_AULA = examen(857, "Segunda Instancia", "2026-11-10", ["Aula 691B"]);
const DOS_AULAS = examen(858, "Primer Parcial", "2026-10-01", ["Aula 691B", "Aula 692A"]);
const SIN_INGRESOS = examen(861, "Segundo Parcial", "2026-10-20", ["Aula 691B"]);
const FUTURO = examen(859, "Examen Final", "2027-01-15", ["Aula 691B"]);
const OTRA_MATERIA = examen(860, "Primer Parcial", "2026-10-05", ["Aula 693"], { idAsignatura: 20, nombreAsignatura: "ELECTROTECNIA INDUSTRIAL" });
const DE_OTRO_DOCENTE = examen(870, "Primer Parcial", "2026-10-08", ["Aula 694"], { idAsignatura: 30, nombreAsignatura: "FISICA GENERAL", idUsuario: 7 });

const est = (sis, apellidos, nombres, estado, aula, extra = {}) => ({ sis, ci: String(sis).slice(-7), apellidos, nombres, estado, aulaAsignada: aula, habilitado: estado !== "INHABILITADO", ...extra });
const LISTAS = {
    857: [
        est(202608004, "Arce Guzmán", "Daniela", "INGRESO", "Aula 691B", { horaIngreso: "14:02:53" }),
        est(202608002, "Ramos Villarroel", "Camila", "INGRESO", "Aula 691B", { horaIngreso: "14:29:15" }),
        est(202608001, "Herrera Condori", "Sebastián", "PENDIENTE", "Aula 691B"),
        est(202608003, "Soria Mendoza", "Joaquín", "PENDIENTE", "Aula 691B"),
        est(202608005, "Zurita Paredes", "Mateo", "INHABILITADO", "Aula 691B", { observacion: "copia en el primer parcial" }),
        est(202608006, "Quiroga Salinas", "Andrea", "INHABILITADO", "Aula 691B"),
    ],
    858: [
        est(202608004, "Arce Guzmán", "Daniela", "INGRESO", "Aula 691B", { horaIngreso: "08:20:00" }),
        est(202608002, "Ramos Villarroel", "Camila", "PENDIENTE", "Aula 691B"),
        est(202608001, "Herrera Condori", "Sebastián", "INGRESO", "Aula 692A", { horaIngreso: "08:25:00" }),
        // La misma estudiante figura también en la otra aula (por ejemplo, tras un cambio de aula)
        est(202608004, "Arce Guzmán", "Daniela", "INGRESO", "Aula 692A", { horaIngreso: "08:20:00" }),
    ],
    861: [
        est(202608001, "Herrera Condori", "Sebastián", "PENDIENTE", "Aula 691B"),
        est(202608002, "Ramos Villarroel", "Camila", "PENDIENTE", "Aula 691B"),
        est(202608003, "Soria Mendoza", "Joaquín", "PENDIENTE", "Aula 691B"),
    ],
};

// ---------- Ayudas ----------

let descargados = [];
beforeAll(() => {
    URL.createObjectURL = () => "blob:reporte";
    URL.revokeObjectURL = () => { };
    HTMLAnchorElement.prototype.click = function click() { descargados.push(this.download); };
});

beforeEach(() => {
    descargados = [];
    obtenerExamenesFinalizadosDocente.mockReset();
    obtenerExamenesFinalizadosDocente.mockImplementation(async (idDocente) =>
        idDocente ? [UNA_AULA, DOS_AULAS, OTRA_MATERIA, DE_OTRO_DOCENTE] : [UNA_AULA, DOS_AULAS, SIN_INGRESOS, FUTURO, OTRA_MATERIA]);
    obtenerDocentesAdmin.mockReset();
    obtenerDocentesAdmin.mockResolvedValue([
        { idUsuario: 9, nombre: "Carla", apellido: "Salazar Serrudo" },
        { idUsuario: 7, nombre: "Jorge", apellido: "Rojas Vargas" },
    ]);
    obtenerListaOficial.mockReset();
    obtenerListaOficial.mockImplementation(async (id) => LISTAS[id] || []);
    descargarReporteAsistencia.mockReset();
    descargarReporteAsistencia.mockResolvedValue({ blobArchivo: new Blob(["%PDF-1.4"]), strNombre: "reporte-asistencia-857.pdf" });
});

const user = () => userEvent.setup({ delay: null });
const opciones = (etiqueta) => [...screen.getByLabelText(etiqueta).querySelectorAll("option")].map((o) => o.textContent).filter((t) => !/^Selecciona/.test(t));

async function abrir(rol = "DOCENTE") {
    render(<SeccionReportesAsistencia strRol={rol} />);
    await waitFor(() => expect(obtenerExamenesFinalizadosDocente.mock.calls.length + obtenerDocentesAdmin.mock.calls.length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByLabelText("Materia")).not.toHaveTextContent("Cargando"));
}

async function elegirExamen(u, idExamen, idMateria = MATERIA) {
    await waitFor(() => expect(screen.getByLabelText("Materia")).toBeEnabled());
    await u.selectOptions(screen.getByLabelText("Materia"), String(idMateria));
    await u.selectOptions(screen.getByLabelText("Examen finalizado"), String(idExamen));
    await screen.findByRole("table");
}

// Filas de la tabla "Resumen": [aula, inscritos, asistieron, ausentes, inhabilitados, %]
const filasResumen = () => within(screen.getByRole("table")).getAllByRole("row").slice(1)
    .map((tr) => within(tr).getAllByRole("cell").map((td) => td.textContent.trim()));

async function marcar(u, ...secciones) {
    for (const s of secciones) await u.click(screen.getByLabelText(s));
}

const vistaPrevia = () => screen.getByText("Vista previa").parentElement;
const botonDescargar = () => screen.getByRole("button", { name: /Descargar reporte|Generando reporte/ });

// ---------- Unitarias ----------

describe("HU12 Reportes · Unitarias", () => {
    it("TC-011 · Cada estudiante se cuenta una sola vez aunque figure en dos aulas", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 858);
        const total = filasResumen().find((f) => f[0] === "Total");
        console.log(`[EVIDENCIA] TC-011 · Daniela Arce figura en el Aula 691B y en el Aula 692A · filas: ${JSON.stringify(filasResumen())}`);
        console.log(`[EVIDENCIA]   Inscritos en "Total": ${total[1]} (esperado: 3) · Asistieron: ${total[2]} (esperado: 2)`);
        expect(total[1]).toBe("3");
        expect(total[2]).toBe("2");
    });

    it("TC-012 · El % de asistencia se redondea al entero y es 0% sin asistentes", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        const fila857 = filasResumen()[0];
        await u.selectOptions(screen.getByLabelText("Examen finalizado"), "861");
        await waitFor(() => expect(filasResumen()[0][2]).toBe("0"));
        const fila861 = filasResumen()[0];
        console.log(`[EVIDENCIA] TC-012 · 2 de 6 asistieron: "${fila857[5]}" (esperado: "33%", sin decimales)`);
        console.log(`[EVIDENCIA]   0 de 3 asistieron: "${fila861[5]}" (esperado: "0%")`);
        expect(fila857[5]).toBe("33%");
        expect(fila861[5]).toBe("0%");
    });

    it("TC-013 · Los inhabilitados suman en \"Inscritos\" y no en \"Ausentes\"", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        const [aula, inscritos, asistieron, ausentes, inhabilitados] = filasResumen()[0];
        console.log(`[EVIDENCIA] TC-013 · ${aula}: Inscritos ${inscritos} · Asistieron ${asistieron} · Ausentes ${ausentes} · Inhabilitados ${inhabilitados} (esperado: 6 · 2 · 2 · 2)`);
        expect([inscritos, asistieron, ausentes, inhabilitados]).toEqual(["6", "2", "2", "2"]);
    });
});

// ---------- Integración (pantalla) ----------

describe("HU12 Reportes · Integración (pantalla)", () => {
    it("TC-062 · Al cambiar materia, examen o contenido se actualizan el resumen y la vista previa", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        const antes = filasResumen();
        await u.selectOptions(screen.getByLabelText("Examen finalizado"), "858");
        await waitFor(() => expect(filasResumen().length).toBeGreaterThan(1));
        const despues = filasResumen();
        await marcar(u, "Resumen de cantidades");
        const conResumen = vistaPrevia().textContent.includes("Resumen");
        await marcar(u, "Lista de ausentes");
        const conAusentes = vistaPrevia().textContent.includes("Ausentes");
        await u.selectOptions(screen.getByLabelText("Materia"), "20");
        const sinExamen = !screen.queryByRole("table");
        console.log(`[EVIDENCIA] TC-062 · Resumen del examen 857: ${JSON.stringify(antes)} → del examen 858: ${JSON.stringify(despues)}`);
        console.log(`[EVIDENCIA]   Vista previa con "Resumen" al marcarlo: ${conResumen ? "sí" : "no"} · con "Ausentes" al marcarlo: ${conAusentes ? "sí" : "no"}`);
        console.log(`[EVIDENCIA]   Al cambiar de materia se limpia el resumen anterior: ${sinExamen ? "sí" : "no"}`);
        expect(despues).not.toEqual(antes);
        expect(conResumen && conAusentes && sinExamen).toBe(true);
    });

    it("TC-067 · Presionar varias veces \"Descargar reporte\" genera un solo archivo", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        await marcar(u, "Resumen de cantidades");
        let terminar;
        descargarReporteAsistencia.mockImplementation(() => new Promise((r) => { terminar = () => r({ blobArchivo: new Blob(["%PDF"]), strNombre: "" }); }));
        await u.click(botonDescargar());
        await u.click(botonDescargar());
        await u.click(botonDescargar());
        terminar();
        await screen.findByText("Reporte descargado correctamente.");
        console.log(`[EVIDENCIA] TC-067 · 3 clics seguidos en "Descargar reporte": ${descargarReporteAsistencia.mock.calls.length} pedido(s) al servidor · ${descargados.length} archivo(s) (esperado: 1 y 1)`);
        expect(descargarReporteAsistencia).toHaveBeenCalledTimes(1);
        expect(descargados).toHaveLength(1);
    });
});

// ---------- Sistema ----------

describe("HU12 Reportes · Sistema", () => {
    it("TC-150 · El docente ve materia, examen, contenido y formato", async () => {
        await abrir();
        const campos = ["Materia", "Examen finalizado"].map((e) => Boolean(screen.queryByLabelText(e)));
        const contenido = Boolean(screen.queryByText("Contenido del reporte"));
        const formato = Boolean(screen.queryByRole("radiogroup", { name: "Formato del reporte" }));
        console.log(`[EVIDENCIA] TC-150 · Materia: ${campos[0] ? "sí" : "no"} · Examen: ${campos[1] ? "sí" : "no"} · Contenido: ${contenido ? "sí" : "no"} · Formato: ${formato ? "sí" : "no"}`);
        expect([...campos, contenido, formato]).toEqual([true, true, true, true]);
    });

    it("TC-151 · El administrador ve el campo \"Docente\" antes de elegir la materia", async () => {
        await abrir("ADMINISTRADOR");
        const docente = screen.getByLabelText("Docente");
        const ayuda = screen.getByText("Primero selecciona un docente.");
        const antes = docente.compareDocumentPosition(screen.getByLabelText("Materia")) & Node.DOCUMENT_POSITION_FOLLOWING;
        console.log(`[EVIDENCIA] TC-151 · Campo "Docente": sí · está antes de "Materia": ${antes ? "sí" : "no"} · "Materia" deshabilitada: ${screen.getByLabelText("Materia").disabled ? "sí" : "no"} · ayuda: "${ayuda.textContent}"`);
        expect(antes).toBeTruthy();
        expect(screen.getByLabelText("Materia")).toBeDisabled();
    });

    it("TC-152 · El selector de examen muestra solo los exámenes finalizados de la materia", async () => {
        const u = user();
        await abrir();
        await u.selectOptions(screen.getByLabelText("Materia"), String(MATERIA));
        const lista = opciones("Examen finalizado");
        console.log(`[EVIDENCIA] TC-152 · Exámenes en el selector: ${lista.join(" | ")} (el "Examen Final" del 15 ene 2027 todavía no terminó)`);
        expect(lista.some((t) => t.includes("Examen Final"))).toBe(false);
        expect(lista).toHaveLength(3);
    });

    it("TC-153 · La tabla \"Resumen\" muestra inscritos, asistieron, ausentes, inhabilitados y %", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        const columnas = within(screen.getByRole("table")).getAllByRole("columnheader").map((th) => th.textContent);
        console.log(`[EVIDENCIA] TC-153 · Columnas: ${columnas.join(" | ")} · fila: ${filasResumen()[0].join(" | ")}`);
        expect(columnas).toEqual(["Aula", "Inscritos", "Asistieron", "Ausentes", "Inhabilitados", "% de asistencia"]);
    });

    it("TC-154 · Un examen de dos aulas muestra una fila por aula y la fila \"Total\"", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 858);
        const aulas = filasResumen().map((f) => f[0]);
        console.log(`[EVIDENCIA] TC-154 · Filas de la tabla "Resumen": ${aulas.join(" | ")} (esperado: Aula 691B | Aula 692A | Total)`);
        expect(aulas).toEqual(["Aula 691B", "Aula 692A", "Total"]);
    });

    it("TC-156 · El archivo descargado tiene un nombre con la materia, el examen y la fecha", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        await marcar(u, "Resumen de cantidades");
        await u.click(botonDescargar());
        await screen.findByText("Reporte descargado correctamente.");
        const nombre = descargados[0] || "";
        const tiene = { materia: /introduccion/i.test(nombre), examen: /segunda/i.test(nombre), fecha: /2026-11-10|10-11-2026|20261110/.test(nombre) };
        console.log(`[EVIDENCIA] TC-156 · Nombre del archivo descargado: "${nombre}"`);
        console.log(`[EVIDENCIA]   ¿Tiene la materia?: ${tiene.materia ? "sí" : "no"} · ¿el examen?: ${tiene.examen ? "sí" : "no"} · ¿la fecha?: ${tiene.fecha ? "sí" : "no"} (esperado: sí, sí, sí)`);
        expect(tiene).toEqual({ materia: true, examen: true, fecha: true });
    });

    it("TC-158 · Si falla la conexión se muestra un error y no se descarga ningún archivo", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        await marcar(u, "Resumen de cantidades");
        descargarReporteAsistencia.mockRejectedValue(new Error("No se pudo generar el reporte. Revisa tu conexión e intenta de nuevo."));
        await u.click(botonDescargar());
        const aviso = await screen.findByRole("alert");
        console.log(`[EVIDENCIA] TC-158 · Aviso: "${aviso.textContent}" · archivos descargados: ${descargados.length} (esperado: 0)`);
        expect(aviso).toHaveTextContent(/No se pudo generar el reporte/);
        expect(descargados).toHaveLength(0);
    });

    it("TC-159 · Tras una caída del servidor se puede volver a generar el reporte", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        await marcar(u, "Resumen de cantidades");
        descargarReporteAsistencia.mockRejectedValueOnce(new Error("No se pudo generar el reporte. Intenta de nuevo."));
        await u.click(botonDescargar());
        await screen.findByRole("alert");
        await u.click(botonDescargar());
        const ok = await screen.findByText("Reporte descargado correctamente.");
        console.log(`[EVIDENCIA] TC-159 · Primer intento: error · segundo intento: "${ok.textContent}" · archivos: ${descargados.length} (esperado: 1)`);
        expect(descargados).toHaveLength(1);
    });
});

// ---------- Validación ----------

describe("HU12 Reportes · Validación", () => {
    it("TC-245 · Sin secciones marcadas no se descarga y se pide elegir al menos una", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        await u.click(botonDescargar());
        const aviso = await screen.findByRole("alert");
        console.log(`[EVIDENCIA] TC-245 · Aviso: "${aviso.textContent}" · pedidos al servidor: ${descargarReporteAsistencia.mock.calls.length} (esperado: 0)`);
        expect(aviso).toHaveTextContent("Selecciona al menos una opción en el contenido del reporte.");
        expect(descargarReporteAsistencia).not.toHaveBeenCalled();
    });

    it("TC-246 · Un examen sin ingresos muestra 0 en \"Asistieron\" y permite descargar", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 861);
        await marcar(u, "Resumen de cantidades");
        const asistieron = filasResumen()[0][2];
        await u.click(botonDescargar());
        await screen.findByText("Reporte descargado correctamente.");
        console.log(`[EVIDENCIA] TC-246 · "Asistieron": ${asistieron} (esperado: 0) · archivos descargados: ${descargados.length} (esperado: 1)`);
        expect(asistieron).toBe("0");
        expect(descargados).toHaveLength(1);
    });

    it("TC-248 · Al elegir el examen se muestra la tabla \"Resumen\" con sus filas por aula", async () => {
        const u = user();
        await abrir();
        await u.selectOptions(screen.getByLabelText("Materia"), String(MATERIA));
        const antes = Boolean(screen.queryByRole("table"));
        await u.selectOptions(screen.getByLabelText("Examen finalizado"), "858");
        await screen.findByRole("table");
        console.log(`[EVIDENCIA] TC-248 · Tabla antes de elegir el examen: ${antes ? "sí" : "no"} · después: sí · filas: ${filasResumen().map((f) => f[0]).join(" | ")}`);
        expect(antes).toBe(false);
        expect(filasResumen().length).toBe(3);
    });

    it("TC-249 · La vista previa del PDF muestra SCIEM-PASS, título, examen, docente y emisión", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        await marcar(u, "Resumen de cantidades");
        const texto = vistaPrevia().textContent;
        const partes = { "SCIEM-PASS": /SCIEM-PASS/, "Reporte de asistencia": /Reporte de asistencia/, "Examen": /Examen:\s*Segunda Instancia/, "Docente": /Docente:\s*Carla Salazar Serrudo/, "Emitido": /Emitido:/ };
        const encontradas = Object.entries(partes).map(([k, r]) => `${k}: ${r.test(texto) ? "sí" : "no"}`);
        console.log(`[EVIDENCIA] TC-249 · ${encontradas.join(" · ")}`);
        Object.values(partes).forEach((r) => expect(texto).toMatch(r));
    });

    it("TC-250 · La vista previa del PDF muestra solo las secciones marcadas, con sus columnas", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        await marcar(u, "Lista de ausentes", "Inhabilitados con motivo");
        const vista = within(vistaPrevia());
        const secciones = { Resumen: Boolean(vista.queryByText("Resumen")), Asistentes: Boolean(vista.queryByText(/^Asistentes/)), Ausentes: Boolean(vista.queryByText(/^Ausentes/)), Inhabilitados: Boolean(vista.queryByText(/^Inhabilitados/)) };
        const columnasMotivo = Boolean(vista.queryByText("Motivo"));
        console.log(`[EVIDENCIA] TC-250 · Marcadas: Ausentes e Inhabilitados · en la vista previa: ${JSON.stringify(secciones)} · columna "Motivo": ${columnasMotivo ? "sí" : "no"}`);
        expect(secciones).toEqual({ Resumen: false, Asistentes: false, Ausentes: true, Inhabilitados: true });
        expect(columnasMotivo).toBe(true);
    });
});

// ---------- Seguridad (pantalla) ----------

describe("HU12 Reportes · Seguridad", () => {
    it("TC-318 · El docente ve en \"Materia\" solo sus materias con exámenes finalizados", async () => {
        await abrir();
        const materias = opciones("Materia");
        console.log(`[EVIDENCIA] TC-318 · Materias del docente: ${materias.join(" | ")} · pedido al servidor: ${obtenerExamenesFinalizadosDocente.mock.calls[0][0] === undefined ? "sus exámenes finalizados" : "otro"}`);
        expect(materias).toEqual(["ELECTROTECNIA INDUSTRIAL", "INTRODUCCION A LA PROGRAMACION"]);
    });

    it("TC-319 · El administrador ve en \"Materia\" solo las materias del docente elegido", async () => {
        const u = user();
        await abrir("ADMINISTRADOR");
        await u.selectOptions(screen.getByLabelText("Docente"), "9");
        await waitFor(() => expect(screen.getByLabelText("Materia")).toBeEnabled());
        const materias = opciones("Materia");
        console.log(`[EVIDENCIA] TC-319 · Docente Carla Salazar · materias: ${materias.join(" | ")} (FISICA GENERAL es de otro docente y no debe aparecer)`);
        expect(materias).not.toContain("FISICA GENERAL");
        expect(materias).toEqual(["ELECTROTECNIA INDUSTRIAL", "INTRODUCCION A LA PROGRAMACION"]);
    });

    it("TC-322 · \"Reportes y Asistencia\" no ofrece ninguna opción para cambiar la asistencia", async () => {
        const u = user();
        await abrir();
        await elegirExamen(u, 857);
        const botones = [...screen.getAllByRole("radio"), ...screen.getAllByRole("button")].map((b) => b.textContent.trim());
        const editables = screen.queryAllByRole("textbox").length + screen.queryAllByRole("spinbutton").length;
        console.log(`[EVIDENCIA] TC-322 · Botones: ${botones.join(" | ")} · campos para escribir: ${editables} (esperado: solo PDF, Excel y Descargar reporte · 0 campos)`);
        expect(botones).toEqual(["PDF", "Excel", "Descargar reporte"]);
        expect(editables).toBe(0);
    });

    it("TC-323 · Con la sesión expirada al descargar se pide iniciar sesión de nuevo", async () => {
        const { descargaReal } = await import("../../../services/reporteService");
        const fetchOriginal = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
        sessionStorage.clear();
        let error = null;
        try { await descargaReal(857, "pdf", ["resumen"]); } catch (e) { error = e; }
        globalThis.fetch = fetchOriginal;
        const mensaje = sessionStorage.getItem("mensajeSesion");
        console.log(`[EVIDENCIA] TC-323 · Respuesta del servidor: 401 · se cerró la sesión: ${cerrarSesion.mock.calls.length ? "sí" : "no"} · mensaje para el login: "${mensaje}" · error: "${error?.message}"`);
        expect(cerrarSesion).toHaveBeenCalled();
        expect(mensaje).toBe("Sesión expirada. Por favor, inicia sesión nuevamente.");
    });
});