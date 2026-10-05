import { TEXTOS_RED, textoPendientes } from "../datosMockOperador";

const CLASES_PUNTO = {
  online: "bg-emerald-500",
  syncing: "bg-sky-500",
  slow: "bg-amber-500",
  offline: "bg-rose-500",
};

export default function PillsEstadoOperador({ estadoRed }) {
  const etiqueta = TEXTOS_RED[estadoRed.net] || estadoRed.net;
  const colorPunto = CLASES_PUNTO[estadoRed.net] || "bg-slate-400";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        title={"Última sync: " + estadoRed.lastSend}
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-extrabold text-slate-700"
      >
        <span className={"w-2 h-2 rounded-full " + colorPunto}></span>
        {etiqueta}
      </span>
      <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-extrabold text-slate-700">
        {textoPendientes(estadoRed.pend)}
      </span>
    </div>
  );
}