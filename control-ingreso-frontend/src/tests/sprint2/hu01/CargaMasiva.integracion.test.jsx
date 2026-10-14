import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkUploadCard from "../../../pages/admin/components/BulkUploadCard";
import { previsualizarUsuariosMasivo } from "../../../services/usuarioService";
import { obtenerGruposPorAsignatura } from "../../../services/grupoService";

// Se simulan las respuestas del servidor con la misma forma que devuelve el backend.
vi.mock("../../../services/usuarioService", () => ({ previsualizarUsuariosMasivo: vi.fn() }));
vi.mock("../../../services/authService", () => ({
  obtenerUsuarioActual: vi.fn(() => ({ rol: "ADMINISTRADOR", idUsuario: 112 })),
}));
vi.mock("../../../services/examenService", () => ({ obtenerAsignaturasPorDocente: vi.fn() }));
vi.mock("../../../services/grupoService", () => ({
  obtenerAsignaturas: vi.fn(async () => [{ idAsignatura: 10, nombreAsignatura: "Cálculo I" }]),
  obtenerGruposPorAsignatura: vi.fn(),
  obtenerGruposPorDocente: vi.fn(),
}));

// GrupoResponseDto del backend: trae el nombre de la asignatura y el estado del grupo.
const GRUPOS = [{ idGrupo: 7, idAsignatura: 10, nombreAsignatura: "Cálculo I", nombreGrupo: "2", estadoGrupo: true }];

// CargaMasivaVistaPreviaDto del backend: en la carga de estudiantes las filas no traen asignatura ni grupo.
function vistaPrevia(cantidad) {
  return {
    archivo: "lista.xlsx",
    filas: Array.from({ length: cantidad }, (_, i) => ({
      fila: i + 2,
      nombre: `QA Masiva ${i + 1}`,
      apellido: "Prueba",
      ci: `990090${i + 1}`,
      codigoSis: 202301900 + i + 1,
      correo: `qa.masiva${i + 1}@test.com`,
      telefono: null,
      rol: "ESTUDIANTE",
      asignatura: null,
      grupo: null,
    })),
  };
}

function excel(nombre) {
  return new File(["contenido"], nombre, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// Elige asignatura y grupo, sube el archivo y espera la vista previa.
async function abrirVistaPrevia(onProcesar = vi.fn()) {
  const user = userEvent.setup({ applyAccept: false });
  render(<BulkUploadCard onProcesar={onProcesar} />);
  await screen.findByRole("option", { name: "Cálculo I" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Asignatura del lote" }), "10");
  await screen.findByRole("option", { name: "Grupo 2" });
  await user.selectOptions(screen.getByRole("combobox", { name: "Grupo del lote" }), "7");
  await user.upload(screen.getByLabelText("Seleccionar archivo de usuarios"), excel("lista.xlsx"));
  const dialogo = await screen.findByRole("dialog");
  return { user, onProcesar, dialogo };
}

beforeEach(() => {
  vi.clearAllMocks();
  obtenerGruposPorAsignatura.mockResolvedValue(GRUPOS);
  previsualizarUsuariosMasivo.mockResolvedValue(vistaPrevia(5));
});

describe("HU01 · Carga masiva (pruebas de integración)", () => {
  it("TC-033 · La vista previa muestra todas las filas y el total de registros", async () => {
    const { dialogo } = await abrirVistaPrevia();

    expect(within(dialogo).getByText(/5 registros encontrados/)).toBeInTheDocument();
    const filas = within(dialogo).getAllByRole("row").slice(1); // sin la fila de encabezados
    expect(filas).toHaveLength(5);
  });

  it("TC-034 · La vista previa muestra la asignatura y el grupo seleccionados", async () => {
    const { dialogo } = await abrirVistaPrevia();
    // Segunda fila de datos (fila 3 del archivo), para no confundir el grupo "2" con el número de fila.
    const fila = within(dialogo).getAllByRole("row")[2];

    expect(within(fila).getByText("Cálculo I")).toBeInTheDocument();
    expect(within(fila).getByText("2")).toBeInTheDocument();
    expect(within(dialogo).queryByText("Sin asignación")).not.toBeInTheDocument();
  });

  it("TC-040 · Si el servidor falla al guardar se muestra un mensaje y no se muestra un resumen", async () => {
    const onProcesar = vi.fn().mockRejectedValue(new Error("Ha ocurrido un error inesperado en el servidor."));
    const { user, dialogo } = await abrirVistaPrevia(onProcesar);

    await user.click(within(dialogo).getByRole("button", { name: /confirmar y registrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ha ocurrido un error inesperado en el servidor.");
    expect(screen.queryByText(/Nuevos:/)).not.toBeInTheDocument();
    expect(screen.getByText("Archivo seleccionado: lista.xlsx")).toBeInTheDocument();
  });

  it("TC-041 · Presionar dos veces Confirmar y registrar guarda una sola vez", async () => {
    let terminar;
    const onProcesar = vi.fn(() => new Promise((resolve) => { terminar = resolve; }));
    const { user, dialogo } = await abrirVistaPrevia(onProcesar);
    const confirmar = within(dialogo).getByRole("button", { name: /confirmar y registrar/i });

    await user.dblClick(confirmar);
    expect(onProcesar).toHaveBeenCalledTimes(1);
    expect(confirmar).toBeDisabled();

    terminar({ mensaje: "5 usuario(s) nuevos", totalProcesados: 5, exitosos: 5, fallidos: 0 });
    expect(await screen.findByText("Nuevos: 5")).toBeInTheDocument();
    expect(onProcesar).toHaveBeenCalledTimes(1);
  });
});
