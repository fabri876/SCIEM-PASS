import { useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOperador } from "../operadorContexto";
import BannerPuntoControl from "../components/BannerPuntoControl";
import SelectorExamen from "../components/SelectorExamen";
import CamaraYFormulario from "../components/CamaraYFormulario";
import ResultadoValidacion from "../components/ResultadoValidacion";
import LeyendaValidacion from "../components/LeyendaValidacion";
import PieSincronizacion from "../components/PieSincronizacion";
import { formatearNumero } from "../datosMockOperador";

export default function OffLineOperador() {
  const { estadoRed, examenActual, fnCambiarRed } = useOperador();
  const navigate = useNavigate();
  const [boolReintentando, setBoolReintentando] = useState(false);

  const fnReintentar = () => {
    setBoolReintentando(true);
    setTimeout(() => {
      setBoolReintentando(false);
      fnCambiarRed("online");
      navigate("/control/conectado");
    }, 1300);
  };

  const sinNomina = examenActual.estado !== "listo";

  return (
    <div className="space-y-6">
      <div className="bg-[#FEF2F2]/80 border border-[#FEE2E2] rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-[#B91C1C] text-white flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-black text-[#B91C1C]">Sin red · MODO OFFLINE</h3>
            <p className="text-[11px] font-semibold text-[#B91C1C]">
              Último envío: {estadoRed.lastSend}. Los ingresos válidos se guardan en la cola local y se sincronizan al
              recuperar la red.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fnReintentar}
          disabled={boolReintentando}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-[#003770] hover:bg-[#124B83] disabled:opacity-60 text-white font-extrabold text-[11px] transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={"w-3.5 h-3.5 " + (boolReintentando ? "animate-spin" : "")} />
          {boolReintentando ? "Reintentando…" : "Reintentar ahora"}
        </button>
      </div>

      {estadoRed.spacePrc < 10 && (
        <div className="bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] text-[11px] font-bold rounded-2xl px-4 py-3">
          ⚠ Almacenamiento &lt; 10 %. El registro offline será bloqueado hasta liberar espacio.
        </div>
      )}

      <BannerPuntoControl examen={examenActual} />

      {sinNomina && (
        <div className="bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-2xl px-4 py-3">
          Sin nómina local para este examen. La validación queda bloqueada mientras no descargues la nómina.
          Conéctate para poder descargarla.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#64748B]">Pendientes offline</p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {formatearNumero(estadoRed.pend)} <span className="text-xs font-bold text-slate-400">marcas en cola</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#1860A3]">Sincronizados servidor</p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {formatearNumero(estadoRed.enviados)} <span className="text-xs font-bold text-slate-400">envíos previos</span>
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-black text-[#003770]">Verificación sin conexión</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Se valida contra la nómina local. Los ingresos permitidos quedan pendientes de envío.
            </p>
          </div>
          <SelectorExamen />
        </div>
        <CamaraYFormulario />
        <ResultadoValidacion />
        <LeyendaValidacion />
      </div>

      <PieSincronizacion onForzar={() => navigate("/control/forzar")} />
    </div>
  );
}