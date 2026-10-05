import { CheckCircle2, Download, RefreshCw } from "lucide-react";
import { useOperador } from "../operadorContexto";
import { formatearNumero } from "../datosMockOperador";

export default function PanelPrecargaNominas() {
  const { listaAsignados, estadoRed, fnDescargar, fnActualizar } = useOperador();

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
      <h2 className="text-sm font-black text-[#0B2545]">Precarga de nóminas</h2>

      {estadoRed.net === "offline" && listaAsignados.some((e) => e.estado !== "listo") && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold rounded-xl px-3 py-2.5">
          Sin conexión y sin nómina cargada para el examen seleccionado. Conéctate para descargarla.
        </div>
      )}

      <div className="space-y-3">
        {listaAsignados.map((e) => (
          <div key={e.id} className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-800">{e.nombre}</h3>
              <p className="text-[11px] text-slate-400 font-semibold">{e.sub}</p>
            </div>

            {e.estado === "listo" && (
              <>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Listo para offline · {formatearNumero(e.total)} estudiantes · hace {e.hace} min
                </span>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {formatearNumero(e.ing)} ingresados · {e.actualizando ? "Actualizando…" : "Actualizada incremental"}
                  </span>
                  {estadoRed.net !== "offline" ? (
                    <button
                      type="button"
                      onClick={() => fnActualizar(e.id)}
                      disabled={e.actualizando}
                      className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#2563EB] border border-[#2563EB]/30 rounded-xl px-3 py-1.5 hover:bg-[#2563EB]/5 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={"w-3.5 h-3.5 " + (e.actualizando ? "animate-spin" : "")} />
                      {e.actualizando ? "Actualizando…" : "Actualizar nómina"}
                    </button>
                  ) : (
                    <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">Requiere conexión</span>
                  )}
                </div>
              </>
            )}

            {e.estado === "descargando" && (() => {
              const porcentaje = Math.floor((e.cargados / e.total) * 100);
              return (
                <div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}>
                    <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: porcentaje + "%" }}></div>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1.5">
                    {estadoRed.net === "offline" ? "Descarga en pausa · " : "Descargando... "}
                    {porcentaje} % · {formatearNumero(e.cargados)} de {formatearNumero(e.total)}
                  </p>
                </div>
              );
            })()}

            {e.estado === "ninguna" && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">Sin descargar</span>
                <button
                  type="button"
                  onClick={() => fnDescargar(e.id)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-white bg-[#2563EB] rounded-xl px-3 py-1.5 hover:bg-[#1D4ED8] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar nómina
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 font-medium">
        Descarga incremental por examen. Las nóminas se borran al cerrar sesión solo si no
        hay pendientes.
      </p>
    </div>
  );
}