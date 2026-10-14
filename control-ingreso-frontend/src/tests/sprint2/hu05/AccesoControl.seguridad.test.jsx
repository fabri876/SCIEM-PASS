import { render, screen } from "@testing-library/react";
import App from "../../../App";

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

describe("HU05 · Acceso al panel de control (pruebas de seguridad)", () => {
    it("TC-250 · /control sin sesión va al login y como estudiante a su panel", () => {
        const casos = [
            ["Sin sesión", null, "/login"],
            ["Estudiante", "ESTUDIANTE", "/estudiante"],
        ];
        for (const [nombre, rol, destino] of casos) {
            for (const ruta of ["/control", "/control/conectado"]) {
                iniciarSesionComo(rol);
                const r = abrir(ruta);
                console.log(`[EVIDENCIA TC-250] ${nombre} abre ${ruta} → termina en ${r.ruta} · ${r.pantalla}`);
                expect.soft(r.pantalla, `${nombre} no debe ver el panel del operador en ${ruta}`).not.toBe("Pantalla: Panel Operador");
                expect.soft(r.ruta, `${nombre} en ${ruta} debe ir a ${destino}`).toBe(destino);
            }
        }

        // Control: el operador sí entra a su panel
        iniciarSesionComo("OPERADOR");
        const operador = abrir("/control");
        console.log(`[EVIDENCIA TC-250] Operador abre /control → termina en ${operador.ruta} · ${operador.pantalla}`);
        expect(operador.pantalla).toBe("Pantalla: Panel Operador");
    });
});