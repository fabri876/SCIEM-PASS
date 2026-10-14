import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalIngresoExcepcional from "../../../components/incidencias/ModalIngresoExcepcional";
import {
  consultarEstudianteExcepcional,
  autorizarIngresoExcepcional,
} from "../../../services/ingresoExcepcionalService";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
vi.mock("../../../services/authService", () => ({
  obtenerUsuarioActual: vi.fn(() => ({ nombre: "Ana", apellido: "Pérez" })),
}));
vi.mock("../../../services/ingresoExcepcionalService", () => ({
  consultarEstudianteExcepcional: vi.fn(),
  autorizarIngresoExcepcional: vi.fn(),
}));
vi.mock("../../../services/incidenciaService", () => ({
  notificarCambioIncidencias: vi.fn(),
}));

const AULAS = [
  {
    idAmbiente: 1,
    aula: "Aula 601",
    asignatura: "Cálculo I",
    fechaExamen: "2026-10-14",
    ingresoCerrado: false,
    aforo: { ocupados: 10, capacidad: 60, disponibles: 50 },
  },
];

const ESTUDIANTE = {
  estado: "NO_EN_LISTA",
  nombreCompleto: "QA Masiva Prueba Cuatro",
  ci: "9900104",
  codSis: "202301004",
  mensaje: "El estudiante no figura en la lista oficial.",
  puedeAutorizarExcepcional: true,
  puedeRegistrarIncidencia: true,
};

// Simula la pantalla que abre el modal: al cerrar, el modal desaparece.
function PantallaDePrueba({ onCerrar }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <ModalIngresoExcepcional
      boolAbierto={abierto}
      aulasDisponibles={AULAS}
      onCerrar={() => {
        onCerrar();
        setAbierto(false);
      }}
    />
  );
}

// Busca al estudiante y pasa al formulario de ingreso excepcional (paso 2).
async function abrirFormulario(onCerrar = vi.fn()) {
  const user = userEvent.setup();
  render(<PantallaDePrueba onCerrar={onCerrar} />);
  await user.type(screen.getByPlaceholderText("CI o Código SIS"), "9900104");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  await user.click(await screen.findByRole("button", { name: /autorizar ingreso excepcional/i }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  consultarEstudianteExcepcional.mockResolvedValue(ESTUDIANTE);
});

describe("HU06 · Ingreso excepcional (pruebas unitarias)", () => {
  it("TC-016 · La observación acepta máximo 500 caracteres y muestra 500/500", async () => {
    const user = await abrirFormulario();
    const observacion = screen.getByPlaceholderText(/explica por qué se autoriza/i);

    expect(observacion).toHaveAttribute("maxlength", "500");

    await user.click(observacion);
    await user.paste("a".repeat(600));

    expect(observacion.value.length).toBe(500);
    expect(screen.getByText("500/500")).toBeInTheDocument();
  });

  it("TC-017 · El campo de quien autoriza muestra su nombre y no se puede editar", async () => {
    const user = await abrirFormulario();
    const campoAutoriza = screen.getByDisplayValue("Ana Pérez");

    expect(screen.getByText("Docente que autoriza")).toBeInTheDocument();
    expect(campoAutoriza).toBeDisabled();
    expect(campoAutoriza).toHaveAttribute("readonly");

    await user.type(campoAutoriza, "Otro nombre");
    expect(campoAutoriza).toHaveValue("Ana Pérez");
  });

  it("TC-018 · Cancelar cierra la ventana de ingreso excepcional sin registrar", async () => {
    const onCerrar = vi.fn();
    const user = await abrirFormulario(onCerrar);

    await user.click(screen.getByRole("button", { name: /llegada tardía/i }));
    await user.type(
      screen.getByPlaceholderText(/explica por qué se autoriza/i),
      "El estudiante llegó tarde por un bloqueo de vías."
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(autorizarIngresoExcepcional).not.toHaveBeenCalled();
    expect(screen.queryByText("Ingreso Excepcional")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
});
