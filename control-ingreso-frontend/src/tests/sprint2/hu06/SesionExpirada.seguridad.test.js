import { autorizarIngresoExcepcional } from "../../../services/ingresoExcepcionalService";
import { registrarIncidencia } from "../../../services/incidenciaService";
import { cerrarSesion } from "../../../services/authService";

// Se simula la sesión: el token ya venció y el servidor responde 401.
vi.mock("../../../services/apiConfig", () => ({ strApiBaseUrl: "http://localhost:8080" }));
vi.mock("../../../services/authService", () => ({
    obtenerToken: vi.fn(() => "token-vencido"),
    cerrarSesion: vi.fn(),
}));

const AVISO = "Tu sesión expiró, vuelve a iniciar sesión";

beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    globalThis.fetch = vi.fn(async () => ({ status: 401, ok: false, json: async () => ({}) }));
});

describe("HU06 · Sesión expirada (pruebas de seguridad)", () => {
    it("TC-260 · Autorizar un excepcional con la sesión expirada muestra el aviso y cierra la sesión", async () => {
        await expect(
            autorizarIngresoExcepcional({
                idAmbiente: 1,
                codSis: 202301004,
                motivo: "LLEGADA_TARDIA",
                observacion: "Presentó su CI físico en la puerta.",
            })
        ).rejects.toThrow(AVISO);

        expect(cerrarSesion).toHaveBeenCalled();
        expect(sessionStorage.getItem("mensajeSesion")).toBe(AVISO);
    });

    it("TC-260 · Registrar una incidencia con la sesión expirada muestra el aviso y cierra la sesión", async () => {
        await expect(
            registrarIncidencia({
                idAmbiente: 1,
                tipo: "OTRO",
                severidad: "BAJA",
                descripcion: "Incidencia de prueba en el aula.",
            })
        ).rejects.toThrow(AVISO);

        expect(cerrarSesion).toHaveBeenCalled();
        expect(sessionStorage.getItem("mensajeSesion")).toBe(AVISO);
    });
});