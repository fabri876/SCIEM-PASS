import { Wifi, RefreshCw, WifiLow, WifiZero } from "lucide-react";
import { useOperador } from "../operadorContexto";
import { infoLote, textoPendientes } from "../datosMockOperador";

const TARJETAS = [
  { net: "online", etiqueta: "Conectado, todo enviado", icono: Wifi, definido: 0, punto: "bg-emerald-500", nota: "" },
  { net: "syncing", etiqueta: "Recuperó la conexión, enviando", icono: RefreshCw, definido: 12, punto: "bg-sky-500", nota: "" },
  { net: "slow", etiqueta: "Señal débil", icono: WifiLow, definido: 5, punto: "bg-amber-500", nota: "Trabajando con datos locales. Se enviará en segundo plano." },
  { net: "offline", etiqueta: "Sin red · MODO OFFLINE", icono: WifiZero, definido: 17, punto: "bg-rose-500", nota: "" },
];

const COLOR_NOTA = {
  online: "text-slate-500",
  syncing: "text-sky-700",
  slow: "text-amber-600",
  offline: "text-rose-600",
};

export default function PanelEstadosConexion({ onNet }) {
  const { estadoRed, fnCambiarRed } = useOperador();

  return (
    <div>
      <h2 className="text-sm font-black text-[#0B2545] mb-3">Estados de conexión</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {TARJETAS.map((t) => {
          const Icono = t.icono;
          const activa = estadoRed.net === t.net;
          const contador = activa ? estadoRed.pend : t.definido;
          let nota = t.nota;
          if (t.net === "offline") nota = "Último envío: " + estadoRed.lastSend + ".";
          if (t.net === "syncing" && !activa) nota = "Enviando lote 2 de 3. Puedes seguir validando.";
          if (t.net === "syncing" && activa) {
            const li = infoLote(estadoRed.pend, estadoRed.syncTotal, estadoRed.lote);
            nota = "Enviando lote " + li.actual + " de " + li.total + ". Puedes seguir validando.";
          }
          return (
            <button
              key={t.net}
              type="button"
              onClick={() => (onNet ? onNet(t.net) : fnCambiarRed(t.net))}
              aria-pressed={activa}
              className={
                "text-left rounded-2xl border p-4 transition-colors cursor-pointer " +
                (activa ? "border-[#0B2545] bg-[#0B2545]/5 ring-2 ring-[#0B2545]/15" : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50")
              }
            >
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">{t.etiqueta}</p>
              <div className="flex items-center justify-between mt-2.5 gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
                  <span className={"w-2 h-2 rounded-full " + t.punto}></span>
                  <Icono className="w-4 h-4 text-slate-400" />
                </span>
                <span className="text-xs font-black text-slate-800">{textoPendientes(contador)}</span>
              </div>
              {nota && <p className={"text-[10px] mt-2 font-semibold " + (COLOR_NOTA[t.net] || "text-slate-500")}>{nota}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}