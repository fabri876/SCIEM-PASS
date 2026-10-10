import { useNavigate } from "react-router-dom";
import { obtenerUsuarioActual } from "../../../services/authService";

// ---- Componentes existentes ----
import PieSincronizacion from "../components/PieSincronizacion";

// ---- Control de ingreso ----
import useControlIngreso from "../ingreso/useControlIngreso";
import SeccionControlIngreso from "../ingreso/SeccionControlIngreso";
import EncabezadoControl from "../ingreso/componentes/EncabezadoControl";

export default function ConectadoOperador() {
  const navigate = useNavigate();
  const ctrl = useControlIngreso();
  const strNombre = (obtenerUsuarioActual()?.nombre || "").split(" ")[0];

  return (
    <div className="space-y-6">
      {/* mis exámenes de hoy → verificación (QR / C.I. o SIS), resultado y últimos ingresos */}
      <EncabezadoControl strTitulo={strNombre ? `Hola, ${strNombre}` : "Control de ingreso"} />
      <SeccionControlIngreso ctrl={ctrl} strRol="operador" />

      <PieSincronizacion onForzar={() => navigate("/control/forzar")} />
    </div>
  );
}
