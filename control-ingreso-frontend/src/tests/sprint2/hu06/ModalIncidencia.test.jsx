import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalIncidencia from "../../../components/incidencias/ModalIncidencia";

// Se simulan los servicios: estas pruebas no llaman al backend ni a Supabase.
vi.mock("../../../services/incidenciaService", () => ({
  consultarEstudianteIncidencia: vi.fn(),
  registrarIncidencia: vi.fn(),
  notificarCambioIncidencias: vi.fn(),
}));

const AULAS = [
  {
    idAmbiente: 1,
    aula: "Aula 601",
    asignatura: "Cálculo I",
    fechaExamen: "2026-10-14",
  },
];

describe("HU06 · Registrar incidencia (pruebas unitarias)", () => {
  it("TC-019 · La descripción de la incidencia acepta máximo 500 caracteres", async () => {
    const user = userEvent.setup();
    render(<ModalIncidencia boolAbierto onCerrar={vi.fn()} aulasDisponibles={AULAS} />);
    const descripcion = screen.getByPlaceholderText(/describe qué ocurrió/i);

    expect(descripcion).toHaveAttribute("maxlength", "500");

    await user.click(descripcion);
    await user.paste("a".repeat(600));

    expect(descripcion.value.length).toBe(500);
    expect(screen.getByText("500/500")).toBeInTheDocument();
  });
});
