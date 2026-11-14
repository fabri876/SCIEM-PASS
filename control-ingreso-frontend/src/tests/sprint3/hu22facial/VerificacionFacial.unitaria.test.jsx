import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import useHumanFace from "../../../hooks/useHumanFace";
import ModalVerificacionFacialEstudiante from "../../../pages/estudiante/components/ModalVerificacionFacialEstudiante";
import { verificarRostroEstudiante } from "../../../services/facialService";

// HU22 · Registro y Verificación Facial · TC-047, TC-048 y TC-049 (pruebas unitarias).
// No se usa la cámara real, no se usan fotos y no se llama al backend ni a Supabase:
// el modelo facial, la cámara y el servicio se simulan.

// ---------- Simulaciones comunes ----------

// Rostro detectado por el modelo: uno solo, centrado y a buena distancia
// en un cuadro de 640 × 480.
const ROSTRO_SIMULADO = {
    box: [192, 112, 256, 256],
    embedding: [0.11, 0.42, 0.37, 0.25],
    real: 0.95,
};

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

// Píxeles de la región del rostro (128 × 128, RGBA) que "ve" el filtro de calidad.
const LADO = 128;
function crearPixeles(fnValor) {
    const data = new Uint8ClampedArray(LADO * LADO * 4);
    for (let fila = 0; fila < LADO; fila += 1) {
        for (let col = 0; col < LADO; col += 1) {
            const valor = fnValor(fila, col);
            const i = (fila * LADO + col) * 4;
            data[i] = valor;
            data[i + 1] = valor;
            data[i + 2] = valor;
            data[i + 3] = 255;
        }
    }
    return data;
}
// Imagen oscura: todo el rostro casi negro.
const PIXELES_OSCUROS = crearPixeles(() => 20);
// Imagen borrosa: buena luz y contraste, pero sin bordes definidos (dos zonas lisas).
const PIXELES_BORROSOS = crearPixeles((fila, col) => (col < LADO / 2 ? 100 : 160));
// Imagen apta: buena luz, contraste y bordes marcados.
const PIXELES_APTOS = crearPixeles((fila, col) => ((fila + col) % 2 === 0 ? 80 : 180));

