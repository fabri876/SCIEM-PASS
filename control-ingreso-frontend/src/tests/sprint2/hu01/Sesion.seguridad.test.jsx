import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../../../App";
import LoginForm from "../../../components/login/LoginForm";
import { cargarUsuariosMasivo } from "../../../services/usuarioService";

// Las pantallas se reemplazan por un texto simple: aquí solo importa a qué pantalla manda el sistema.
vi.mock("../../../pages/RegistroPage", () => ({ default: () => <p>Pantalla: Registro</p> }));
vi.mock("../../../pages/LoginPage", () => ({ default: () => <p>Pantalla: Login</p> }));
vi.mock("../../../pages/RegistroExamenPage", () => ({ default: () => <p>Pantalla: Registro examen</p> }));
vi.mock("../../../pages/HomePage", () => ({ default: () => <p>Pantalla: Inicio</p> }));
vi.mock("../../../pages/PaginaEnConstruccion", () => ({ default: () => <p>Pantalla: En construcción</p> }));
vi.mock("../../../pages/examenesHome/Examenes", () => ({ default: () => <p>Pantalla: Exámenes</p> }));
vi.mock("../../../pages/examenesHome/ExamenesPasados", () => ({ default: () => <p>Pantalla: Exámenes pasados</p> }));
vi.mock("../../../pages/admin/AdminDashboard", () => ({ default: () => <p>Pantalla: Panel Administrador</p> }));
vi.mock("../../../pages/docente/HomeDocente", () => ({ default: () => <p>Pantalla: Panel Docente</p> }));
vi.mock("../../../pages/docente/GestionHabilitaciones", () => ({ default: () => <p>Pantalla: Habilitaciones</p> }));
vi.mock("../../../pages/control/ingreso/ControlIngresoDocente", () => ({ default: () => <p>Pantalla: Control de ingreso</p> }));
vi.mock("../../../pages/control/OperadorProvider", () => ({ default: ({ children }) => children }));
vi.mock("../../../pages/estudiante/HomeEstudiante", () => ({ default: () => <p>Pantalla: Panel Estudiante</p> }));
vi.mock("../../../pages/control/HomeControl", () => ({ default: () => <p>Pantalla: Panel Operador</p> }));
vi.mock("../../../pages/control/conectado/ConectadoOperador", () => ({ default: () => <p>Pantalla: Conectado</p> }));
vi.mock("../../../pages/control/offline/OffLineOperador", () => ({ default: () => <p>Pantalla: Offline</p> }));
vi.mock("../../../pages/control/forzar/ForzarSincronizacionOperador", () => ({ default: () => <p>Pantalla: Forzar</p> }));

const AVISO = "Sesión expirada. Por favor, inicia sesión nuevamente.";

/** Deja una sesión iniciada con el rol indicado (null = sin sesión). */
function iniciarSesionComo(rol) {
    localStorage.clear();
    if (!rol) return;
    localStorage.setItem("token", "token-de-prueba");
    localStorage.setItem("usuario", JSON.stringify({ rol, idUsuario: 99, nombre: "QA" }));
    localStorage.setItem("ultimaActividad", Date.now().toString());
}

/** Abre una ruta del sistema y devuelve a dónde terminó y qué pantalla se ve. */
function abrir(ruta) {
    window.history.pushState({}, "", ruta);
    const { unmount } = render(<App />);
    const resultado = { ruta: window.location.pathname, pantalla: screen.getByText(/^Pantalla:/).textContent };
    unmount();
    return resultado;
}

beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
});

describe("HU01 · Sesión y acceso (pruebas de seguridad)", () => {
    it("TC-244 · Al abrir /admin sin sesión va al login y operador o estudiante a su panel", () => {
        const casos = [
            ["Sin sesión", null, "/login"],
            ["Operador", "OPERADOR", "/control"],
            ["Estudiante", "ESTUDIANTE", "/estudiante"],
        ];
        for (const [nombre, rol, destino] of casos) {
            for (const ruta of ["/admin", "/home/docente"]) {
                iniciarSesionComo(rol);
                const r = abrir(ruta);
                console.log(`[EVIDENCIA TC-244] ${nombre} abre ${ruta} → termina en ${r.ruta} · ${r.pantalla}`);
                expect.soft(["Pantalla: Panel Administrador", "Pantalla: Panel Docente"], `${nombre} no debe ver la carga en ${ruta}`)
                    .not.toContain(r.pantalla);
                expect.soft(r.ruta, `${nombre} en ${ruta} debe ir a ${destino}`).toBe(destino);
            }
        }
    });

    it("TC-245 · Con sesión vencida al confirmar la carga sale el aviso de sesión", async () => {
        iniciarSesionComo("ADMINISTRADOR");
        globalThis.fetch = vi.fn(async () => ({ status: 401, ok: false, json: async () => ({}) }));
        const archivo = new File(["contenido"], "lista.xlsx");

        await expect(cargarUsuariosMasivo(archivo, "ESTUDIANTE", 7)).rejects.toThrow("Sesión expirada.");
        const sesionCerrada = localStorage.getItem("token") === null;
        const avisoGuardado = sessionStorage.getItem("mensajeSesion");

        render(<MemoryRouter><LoginForm /></MemoryRouter>);
        const avisoEnLogin = screen.queryByText(AVISO) !== null;
        console.log(`[EVIDENCIA TC-245] Confirmar carga con sesión vencida → servidor 401 · Sesión cerrada: ${sesionCerrada} · `
            + `Aviso guardado: "${avisoGuardado}" · Aviso visible en el login: ${avisoEnLogin}`);

        expect(globalThis.fetch.mock.calls[0][0]).toContain("/api/usuarios/carga-masiva");
        expect(sesionCerrada, "La sesión debe cerrarse").toBe(true);
        expect(avisoGuardado).toBe(AVISO);
        expect(avisoEnLogin, `En el login debe verse: ${AVISO}`).toBe(true);
    });
});