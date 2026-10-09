import { Upload } from "lucide-react";
import { useOperador } from "../operadorContexto";
import { formatearNumero, infoLote, textoPendientes } from "../datosMockOperador";

export default function PieSincronizacion({ onForzar }) {
  const { estadoRed } = useOperador();
  const bajo = estadoRed.spacePrc < 10;

  let ancho = 0;
  let etiqueta = "";
  if (estadoRed.net === "online") {
    ancho = 100;
    etiqueta = "Todo sincronizado";
  } else if (estadoRed.net === "syncing") {
    const li = infoLote(estadoRed.pend, estadoRed.syncTotal, estadoRed.lote);
    const prog = estadoRed.syncTotal ? Math.max(0, Math.min(1, (estadoRed.syncTotal - estadoRed.pend) / estadoRed.syncTotal)) : 1;
    ancho = prog * 100;
    etiqueta = "Enviando lote " + li.actual + " de " + li.total + "…";
  } else if (estadoRed.net === "slow") {
    ancho = estadoRed.pend > 0 ? 10 : 100;
    etiqueta = estadoRed.pend > 0 ? "Enviando en segundo plano…" : "Todo sincronizado";
  } else {
    etiqueta = estadoRed.pend > 0 ? "Esperando señal…" : "Todo sincronizado";
  }

  return (
    <footer className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span className="text-[#1860A3]">Sincronizados Servidor: {formatearNumero(estadoRed.enviados)}</span>
        <span className="text-[#475569]">{textoPendientes(estadoRed.pend)} offline</span>
      </div>

      {bajo && (
        <p className="text-[11px] font-bold text-[#B91C1C]">⚠ Almacenamiento &lt; 10 % · libera espacio antes de registrar</p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-[#1860A3] transition-all duration-500" style={{ width: ancho + "%" }}></div>
        </div>
        <span className="text-[11px] font-bold text-slate-500 w-44 text-right shrink-0">{etiqueta}</span>
      </div>

      {onForzar && (
        <button
          type="button"
          onClick={onForzar}
          disabled={estadoRed.pend === 0}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-[#003770] hover:bg-[#124B83] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-[11px] transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" /> {estadoRed.pend === 0 ? "Sin pendientes" : "Forzar Sincronización"}
        </button>
      )}
    </footer>
  );
}