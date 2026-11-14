import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PanelListaOficial from "../../../pages/control/ingreso/componentes/PanelListaOficial";
import { obtenerListaOficial } from "../../../services/ingresoService";

// HU11 · Lista oficial del aula en tiempo real.
// Pruebas unitarias, de sistema, de validación, de seguridad (TC-317), de regresión y
// los avisos de conexión (TC-061 y TC-148).
// Se simula la respuesta del servidor: no se llama al backend ni a Supabase.

vi.mock("../../../services/ingresoService", () => ({
    obtenerListaOficial: vi.fn(),
}));

// Datos de un aula de ejemplo: 2 ingresaron, 2 ausentes y 2 inhabilitados (uno sin motivo).
const FILAS = [
    { apellidos: "Arce Guzmán", nombres: "Daniela", sis: 202608004, ci: "8548104", estado: "INGRESO", horaIngreso: "14:02:53" },
    { apellidos: "Ramos Villarroel", nombres: "Camila", sis: 202608002, ci: "8548102", estado: "INGRESO", horaIngreso: "14:29:15" },
    { apellidos: "Herrera Condori", nombres: "Sebastián", sis: 202608001, ci: "8548101", estado: "PENDIENTE" },
    { apellidos: "Soria Mendoza", nombres: "Joaquín", sis: 202608003, ci: "8548103", estado: "PENDIENTE" },
    { apellidos: "Zurita Paredes", nombres: "Mateo", sis: 202608005, ci: "8548105", estado: "INHABILITADO", observacion: "copia en el primer parcial" },
    { apellidos: "Quiroga Salinas", nombres: "Andrea", sis: 202608006, ci: "8548106", estado: "INHABILITADO", observacion: "" },
];

const PROPS = { boolAbierto: true, onCerrar: () => { }, idExamen: 857, numVersion: 0 };

async function abrirLista(filas = FILAS) {
    obtenerListaOficial.mockReset();
    obtenerListaOficial.mockResolvedValue(filas);
    const vista = render(<PanelListaOficial {...PROPS} />);
    if (filas.length) await screen.findAllByText(/SIS \d+/);
    else await waitFor(() => expect(obtenerListaOficial).toHaveBeenCalled());
    return vista;
}

// Filas visibles de la lista (cada una tiene "SIS … · C.I. …").
const filasVisibles = () => screen.queryAllByRole("listitem").filter((li) => /SIS \d+/.test(li.textContent));
const pestana = (texto) => screen.getByRole("tab", { name: new RegExp(`^${texto} \\(`) });
const numeroDe = (texto) => Number(pestana(texto).textContent.match(/\((\d+)\)/)?.[1]);
const buscador = () => screen.getByPlaceholderText(/Buscar por apellido/i);

// ---------- Pruebas unitarias ----------

describe("HU11 Lista oficial · Unitarias", () => {
    it("TC-007 · El conteo separa ingresados, ausentes e inhabilitados", async () => {
        await abrirLista();
        const conteo = { ingresaron: numeroDe("Ingresaron"), ausentes: numeroDe("Ausentes"), inhabilitados: numeroDe("Inhabilitados") };
        console.log(`[EVIDENCIA] TC-007 · Ingresaron ${conteo.ingresaron} · Ausentes ${conteo.ausentes} · Inhabilitados ${conteo.inhabilitados} (esperado: 2 · 2 · 2)`);
        expect(conteo).toEqual({ ingresaron: 2, ausentes: 2, inhabilitados: 2 });
    });

    it("TC-008 · El total coincide con la cantidad de estudiantes que envía el servidor", async () => {
        await abrirLista();
        console.log(`[EVIDENCIA] TC-008 · "Todos" muestra ${numeroDe("Todos")} · estudiantes enviados por el servidor: ${FILAS.length}`);
        console.log("[EVIDENCIA]   Nota: el servidor arma la lista por examen, no por aula (ver prueba de servidor).");
        expect(numeroDe("Todos")).toBe(FILAS.length);
    });

    it("TC-009 · Un estudiante repetido en los datos se cuenta una sola vez", async () => {
        await abrirLista([...FILAS, { ...FILAS[0] }]);
        const todos = numeroDe("Todos");
        const ingresaron = numeroDe("Ingresaron");
        const filasDaniela = filasVisibles().filter((li) => li.textContent.includes("202608004")).length;
        console.log(`[EVIDENCIA] TC-009 · Datos con Daniela Arce repetida: "Todos" ${todos} (esperado: 6) · "Ingresaron" ${ingresaron} (esperado: 2) · filas de Daniela ${filasDaniela} (esperado: 1)`);
        expect.soft(todos, "El total no debe contar al repetido dos veces").toBe(6);
        expect.soft(ingresaron, "Ingresaron no debe contar al repetido dos veces").toBe(2);
        expect.soft(filasDaniela, "El estudiante repetido debe aparecer una sola vez").toBe(1);
    });

    it("TC-010 · La hora de ingreso mostrada es la hora registrada en el sistema", async () => {
        await abrirLista();
        const fila = filasVisibles().find((li) => li.textContent.includes("202608004"));
        console.log(`[EVIDENCIA] TC-010 · Hora registrada: 14:02:53 · en pantalla: "${fila.textContent.match(/Ingresó[^A-Z]*/)?.[0].trim()}" (esperado: "Ingresó 14:02")`);
        expect(fila.textContent).toContain("Ingresó 14:02");
    });
});

