import { obtenerUsuarioActual } from "../../../services/authService";
import { useOperador } from "../operadorContexto";

// ---- Control de ingreso ----
import useControlIngreso from "../ingreso/useControlIngreso";
import SeccionControlIngreso from "../ingreso/SeccionControlIngreso";
import EncabezadoControl from "../ingreso/componentes/EncabezadoControl";

export default function ConectadoOperador() {
  const ctrl = useControlIngreso();
  const { estadoRed } = useOperador();
  const strNombre = (obtenerUsuarioActual()?.nombre || "").split(" ")[0];

  return (
    <div className="space-y-6">
      {/* mis exámenes de hoy → verificación (QR / C.I. o SIS), resultado y últimos ingresos */}
      <EncabezadoControl
        strTitulo={strNombre ? `Hola, ${strNombre}` : "Control de ingreso"}
        net={estadoRed.net}
        pend={estadoRed.pend}
        enviados={estadoRed.enviados}
        spacePrc={estadoRed.spacePrc}
      />
      <SeccionControlIngreso ctrl={ctrl} strRol="operador" />
    </div>
  );
}
