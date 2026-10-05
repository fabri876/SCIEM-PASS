import { Upload, Wifi, RefreshCw, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOperador } from "../operadorContexto";
import PillsEstadoOperador from "../components/PillsEstadoOperador";
import { formatearNumero, infoLote } from "../datosMockOperador";

const COLOR_LOG = {
  ok: "bg-emerald-500",
  info: "bg-sky-500",
  off: "bg-slate-400",
};

export default function ForzarSincronizacionOperador() {
  const { estadoRed, listLogs, fnDoForzar, fnCambiarRed } = useOperador();
  const navigate = useNavigate();

  let ancho = 0;
  let texto = "";
  if (estadoRed.net === "online") {
    ancho = 100;
    texto = "Todo sincronizado";
  } else if (estadoRed.net === "syncing") {
    const li = infoLote(estadoRed.pend, estadoRed.syncTotal, estadoRed.lote);
    const prog = estadoRed.syncTotal ? Math.max(0, Math.min(1, (estadoRed.syncTotal - estadoRed.pend) / estadoRed.syncTotal)) : 1;
    ancho = prog * 100;
    texto = "Enviando lote " + li.actual + " de " + li.total + "…";
  } else if (estadoRed.net === "slow") {
    ancho = estadoRed.pend > 0 ? 10 : 100;
    texto = estadoRed.pend > 0 ? "Enviando en segundo plano…" : "Todo sincronizado";
  } else {
    texto = estadoRed.pend > 0 ? "Esperando señal…" : "Todo sincronizado";
  }

  const sinPendientes = estadoRed.pend === 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-black text-[#0B2545]">Sincronización</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Gestiona el envío de las marcas registradas sin red hacia el servidor central.
            </p>
          </div>
          <PillsEstadoOperador estadoRed={estadoRed} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">Pendientes offline</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{formatearNumero(estadoRed.pend)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600">Sincronizados servidor</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{formatearNumero(estadoRed.enviados)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Último envío</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{estadoRed.lastSend}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Espacio local</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{estadoRed.spacePrc} %</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: ancho + "%" }}></div>
          </div>
          <p className="text-xs font-bold text-slate-600">{texto}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fnDoForzar}
            disabled={sinPendientes}
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-[#0B2545] hover:bg-[#13315C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" /> {sinPendientes ? "Sin pendientes" : "Forzar Sincronización"}
          </button>
          <button
            type="button"
            onClick={() => { fnCambiarRed("online"); navigate("/control/conectado"); }}
            className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
          >
            <Wifi className="w-4 h-4" /> Recuperar red
          </button>
          <button
            type="button"
            onClick={() => { fnCambiarRed("offline"); navigate("/control/offline"); }}
            className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Ver modo offline
          </button>
        </div>

        <p className="text-[10px] text-slate-400 font-medium">
          Sin pendientes, el forzado no genera registros. Sin conexión, los pendientes se conservan
          para el siguiente envío.
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-black text-[#0B2545]">Registro de sincronización</h2>
        </div>
        <div className="space-y-1.5 max-h-80 overflow-auto">
          {listLogs.length === 0 && <p className="text-xs text-slate-400 font-semibold">Sin eventos todavía</p>}
          {listLogs.map((l, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs px-2 py-1.5 rounded-xl hover:bg-slate-50">
              <span className={"mt-1 w-2 h-2 rounded-full shrink-0 " + (COLOR_LOG[l.clase] || "bg-slate-400")}></span>
              <span className="text-slate-400 font-bold w-10 shrink-0">{l.hora}</span>
              <span className="text-slate-600 font-medium">{l.mensaje}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}