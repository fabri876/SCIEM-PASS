import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalVerificacionFacialEstudiante from "../../../pages/estudiante/components/ModalVerificacionFacialEstudiante";
import { verificarRostroEstudiante } from "../../../services/facialService";

// HU22 · Registro y Verificación Facial · TC-304 (prueba de validación).
// Comprueba si el bloqueo tras 3 intentos se mantiene al recargar la pantalla del QR.
// No se usa la cámara real, no se usan fotos y no se llama al backend ni a Supabase.

const ROSTRO_SIMULADO = { box: [192, 112, 256, 256], embedding: [0.11, 0.42, 0.37, 0.25], real: 0.95 };

vi.mock("@vladmandic/human", () => ({
    default: class HumanSimulado {
        async load() { }
        async warmup() { }
        async detect() {
            return { face: [ROSTRO_SIMULADO] };
        }
    },
}));

vi.mock("../../../hooks/nativeCameraPreview", () => ({
    solicitarPermisosCamara: vi.fn().mockResolvedValue(false),
    detenerPreviewNativo: vi.fn(),
}));

vi.mock("../../../services/facialService", () => ({
    verificarRostroEstudiante: vi.fn(),
}));

// Imagen apta (buena luz, contraste y bordes) para que el rostro se analice.
const LADO = 128;
const PIXELES_APTOS = new Uint8ClampedArray(LADO * LADO * 4);
for (let p = 0; p < LADO * LADO; p += 1) {
    const valor = (Math.floor(p / LADO) + (p % LADO)) % 2 === 0 ? 80 : 180;
    PIXELES_APTOS.set([valor, valor, valor, 255], p * 4);
}

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = () => ({
        drawImage: () => { },
        getImageData: () => ({ data: PIXELES_APTOS }),
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 640 });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 480 });
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = () => { };
    if (typeof globalThis.MediaStream === "undefined") {
        globalThis.MediaStream = class MediaStream { };
    }
    const pista = { enabled: true, stop: () => { } };
    Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [pista] }) },
    });
});

const PROPS = {
    examen: { id: 857, materia: "Introducción a la Programación" },
    usuario: { idUsuario: 1, nombre: "Lucía", apellido: "Torrez", codigoSis: "202100001" },
    onVerificado: () => { },
    onCancelar: () => { },
};

async function agotarIntentos(user) {
    for (let intento = 1; intento <= 3; intento += 1) {
        const boton = await screen.findByRole("button", { name: /Verificar rostro/i });
        await waitFor(() => expect(boton).toBeEnabled());
        await user.click(boton);
        if (intento < 3) await screen.findByText(new RegExp(`Intento ${intento}/3`));
    }
    await screen.findByText(/Has agotado tus 3 intentos/i);
}

describe("HU22 Facial · TC-304 · Bloqueo del QR tras 3 intentos", () => {
    it("TC-304 · Tras 3 fallos no se permite un cuarto intento, aunque se recargue la pantalla", async () => {
        verificarRostroEstudiante.mockReset();
        verificarRostroEstudiante.mockResolvedValue({
            autorizado: false,
            mensaje: "El rostro no coincide suficientemente con la foto registrada en tu primer ingreso.",
        });
        const user = userEvent.setup({ delay: null });

        // Primera visita: se agotan los 3 intentos.
        const primera = render(<ModalVerificacionFacialEstudiante {...PROPS} />);
        await agotarIntentos(user);
        const bloqueadaAntes = !screen.queryByRole("button", { name: /Verificar rostro/i });
        console.log(`[EVIDENCIA] TC-304 · Tras 3 fallos: ${screen.getByText(/Has agotado tus 3 intentos/i).textContent}`);
        console.log(`[EVIDENCIA]   ¿Se permite un cuarto intento?: ${bloqueadaAntes ? "no" : "sí"} (esperado: no)`);

        // "Recarga": se desmonta y se vuelve a abrir la verificación del mismo examen.
        primera.unmount();
        render(<ModalVerificacionFacialEstudiante {...PROPS} />);
        const botonTrasRecargar = await screen.findByRole("button", { name: /Verificar rostro/i }).catch(() => null);
        const bloqueoTrasRecargar = Boolean(screen.queryByText(/Has agotado tus 3 intentos/i));
        console.log("[EVIDENCIA] TC-304 · Después de recargar la pantalla del QR:");
        console.log(`[EVIDENCIA]   ¿Sigue el aviso de intentos agotados?: ${bloqueoTrasRecargar ? "sí" : "no"} (esperado: sí)`);
        console.log(`[EVIDENCIA]   ¿Se puede volver a presionar "Verificar rostro"?: ${botonTrasRecargar ? "sí" : "no"} (esperado: no)`);
        console.log(`[EVIDENCIA]   Comparaciones enviadas al servidor en total: ${verificarRostroEstudiante.mock.calls.length}`);

        expect.soft(bloqueadaAntes, "Tras 3 fallos no debe haber un cuarto intento").toBe(true);
        expect.soft(botonTrasRecargar, "Tras recargar no debe permitirse un nuevo intento").toBeNull();
        expect.soft(bloqueoTrasRecargar, "Tras recargar debe seguir el bloqueo").toBe(true);
    }, 30000);
});