import { useNavigate } from "react-router-dom";
import { obtenerUsuarioActual } from "../../../services/authService";
import { useOperador } from "../operadorContexto";

// ---- Control de ingreso ----
import useControlIngreso from "../ingreso/useControlIngreso";
import SeccionControlIngreso from "../ingreso/SeccionControlIngreso";
import EncabezadoControl from "../ingreso/componentes/EncabezadoControl";

export default function ConectadoOperador() {
  const navigate = useNavigate();
  const ctrl = useControlIngreso();
  const { estadoRed, listExamenes, fnDescargar } = useOperador();
  const strNombre = (obtenerUsuarioActual()?.nombre || "").split(" ")[0];

  const objModoSinConexion = {
    boolSinRed: estadoRed.net === "offline",
    fnObtenerNomina: (examen) => {
      const e = listExamenes.find((x) => x.id === examen.id);
      if (!e) return { estado: "ninguna" };
      if (e.estado === "listo") return { estado: "lista", total: e.total, porcentaje: 100 };
      if (e.estado === "descargando") {
        return { estado: "descargando", porcentaje: e.total ? Math.min(100, Math.round((e.cargados / e.total) * 100)) : 0 };
      }
      return { estado: "ninguna" };
    },
    fnDescargarNomina: (examen) => fnDescargar(examen.id, {
      materia: examen.materia,
      tipo: examen.tipo,
      aula: examen.aula,
      contador: examen.contador,
    }),
  };

  return (
    <div className="space-y-6">
      {/* mis exámenes de hoy → verificación (QR / C.I. o SIS), resultado y últimos ingresos */}
      <EncabezadoControl strTitulo={strNombre ? `Hola, ${strNombre}` : "Control de ingreso"} net={estadoRed.net} pend={estadoRed.pend} />
      <SeccionControlIngreso ctrl={ctrl} strRol="operador" objModoSinConexion={objModoSinConexion} />
    </div>
  );
}
