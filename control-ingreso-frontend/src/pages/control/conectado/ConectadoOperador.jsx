import { useNavigate } from "react-router-dom";
import { useOperador } from "../operadorContexto";
import BannerPuntoControl from "../components/BannerPuntoControl";
import SelectorExamen from "../components/SelectorExamen";
import CamaraYFormulario from "../components/CamaraYFormulario";
import ResultadoValidacion from "../components/ResultadoValidacion";
import LeyendaValidacion from "../components/LeyendaValidacion";
import PanelEstadosConexion from "../components/PanelEstadosConexion";
import PanelPrecargaNominas from "../components/PanelPrecargaNominas";
import PieSincronizacion from "../components/PieSincronizacion";

export default function ConectadoOperador() {
  const { examenActual, fnCambiarRed } = useOperador();
  const navigate = useNavigate();

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
      <BannerPuntoControl examen={examenActual} />

      <PanelEstadosConexion onNet={fnAlCambiarRed} />

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-black text-[#0B2545]">Verificación de ingreso</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Valida el QR del carnet o escribe el CI / Código SIS. Funciona también sin conexión.
            </p>
          </div>
          <SelectorExamen />
        </div>
        <CamaraYFormulario />
        <ResultadoValidacion />
        <LeyendaValidacion />
      </div>

      <PanelPrecargaNominas />

      <PieSincronizacion onForzar={() => navigate("/control/forzar")} />
    </div>
  );
}