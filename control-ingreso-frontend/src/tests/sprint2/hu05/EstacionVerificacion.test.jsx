import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EstacionVerificacion from "../../../pages/control/ingreso/componentes/EstacionVerificacion";
import TarjetaResultado from "../../../pages/control/ingreso/componentes/TarjetaResultado";

// La cámara se simula: en las pruebas no hay una cámara real.
const { lector, Html5Qrcode } = vi.hoisted(() => ({ lector: {}, Html5Qrcode: vi.fn() }));
vi.mock("html5-qrcode", () => ({ Html5Qrcode }));

// El parlante se simula: se anota el tono (Hz) y la duración (s) de cada sonido.
const sonidos = [];
class ParlanteFalso {
    constructor() { this.currentTime = 0; this.destination = {}; }
    createOscillator() {
        const o = {
            type: "", frequency: { value: 0 }, connect() { }, start() { },
            stop(t) { sonidos.push({ tono: o.frequency.value, duracion: t }); }
        };
        return o;
    }
    createGain() {
        return { gain: { setValueAtTime() { }, exponentialRampToValueAtTime() { } }, connect() { } };
    }
}
window.AudioContext = ParlanteFalso;

const ESTUDIANTE = { nombres: "Ana", apellidos: "Prueba", ci: "8765432", sis: "202301245", carrera: "Sistemas", aulaAsignada: "691A" };
const resultado = (tipo, clave) => ({ resultado: tipo, clave, estudiante: ESTUDIANTE, horaIngreso: "08:01", fechaIngreso: "14/10/2026", metodo: "MANUAL", motivos: ["Sin habilitación"] });

const campoDocumento = () => screen.getByLabelText("C.I. o Código SIS del estudiante");
const botonVerificar = () => screen.getByRole("button", { name: "Verificar ingreso" });

function abrirEstacion() {
    const user = userEvent.setup();
    const onValidar = vi.fn(async () => { });
    render(<EstacionVerificacion onValidar={onValidar} boolValidando={false} idExamen={1} />);
    return { user, onValidar };
}

beforeEach(() => {
    vi.clearAllMocks();
    sonidos.length = 0;
    lector.isScanning = false;
    lector.start = vi.fn(async () => { lector.isScanning = true; });
    lector.stop = vi.fn(async () => { lector.isScanning = false; });
    lector.clear = vi.fn();
    Html5Qrcode.mockImplementation(function () { return lector; });
});