// ---------- Pruebas de sistema ----------

describe("HU11 Lista oficial · Sistema", () => {
    it("TC-143 · La Lista oficial abre el panel con los estudiantes y su estado", async () => {
        await abrirLista();
        const filas = filasVisibles();
        console.log(`[EVIDENCIA] TC-143 · Panel "${screen.getByRole("dialog").querySelector("h2").textContent}" con ${filas.length} estudiantes (esperado: 6)`);
        expect(screen.getByRole("heading", { name: "Lista oficial del aula" })).toBeInTheDocument();
        expect(filas).toHaveLength(6);
        filas.forEach((li) => expect(li.textContent).toMatch(/Ingresó|Ausente|Inhabilitado/));
    });

    it("TC-145 · Cada fila muestra nombre completo, SIS, C.I. y estado", async () => {
        await abrirLista();
        const fila = filasVisibles().find((li) => li.textContent.includes("202608004"));
        console.log(`[EVIDENCIA] TC-145 · Fila: "${fila.textContent}"`);
        expect(fila.textContent).toContain("Arce Guzmán Daniela");
        expect(fila.textContent).toContain("SIS 202608004 · C.I. 8548104");
        expect(fila.textContent).toContain("Ingresó");
    });

    it("TC-146 · El filtro \"Todos (N)\" muestra la cantidad total de estudiantes", async () => {
        await abrirLista();
        console.log(`[EVIDENCIA] TC-146 · Filtro: "${pestana("Todos").textContent}" (esperado: "Todos (6)")`);
        expect(pestana("Todos").textContent).toBe("Todos (6)");
    });

    it("TC-147 · Se muestra la etiqueta \"En vivo · actualizado hace X s\"", async () => {
        await abrirLista();
        const etiqueta = await screen.findByText(/En vivo · actualizado hace \d+ s/);
        console.log(`[EVIDENCIA] TC-147 · Etiqueta: "${etiqueta.textContent.trim()}"`);
        expect(etiqueta).toBeInTheDocument();
    });

    it("TC-148 · Sin conexión se quita \"En vivo\" y se avisa que los datos están desactualizados", async () => {
        const { rerender } = await abrirLista();
        obtenerListaOficial.mockRejectedValue(new Error("Failed to fetch"));
        rerender(<PanelListaOficial {...PROPS} numVersion={1} />);
        const aviso = await screen.findByRole("alert");
        const sigueEnVivo = Boolean(screen.queryByText(/En vivo/));
        const avisaDesactualizado = /desactualiz|sin conexión|última actualización/i.test(document.body.textContent);
        console.log(`[EVIDENCIA] TC-148 · Aviso mostrado: "${aviso.textContent}"`);
        console.log(`[EVIDENCIA]   ¿Sigue la etiqueta "En vivo"?: ${sigueEnVivo ? "sí" : "no"} (esperado: no)`);
        console.log(`[EVIDENCIA]   ¿Avisa que los datos están desactualizados?: ${avisaDesactualizado ? "sí" : "no"} (esperado: sí)`);
        expect.soft(sigueEnVivo, "Sin conexión no debe mostrarse \"En vivo\"").toBe(false);
        expect.soft(avisaDesactualizado, "Debe avisar que los datos están desactualizados").toBe(true);
    });
});

// ---------- Pruebas de validación ----------

