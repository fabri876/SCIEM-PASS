import { Check, X, AlertTriangle, Clock, CameraOff } from "lucide-react";
import { useOperador } from "../operadorContexto";

const ITEMS = [
  { cls: "ok", icono: Check, texto: "Permitido", sub: "Verde · ingreso registrado", clases: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { cls: "no", icono: X, texto: "No está en la nómina", sub: "Rojo · rechazado", clases: "text-rose-700 bg-rose-50 border-rose-200" },
  { cls: "warn", icono: AlertTriangle, texto: "No habilitado", sub: "Naranja · muestra el motivo", clases: "text-amber-700 bg-amber-50 border-amber-200" },
  { cls: "wait", icono: Clock, texto: "Ya marcado", sub: "Amarillo · hora y puerta", clases: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  { cls: "qr", icono: CameraOff, texto: "QR inválido", sub: "Naranja · rechazado, sin transacción", clases: "text-amber-700 bg-amber-50 border-amber-200" },
];

export default function LeyendaValidacion() {
  const { fnDemo } = useOperador();
  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
      {ITEMS.map((it) => {
        const Icono = it.icono;
        return (
          <button
            key={it.cls}
            type="button"
            onClick={() => fnDemo(it.cls)}
            className={"flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer " + it.clases}
          >
            <Icono className="w-4 h-4 shrink-0" />
            <span>
              <b className="block text-[11px] leading-tight">{it.texto}</b>
              <span className="block text-[10px] font-medium opacity-80">{it.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}