describe("HU05 · Control de ingreso (pruebas unitarias)", () => {
    it("TC-010 · Un ingreso rechazado suena distinto al ingreso permitido", () => {
        const { rerender } = render(<TarjetaResultado objResultado={resultado("PERMITIDO", 1)} onCerrar={vi.fn()} />);
        rerender(<TarjetaResultado objResultado={resultado("NO_HABILITADO", 2)} onCerrar={vi.fn()} />);
        rerender(<TarjetaResultado objResultado={resultado("YA_REGISTRADO", 3)} onCerrar={vi.fn()} />);

        const [permitido, inhabilitado, duplicado] = sonidos;
        console.log(`[EVIDENCIA TC-010] Permitido: ${permitido?.tono} Hz, ${permitido?.duracion} s · `
            + `Inhabilitado: ${inhabilitado?.tono} Hz, ${inhabilitado?.duracion} s · Ya registrado: ${duplicado?.tono} Hz, ${duplicado?.duracion} s`);

        expect(sonidos).toHaveLength(3);
        expect(inhabilitado.tono).not.toBe(permitido.tono);
        expect(duplicado.tono).not.toBe(permitido.tono);
        expect(permitido).toEqual({ tono: 880, duracion: 0.2 });   // agudo y corto
        expect(inhabilitado).toEqual({ tono: 220, duracion: 0.4 }); // grave y más largo
    });

    it("TC-011 · En Ingreso manual Verificar ingreso se habilita solo con 6 a 9 números", async () => {
        const { user } = abrirEstacion();
        await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
        const estados = {};

        await user.type(campoDocumento(), "12345");
        estados["5 números"] = botonVerificar().disabled ? "bloqueado" : "habilitado";
        await user.type(campoDocumento(), "6");
        estados["6 números"] = botonVerificar().disabled ? "bloqueado" : "habilitado";
        await user.type(campoDocumento(), "789");
        estados["9 números"] = botonVerificar().disabled ? "bloqueado" : "habilitado";
        await user.type(campoDocumento(), "0");
        const valorFinal = campoDocumento().value;
        console.log(`[EVIDENCIA TC-011] Botón Verificar ingreso → ${JSON.stringify(estados)} · `
            + `Al intentar un décimo número el campo queda en "${valorFinal}" (${valorFinal.length} dígitos)`);

        expect(estados).toEqual({ "5 números": "bloqueado", "6 números": "habilitado", "9 números": "habilitado" });
        expect(valorFinal).toBe("123456789");
    });

    it("TC-012 · Un documento pegado con espacios se busca sin los espacios", async () => {
        const { user, onValidar } = abrirEstacion();
        await user.click(screen.getByRole("button", { name: "Ingreso manual" }));

        // C.I. de 7 dígitos con espacios
        await user.click(campoDocumento());
        await user.paste("87 654 32");
        const ciPegado = campoDocumento().value;
        await user.click(botonVerificar());

        // Código SIS de 9 dígitos con espacios (el texto pegado tiene más de 9 caracteres)
        await user.click(campoDocumento());
        await user.paste("2023 012 45");
        const sisPegado = campoDocumento().value;
        if (!botonVerificar().disabled) await user.click(botonVerificar());

        console.log(`[EVIDENCIA TC-012] Pegado "87 654 32" → campo "${ciPegado}" · Pegado "2023 012 45" → campo "${sisPegado}" · `
            + `Búsquedas enviadas: ${JSON.stringify(onValidar.mock.calls)}`);

        expect.soft(ciPegado, "El C.I. pegado debe quedar sin espacios").toBe("8765432");
        expect.soft(sisPegado, "El SIS pegado debe quedar completo y sin espacios").toBe("202301245");
        expect.soft(onValidar.mock.calls, "Deben buscarse los dos documentos sin espacios")
            .toEqual([["8765432", "MANUAL"], ["202301245", "MANUAL"]]);
    });

    it("TC-013 · En Escanear QR la cámara sigue apagada hasta presionar Leer QR", async () => {
        const { user } = abrirEstacion();
        const encendidaAlAbrir = lector.start.mock.calls.length > 0;

        await user.click(screen.getByRole("button", { name: "Leer QR" }));
        await waitFor(() => expect(lector.start).toHaveBeenCalledTimes(1));
        console.log(`[EVIDENCIA TC-013] Al abrir la pantalla, cámara encendida: ${encendidaAlAbrir} · `
            + `Tras presionar Leer QR: ${lector.start.mock.calls.length} encendido(s) con ${JSON.stringify(lector.start.mock.calls[0][0])} · `
            + `Botón visible: "${screen.getByRole("button", { name: /Detener lectura/ }).textContent}"`);

        expect(encendidaAlAbrir).toBe(false);
        expect(lector.start.mock.calls[0][0]).toEqual({ facingMode: "environment" });
    });

    it("TC-014 · La cámara se apaga al cambiar a Ingreso manual", async () => {
        const { user } = abrirEstacion();
        await user.click(screen.getByRole("button", { name: "Leer QR" }));
        await waitFor(() => expect(lector.isScanning).toBe(true));

        await user.click(screen.getByRole("button", { name: "Ingreso manual" }));
        await waitFor(() => expect(lector.stop).toHaveBeenCalled());
        console.log(`[EVIDENCIA TC-014] Cámara encendida → se cambia a Ingreso manual · Orden de apagado enviada: `
            + `${lector.stop.mock.calls.length} vez · Cámara sigue encendida: ${lector.isScanning}`);

        expect(lector.isScanning).toBe(false);
        expect(campoDocumento()).toBeInTheDocument();
    });

    it("TC-015 · Al cerrar el resultado con la X vuelve Esperando verificación", async () => {
        const user = userEvent.setup();
        // Igual que la pantalla de control: al cerrar, el resultado se borra.
        function Pantalla() {
            const [objResultado, setObjResultado] = useState(resultado("PERMITIDO", 1));
            return <TarjetaResultado objResultado={objResultado} onCerrar={() => setObjResultado(null)} />;
        }
        render(<Pantalla />);
        const antes = screen.queryByText("INGRESO PERMITIDO") !== null;

        await user.click(screen.getByRole("button", { name: "Cerrar tarjeta" }));
        const esperando = screen.queryByText("ESPERANDO VERIFICACIÓN") !== null;
        const resultadoSigue = screen.queryByText("INGRESO PERMITIDO") !== null;
        console.log(`[EVIDENCIA TC-015] Antes de cerrar se ve "INGRESO PERMITIDO": ${antes} · `
            + `Tras la X se ve "ESPERANDO VERIFICACIÓN": ${esperando} · El resultado sigue visible: ${resultadoSigue}`);

        expect(antes).toBe(true);
        expect(esperando).toBe(true);
        expect(resultadoSigue).toBe(false);
    });
});