describe("HU11 Lista oficial · Validación", () => {
    it("TC-236 · El filtro \"Ingresaron\" muestra solo estudiantes con \"Ingresó HH:MM\"", async () => {
        await abrirLista();
        await userEvent.click(pestana("Ingresaron"));
        const filas = filasVisibles();
        console.log(`[EVIDENCIA] TC-236 · Filas con "Ingresaron": ${filas.map((li) => li.textContent.match(/Ingresó \d\d:\d\d|Ausente|Inhabilitado/)?.[0]).join(" | ")}`);
        expect(filas).toHaveLength(2);
        filas.forEach((li) => expect(li.textContent).toMatch(/Ingresó \d\d:\d\d/));
    });

    it("TC-237 · El filtro \"Ausentes\" muestra solo habilitados sin ingreso", async () => {
        await abrirLista();
        await userEvent.click(pestana("Ausentes"));
        const filas = filasVisibles();
        console.log(`[EVIDENCIA] TC-237 · Filas con "Ausentes": ${filas.map((li) => li.textContent.match(/Ingresó|Ausente|Inhabilitado/)?.[0]).join(" | ")}`);
        expect(filas).toHaveLength(2);
        filas.forEach((li) => expect(li.textContent).toMatch(/Ausente$/));
    });

    it("TC-238 · El filtro \"Inhabilitados\" muestra solo inhabilitados con su motivo", async () => {
        await abrirLista();
        await userEvent.click(pestana("Inhabilitados"));
        const filas = filasVisibles();
        console.log(`[EVIDENCIA] TC-238 · Filas con "Inhabilitados": ${filas.map((li) => li.textContent.match(/Motivo: [^I]*/)?.[0]).join(" | ")}`);
        expect(filas).toHaveLength(2);
        filas.forEach((li) => {
            expect(li.textContent).toContain("Inhabilitado");
            expect(li.textContent).toContain("Motivo:");
        });
    });

    it("TC-239 · Un inhabilitado sin motivo muestra \"Motivo: sin motivo especificado\"", async () => {
        await abrirLista();
        const fila = filasVisibles().find((li) => li.textContent.includes("202608006"));
        console.log(`[EVIDENCIA] TC-239 · Fila sin motivo: "${fila.textContent}"`);
        expect(fila.textContent).toContain("Motivo: sin motivo especificado");
    });

    it("TC-240 · El filtro \"Todos\" muestra a todos sin importar su estado", async () => {
        await abrirLista();
        await userEvent.click(pestana("Ausentes"));
        await userEvent.click(pestana("Todos"));
        console.log(`[EVIDENCIA] TC-240 · Filas con "Todos": ${filasVisibles().length} (esperado: 6)`);
        expect(filasVisibles()).toHaveLength(6);
    });

    it("TC-241 · Buscar por nombre, apellido, C.I. o SIS muestra solo los que coinciden", async () => {
        await abrirLista();
        const casos = [["Daniela", "202608004"], ["Soria", "202608003"], ["8548105", "202608005"], ["202608002", "202608002"]];
        for (const [termino, sisEsperado] of casos) {
            await userEvent.clear(buscador());
            await userEvent.type(buscador(), termino);
            const filas = filasVisibles();
            console.log(`[EVIDENCIA] TC-241 · Buscar "${termino}": ${filas.length} fila(s) · ${filas.map((li) => li.textContent.match(/SIS \d+/)?.[0]).join(", ")}`);
            expect(filas).toHaveLength(1);
            expect(filas[0].textContent).toContain(sisEsperado);
        }
    });

    it("TC-242 · Buscar con el filtro \"Ausentes\" activo muestra solo ausentes que coinciden", async () => {
        await abrirLista();
        await userEvent.click(pestana("Ausentes"));
        await userEvent.type(buscador(), "Soria");
        const conAusente = filasVisibles();
        await userEvent.clear(buscador());
        await userEvent.type(buscador(), "Arce");
        const conIngresada = filasVisibles();
        console.log(`[EVIDENCIA] TC-242 · "Ausentes" + "Soria": ${conAusente.length} fila(s) (esperado: 1) · "Ausentes" + "Arce" (ingresó): ${conIngresada.length} fila(s) (esperado: 0)`);
        expect(conAusente).toHaveLength(1);
        expect(conIngresada).toHaveLength(0);
    });

    it("TC-243 · Una búsqueda sin coincidencias muestra \"Sin coincidencias en la lista\"", async () => {
        await abrirLista();
        await userEvent.type(buscador(), "Fernández");
        const mensaje = screen.getByText(/Sin coincidencias en la lista/);
        console.log(`[EVIDENCIA] TC-243 · Mensaje: "${mensaje.textContent}"`);
        expect(mensaje).toBeInTheDocument();
    });

    it("TC-244 · Un aula sin estudiantes muestra conteos en cero y aviso de lista vacía", async () => {
        await abrirLista([]);
        await waitFor(() => expect(screen.queryByText(/Cargando lista/)).not.toBeInTheDocument());
        const conteos = ["Todos", "Ausentes", "Ingresaron", "Inhabilitados"].map((t) => numeroDe(t));
        const aviso = screen.getByRole("dialog").querySelector("ul").textContent.trim();
        const avisoListaVacia = /no hay estudiantes (en|asignados)|lista vacía|sin estudiantes/i.test(aviso);
        console.log(`[EVIDENCIA] TC-244 · Conteos: ${conteos.join(" · ")} (esperado: 0 · 0 · 0 · 0)`);
        console.log(`[EVIDENCIA]   Aviso mostrado: "${aviso}" (esperado: un aviso de que el aula no tiene estudiantes)`);
        expect.soft(conteos, "Todos los conteos deben estar en cero").toEqual([0, 0, 0, 0]);
        expect.soft(avisoListaVacia, "Debe avisar que la lista está vacía, no que no hay coincidencias").toBe(true);
    });
});

