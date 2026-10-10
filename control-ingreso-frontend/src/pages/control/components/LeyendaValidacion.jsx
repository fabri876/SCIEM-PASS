import { Check, X, AlertTriangle, Clock, CameraOff } from "lucide-react";
import { useOperador } from "../operadorContexto";

const ITEMS = [
  { cls: "ok", icono: Check, texto: "Permitido", sub: "Azul · ingreso registrado", clases: "text-[#1860A3] bg-[#F0F6FC] border-[#D9E8F7]" },
  { cls: "no", icono: X, texto: "No está en la nómina", sub: "Rojo · rechazado", clases: "text-[#B91C1C] bg-[#FEF2F2] border-[#FEE2E2]" },
  { cls: "warn", icono: AlertTriangle, texto: "No habilitado", sub: "Gris · muestra el motivo", clases: "text-[#475569] bg-[#F1F5F9] border-[#CBD5E1]" },
  { cls: "wait", icono: Clock, texto: "Ya marcado", sub: "Gris · hora y puerta", clases: "text-[#475569] bg-[#F1F5F9] border-[#CBD5E1]" },
  { cls: "qr", icono: CameraOff, texto: "QR inválido", sub: "Gris · rechazado, sin transacción", clases: "text-[#475569] bg-[#F1F5F9] border-[#CBD5E1]" },
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