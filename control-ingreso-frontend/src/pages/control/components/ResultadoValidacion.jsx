import { Check, X, AlertTriangle, Clock, HardDrive } from "lucide-react";
import { useOperador } from "../operadorContexto";

const MAPA = {
  ok: { icono: Check, fondo: "bg-[#F0F6FC]/90 border-[#D9E8F7] text-[#003770]", badge: "bg-[#1860A3]", etiqueta: "PERMITIDO" },
  no: { icono: X, fondo: "bg-[#FEF2F2]/90 border-[#FEE2E2] text-[#B91C1C]", badge: "bg-[#B91C1C]", etiqueta: "DENEGADO" },
  warn: { icono: AlertTriangle, fondo: "bg-[#F1F5F9]/90 border-[#CBD5E1] text-[#475569]", badge: "bg-[#9AA8BA]", etiqueta: "RECHAZADO" },
  wait: { icono: Clock, fondo: "bg-[#F1F5F9]/90 border-[#CBD5E1] text-[#475569]", badge: "bg-[#9AA8BA]", etiqueta: "YA MARCADO" },
  nodata: { icono: HardDrive, fondo: "bg-slate-50/90 border-slate-200 text-slate-800", badge: "bg-slate-500", etiqueta: "SIN DATOS LOCALES" },
};

export default function ResultadoValidacion() {
  const { objResultado } = useOperador();
  if (!objResultado) return null;
  const conf = MAPA[objResultado.kind] || MAPA.nodata;
  const Icono = conf.icono;
  return (
    <div className={"border rounded-3xl p-6 shadow-xs transition-all animate-in fade-in duration-200 " + conf.fondo}>
      <div className="flex items-center gap-3">
        <span className={"w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 " + conf.badge}>
          <Icono className="w-5 h-5" />
        </span>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{objResultado.titulo}</span>
          <h3 className="text-lg font-black text-[#003770] leading-tight">{objResultado.nombre}</h3>
        </div>
      </div>

      {objResultado.meta && <p className="text-xs font-semibold text-slate-600 mt-3">{objResultado.meta}</p>}

      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-3 flex-wrap text-xs font-bold">
        <span>{objResultado.pie}</span>
        <span className="text-slate-500">{objResultado.ms} ms</span>
      </div>
    </div>
  );
}