import React from "react";
import { Lock, ChevronRight } from "lucide-react";
import { estiloOcupacion } from "./utilidadesMonitoreo";

/**
 * Una tarjeta por aula: ocupación frente a capacidad (CA-06). Borde rojo si el aforo
 * llega al 90 %, hay una incidencia alta o el aula está fuera de límite. Al hacer clic
 * (o Enter) abre el detalle del aula.
 */
export default function TarjetaAula({ aula, incidencias, boolCerrada, onAbrir }) {
    const estilo = estiloOcupacion(aula);
    const boolConCapacidad = aula.capacidad != null;
    const intPct = Math.min(100, Number(aula.porcentajeOcupacion) || 0);
    const boolIncidenciaAlta = (incidencias?.altas || 0) > 0;
    const strDocente = aula.docenteResponsable || aula.docente;
    const strBorde = boolIncidenciaAlta && !estilo.borde.includes("rose") ? "border-rose-300 ring-2 ring-rose-100" : estilo.borde;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onAbrir(aula)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAbrir(aula);
                }
            }}
            aria-label={`Ver el detalle de ${aula.aula}`}
            className={`border rounded-2xl p-3.5 space-y-2 bg-white cursor-pointer hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${strBorde}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-black text-[#003770] text-sm truncate">{aula.aula}</p>
                    {aula.ubicacion && <p className="text-[10.5px] text-slate-500 font-semibold truncate">{aula.ubicacion}</p>}
                    {strDocente && <p className="text-[10.5px] text-slate-500 font-semibold truncate">{strDocente}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-center ${estilo.pill}`}>{estilo.etiqueta}</span>
                    {boolCerrada && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-white">
                            <Lock className="w-3 h-3" /> Ingreso finalizado
                        </span>
                    )}
                </div>
            </div>

            <p className="text-xl font-black text-slate-800 tabular-nums">
                {aula.ingresados}
                <span className="text-xs font-bold text-slate-500">
                    {boolConCapacidad ? ` / ${aula.capacidad} · ${aula.porcentajeOcupacion ?? 0}%` : " ingresados"}
                </span>
            </p>

            {boolConCapacidad && (
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={intPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Ocupación de ${aula.aula}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${estilo.barra}`} style={{ width: `${intPct}%` }} />
                </div>
            )}

            <div className="grid grid-cols-3 gap-1 text-[10.5px] font-bold text-slate-600 pt-1 border-t border-dashed border-slate-200">
                <span>Asignados <b className="block text-slate-800 tabular-nums">{aula.asignados ?? 0}</b></span>
                <span>Pendientes <b className="block text-amber-700 tabular-nums">{aula.pendientes ?? 0}</b></span>
                <span>Cupos <b className="block text-slate-800 tabular-nums">{aula.disponibles ?? "—"}</b></span>
            </div>

            <div className="flex items-center justify-between text-[10.5px] font-bold">
                {incidencias === undefined ? (
                    <span />
                ) : incidencias && incidencias.abiertas > 0 ? (
                    <span className={boolIncidenciaAlta ? "text-rose-700" : "text-amber-700"}>
                        {incidencias.abiertas} incidencia(s){boolIncidenciaAlta ? ` · ${incidencias.altas} alta(s)` : ""}
                    </span>
                ) : (
                    <span className="text-slate-400">Sin incidencias</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </div>
        </div>
    );
}