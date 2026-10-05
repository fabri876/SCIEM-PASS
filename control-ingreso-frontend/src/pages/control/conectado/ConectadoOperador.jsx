import { useNavigate } from "react-router-dom";
import { useOperador } from "../operadorContexto";
import { obtenerUsuarioActual } from "../../../services/authService";

// ---- Componentes existentes (sin cambios) ----
import PanelEstadosConexion from "../components/PanelEstadosConexion";
import PanelPrecargaNominas from "../components/PanelPrecargaNominas";
import PieSincronizacion from "../components/PieSincronizacion";

// ---- Control de ingreso ----
import useControlIngreso from "../ingreso/useControlIngreso";
import SeccionControlIngreso from "../ingreso/SeccionControlIngreso";
import EncabezadoControl from "../ingreso/componentes/EncabezadoControl";

export default function ConectadoOperador() {
  const { fnCambiarRed } = useOperador();
  const navigate = useNavigate();
  const ctrl = useControlIngreso();
  const strNombre = (obtenerUsuarioActual()?.nombre || "").split(" ")[0];

  const fnAlCambiarRed = (net) => {
    if (net === "offline") {
      fnCambiarRed("offline");
      navigate("/control/offline");
      return;
    }
    fnCambiarRed(net);
  };

  return (
    <div className="space-y-6">
      {/* sin cambios */}
      <PanelEstadosConexion onNet={fnAlCambiarRed} />

      {/* mis exámenes de hoy → verificación (QR / C.I. o SIS), resultado y últimos ingresos */}
      <EncabezadoControl strTitulo={strNombre ? `Hola, ${strNombre}` : "Control de ingreso"} />
      <SeccionControlIngreso ctrl={ctrl} strRol="operador" />

      {/* sin cambios */}
      <PanelPrecargaNominas />
      <PieSincronizacion onForzar={() => navigate("/control/forzar")} />
    </div>
  );
}