let pixelesActuales = PIXELES_APTOS;

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = () => ({
        drawImage: () => { },
        getImageData: () => ({ data: pixelesActuales }),
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

// Cuadro de cámara simulado para llamar directo a la detección.
const CUADRO = { videoWidth: 640, videoHeight: 480 };

async function cargarHook() {
    const { result } = renderHook(() => useHumanFace());
    await waitFor(() => expect(result.current.listo).toBe(true));
    return result;
}

// ---------- TC-047 ----------

describe("HU22 Facial · TC-047 · Evaluación de calidad en el enrolamiento", () => {
    it("TC-047 · Una imagen oscura queda marcada como no apta", async () => {
        const result = await cargarHook();
        pixelesActuales = PIXELES_OSCUROS;
        const lectura = await result.current.detectarRostro(CUADRO, { perfil: "enrolamiento" });

        console.log(`[EVIDENCIA] TC-047 · Imagen oscura (brillo ${lectura.calidad.brillo.toFixed(0)}, mínimo 70)`);
        console.log(`[EVIDENCIA]   ¿Apta para registrar?: ${lectura.valido ? "sí" : "no"} (esperado: no)`);
        console.log(`[EVIDENCIA]   Mensaje: ${lectura.motivo}`);

        expect.soft(lectura.valido, "La imagen oscura no debe ser apta").toBe(false);
        expect.soft(lectura.motivo, "Debe indicar que el rostro está oscuro").toMatch(/oscuro/i);
    });

    it("TC-047 · Una imagen borrosa queda marcada como no apta", async () => {
        const result = await cargarHook();
        pixelesActuales = PIXELES_BORROSOS;
        const lectura = await result.current.detectarRostro(CUADRO, { perfil: "enrolamiento" });

        console.log(`[EVIDENCIA] TC-047 · Imagen borrosa (nitidez ${lectura.calidad.nitidez.toFixed(2)}, mínimo 6)`);
        console.log(`[EVIDENCIA]   ¿Apta para registrar?: ${lectura.valido ? "sí" : "no"} (esperado: no)`);
        console.log(`[EVIDENCIA]   Mensaje: ${lectura.motivo}`);

        expect.soft(lectura.valido, "La imagen borrosa no debe ser apta").toBe(false);
        expect.soft(lectura.motivo, "Debe indicar que la imagen está borrosa").toMatch(/borrosa/i);
    });

    it("TC-047 · Control: una imagen con buena luz y nitidez sí es apta", async () => {
        const result = await cargarHook();
        pixelesActuales = PIXELES_APTOS;
        const lectura = await result.current.detectarRostro(CUADRO, { perfil: "enrolamiento" });

        console.log(`[EVIDENCIA] TC-047 · Imagen con buena luz y nitidez`);
        console.log(`[EVIDENCIA]   ¿Apta para registrar?: ${lectura.valido ? "sí" : "no"} (esperado: sí)`);

        expect(lectura.valido, "La imagen con buena calidad debe ser apta").toBe(true);
    });
});

// ---------- TC-048 ----------

describe("HU22 Facial · TC-048 · Límite de intentos para generar el QR", () => {
    it("TC-048 · Tras 3 rostros que no coinciden se bloquea la verificación", async () => {
        pixelesActuales = PIXELES_APTOS;
        verificarRostroEstudiante.mockReset();
        verificarRostroEstudiante.mockResolvedValue({
            autorizado: false,
            mensaje: "El rostro no coincide suficientemente con la foto registrada en tu primer ingreso.",
        });

        const user = userEvent.setup({ delay: null });
        render(
            <ModalVerificacionFacialEstudiante
                examen={{ id: 1, materia: "Introducción a la Programación" }}
                usuario={{ nombre: "Lucía", apellido: "Torrez", codigoSis: "202100001" }}
                onVerificado={vi.fn()}
                onCancelar={vi.fn()}
            />
        );

        for (let intento = 1; intento <= 3; intento += 1) {
            const boton = await screen.findByRole("button", { name: /Verificar rostro/i });
            await waitFor(() => expect(boton).toBeEnabled());
            await user.click(boton);
            if (intento < 3) {
                await screen.findByText(new RegExp(`Intento ${intento}/3`));
                console.log(`[EVIDENCIA] TC-048 · Intento ${intento}: rechazado, sigue habilitado "Verificar rostro"`);
            }
        }

        await screen.findByText(/Has agotado tus 3 intentos/i);
        const botonVerificar = screen.queryByRole("button", { name: /Verificar rostro/i });
        const botonVolver = screen.queryByRole("button", { name: /Volver a mis exámenes/i });

        console.log(`[EVIDENCIA] TC-048 · Intento 3: ${screen.getByText(/Has agotado tus 3 intentos/i).textContent}`);
        console.log(`[EVIDENCIA]   Comparaciones enviadas al servidor: ${verificarRostroEstudiante.mock.calls.length} (esperado: 3)`);
        console.log(`[EVIDENCIA]   ¿Sigue visible "Verificar rostro"?: ${botonVerificar ? "sí" : "no"} (esperado: no)`);
        console.log(`[EVIDENCIA]   ¿Aparece "Volver a mis exámenes"?: ${botonVolver ? "sí" : "no"} (esperado: sí)`);

        expect.soft(verificarRostroEstudiante, "Debe haber exactamente 3 comparaciones").toHaveBeenCalledTimes(3);
        expect.soft(botonVerificar, "No debe permitirse un cuarto intento").toBeNull();
        expect.soft(botonVolver, "Debe quedar solo la opción de volver").not.toBeNull();
    }, 30000);
});

// ---------- TC-049 ----------

// Mismo umbral que usa el control de ingreso (UMBRAL_SIMILITUD en ControlFacialCamera.jsx).
const UMBRAL = 0.82;

// Vector de referencia y un vector en vivo con el parecido (coseno) indicado.
const REFERENCIA = [1, 0];
const enVivo = (coseno) => [coseno, Math.sqrt(1 - coseno * coseno)];

describe("HU22 Facial · TC-049 · Comparación facial en el control de ingreso", () => {
    const casos = [
        { nombre: "rostro sin parecido", vector: enVivo(0.0), aceptado: false },
        { nombre: "rostro con poco parecido", vector: enVivo(0.5), aceptado: false },
        { nombre: "rostro justo debajo del umbral", vector: enVivo(0.6), aceptado: false },
        { nombre: "rostro que coincide", vector: enVivo(0.9), aceptado: true },
        { nombre: "mismo rostro", vector: [...REFERENCIA], aceptado: true },
    ];

    it.each(casos)("TC-049 · $nombre", async ({ nombre, vector, aceptado }) => {
        const result = await cargarHook();
        const coincidencia = result.current.compararSimilitud(vector, REFERENCIA);
        const pasa = coincidencia >= UMBRAL;

        console.log(`[EVIDENCIA] TC-049 · ${nombre}: coincidencia ${(coincidencia * 100).toFixed(0)}% (umbral 82%)`);
        console.log(`[EVIDENCIA]   ¿Se acepta?: ${pasa ? "sí" : "no"} (esperado: ${aceptado ? "sí" : "no"})`);

        expect(pasa).toBe(aceptado);
    });

    it("TC-049 · Vectores de distinto tamaño o vacíos se rechazan", async () => {
        const result = await cargarHook();
        const distintoTamano = result.current.compararSimilitud([1, 0, 0], REFERENCIA);
        const vacio = result.current.compararSimilitud([], REFERENCIA);

        console.log(`[EVIDENCIA] TC-049 · Distinto tamaño: ${distintoTamano} · Vacío: ${vacio} (esperado: 0 y 0)`);

        expect.soft(distintoTamano).toBe(0);
        expect.soft(vacio).toBe(0);
    });
});