// ---------- Seguridad ----------

describe("HU11 Lista oficial · Seguridad", () => {
    it("TC-317 · La Lista oficial no ofrece ninguna opción para cambiar estados de ingreso", async () => {
        await abrirLista();
        const botones = within(screen.getByRole("dialog")).getAllByRole("button").map((b) => b.getAttribute("aria-label") || b.textContent.trim());
        const permitidos = /^(Cerrar|Todos|Ausentes|Ingresaron|Expulsados|Inhabilitados)( \(\d+\))?$/;
        const otros = botones.filter((b) => !permitidos.test(b));
        console.log(`[EVIDENCIA] TC-317 · Botones del panel: ${botones.join(" | ")}`);
        console.log(`[EVIDENCIA]   Botones que no son de filtro ni de cierre: ${otros.length ? otros.join(", ") : "ninguno"} (esperado: ninguno)`);
        expect(otros).toEqual([]);
        expect(within(screen.getByRole("dialog")).queryAllByRole("checkbox")).toHaveLength(0);
    });
});

// ---------- Regresión y reconexión ----------

describe("HU11 Lista oficial · Regresión y reconexión", () => {
    it("TC-366 · Se sigue pudiendo buscar por apellido y ver \"Ingresó\" con hora", async () => {
        await abrirLista();
        await userEvent.type(buscador(), "Ramos");
        const filas = filasVisibles();
        console.log(`[EVIDENCIA] TC-366 · Buscar "Ramos": "${filas[0]?.textContent}"`);
        expect(filas).toHaveLength(1);
        expect(filas[0].textContent).toContain("Ingresó 14:29");
    });

    it("TC-367 · Registrar un ingreso sigue actualizando los contadores", async () => {
        const { rerender } = await abrirLista();
        const antes = { ingresaron: numeroDe("Ingresaron"), ausentes: numeroDe("Ausentes") };
        const despues = FILAS.map((f) => (f.sis === 202608001 ? { ...f, estado: "INGRESO", horaIngreso: "15:10:00" } : f));
        obtenerListaOficial.mockResolvedValue(despues);
        rerender(<PanelListaOficial {...PROPS} numVersion={1} />);
        await waitFor(() => expect(numeroDe("Ingresaron")).toBe(3));
        const ahora = { ingresaron: numeroDe("Ingresaron"), ausentes: numeroDe("Ausentes") };
        console.log(`[EVIDENCIA] TC-367 · Antes: Ingresaron ${antes.ingresaron} · Ausentes ${antes.ausentes} → después de un ingreso: Ingresaron ${ahora.ingresaron} · Ausentes ${ahora.ausentes} (esperado: 3 · 1)`);
        expect(ahora).toEqual({ ingresaron: 3, ausentes: 1 });
    });

    it("TC-061 · Al volver la conexión la lista se actualiza y vuelve \"En vivo\"", async () => {
        const { rerender } = await abrirLista();
        obtenerListaOficial.mockRejectedValue(new Error("Failed to fetch"));
        rerender(<PanelListaOficial {...PROPS} numVersion={1} />);
        await screen.findByRole("alert");
        const despues = FILAS.map((f) => (f.sis === 202608003 ? { ...f, estado: "INGRESO", horaIngreso: "15:20:00" } : f));
        obtenerListaOficial.mockResolvedValue(despues);
        rerender(<PanelListaOficial {...PROPS} numVersion={2} />);
        await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
        const enVivo = screen.getByText(/En vivo · actualizado hace \d+ s/).textContent.trim();
        const filaJoaquin = filasVisibles().find((li) => li.textContent.includes("202608003")).textContent;
        console.log(`[EVIDENCIA] TC-061 · Tras volver la conexión: aviso de error quitado · etiqueta "${enVivo}" · Joaquín Soria: "${filaJoaquin.match(/Ingresó \d\d:\d\d|Ausente/)?.[0]}" (esperado: "Ingresó 15:20")`);
        expect(filaJoaquin).toContain("Ingresó 15:20");
    });
});