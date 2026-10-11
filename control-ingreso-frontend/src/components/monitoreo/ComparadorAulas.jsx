import React from "react";
import { MapPin, ArrowRight, Building2 } from "lucide-react";
import { nombreAula } from "./utilidadesMonitoreo";

/**
 * Compara lado a lado el PUNTO DE CONTROL donde el estudiante se presentó
 * contra el AULA ASIGNADA EN SU BOLETA.
 */
export default function ComparadorAulas({ alerta, boolCompacto = false }) {
    return (
        <div className={`grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 ${boolCompacto ? "text-[11px]" : "text-xs"}`}>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 min-w-0">
                <p className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wide text-rose-700">
                    <MapPin className="w-3 h-3 shrink-0" /> Punto de control actual
                </p>
                <p className="font-black text-slate-800 truncate">{nombreAula(alerta.aulaActual)}</p>
                {alerta.ubicacionActual && <p className="text-[10.5px] font-semibold text-slate-500 truncate">{alerta.ubicacionActual}</p>}
                {alerta.cuposAulaActual != null && (
                    <p className={`text-[10.5px] font-bold ${alerta.cuposAulaActual > 0 ? "text-slate-600" : "text-rose-700"}`}>
                        {alerta.cuposAulaActual} cupo(s) libre(s)
                    </p>
                )}
            </div>

            <div className="flex items-center text-slate-400" aria-hidden="true">
                <ArrowRight className="w-4 h-4" />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 min-w-0">
                <p className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wide text-emerald-800">
                    <Building2 className="w-3 h-3 shrink-0" /> Aula asignada en boleta
                </p>
                <p className="font-black text-slate-800 truncate">{nombreAula(alerta.aulaAsignada)}</p>
                {alerta.ubicacionAsignada && <p className="text-[10.5px] font-semibold text-slate-500 truncate">{alerta.ubicacionAsignada}</p>}
            </div>
        </div>
    );
}