import { useNavigate } from "react-router-dom";
import { useOperador } from "../operadorContexto";
import { obtenerUsuarioActual } from "../../../services/authService";

// ---- Modo sin conexión (HU07): se muestran sin cambios de funcionamiento ----
import PanelEstadosConexion from "../components/PanelEstadosConexion";
import PieSincronizacion from "../components/PieSincronizacion";

// ---- Control de ingreso ----
import useControlIngreso from "../ingreso/useControlIngreso";
import SeccionControlIngreso from "../ingreso/SeccionControlIngreso";
import EncabezadoControl from "../ingreso/componentes/EncabezadoControl";

export default function ConectadoOperador() {
  const { fnCambiarRed, estadoRed } = useOperador();
  const navigate = useNavigate();
  const ctrl = useControlIngreso(null, { boolSoloMios: true });
  const strNombre = (obtenerUsuarioActual()?.nombre || "").split(" ")[0];

  const fnAlCambiarRed = (net) => {
    if (net === "offline") {
      fnCambiarRed("offline");
      navigate("/control/offline");
      return;
    }
    fnCambiarRed(net);
  };

  // Nómina por examen para el modo sin conexión.
  // Pendiente de conectar por HU07 con los exámenes reales:
  //   fnObtenerNomina(examen)   → { estado: "lista" | "descargando" | "ninguna", total, porcentaje }
  //   fnDescargarNomina(examen) → inicia la descarga de la nómina de ese examen
  // Mientras sean undefined, la tarjeta muestra el botón "Descargar nómina" desactivado.
  const objModoSinConexion = {
    fnObtenerNomina: undefined,
    fnDescargarNomina: undefined,
    boolSinRed: estadoRed?.net === "offline",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Saludo + mis exámenes → verificación (QR / C.I. o SIS), resultado y últimos ingresos */}
      <EncabezadoControl strTitulo={strNombre ? `Hola, ${strNombre}` : "Control de ingreso"} />
      <SeccionControlIngreso ctrl={ctrl} strRol="operador" objModoSinConexion={objModoSinConexion} />

      {/* Estados de conexión y sincronización (HU07) */}
      <div className="pt-6 border-t border-[#CBD5E1] space-y-6">
        <PanelEstadosConexion onNet={fnAlCambiarRed} />
        <PieSincronizacion onForzar={() => navigate("/control/forzar")} />
      </div>
    </div>
  );
}
