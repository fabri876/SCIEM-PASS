import ReporteLista from '../common/ReporteLista.jsx';
import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useMemo } from "react";
import { AlertTriangle, MapPinOff } from "lucide-react";
import { formatearHora } from "../incidencias/utilidadesIncidencias";
import { nombreAula } from "./utilidadesMonitoreo";

const MAX_ITEMS = 8;

/**
 * Actividad reciente armada con datos REALES que ya existen:
 *   - incidencias abiertas del examen (HU06)
 *   - estudiantes en un aula diferente (alertas del tablero, HU10)
 * Se ordena de la más nueva a la más antigua.
 */
export default function ActividadReciente({ incidencias, alertas }) {
    const eventos = useMemo(() => {
        const lista = [];
        (incidencias?.lista || []).forEach((i) =>
            lista.push({
                clave: `inc-${i.idIncidencia}`,
                fecha: i.fechaHora,
                Icono: AlertTriangle,
                tono: i.severidad === "ALTA" ? "rojo" : "ambar",
                etiqueta: `Incidencia ${String(i.severidadEtiqueta || i.severidad || "").toLowerCase()}`,
                titulo: i.codigo,
                detalle: `${i.aula || "Aula"} · ${i.tipoEtiqueta || i.tipo}`,
            })
        );
        (alertas || []).forEach((a) =>
            lista.push({
                clave: `int-${a.idIntento}`,
                fecha: a.hora,
                Icono: MapPinOff,
                tono: "rojo",
                etiqueta: "Ingreso a un ambiente diferente",
                titulo: a.estudiante,
                detalle: `${nombreAula(a.aulaActual)} → debe ir al ${nombreAula(a.aulaAsignada)}`,
            })
        );
        return lista.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || ""))).slice(0, MAX_ITEMS);
    }, [incidencias, alertas]);

    const clases = { rojo: "bg-rose-100 text-rose-700", ambar: "bg-amber-100 text-amber-800" };

    return (
        <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 min-w-0" aria-label="Actividad reciente">
            <h4 className="text-sm font-black text-[#003770]">Actividad reciente</h4>
            {eventos.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-6 text-center">Sin incidencias ni alertas por ahora.</p>
            ) : (
                <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-3 [scrollbar-gutter:stable]">
                    <ReporteLista titulo="Actividad reciente" contenido={() => <>{eventos.map((e) => (
                        <li key={e.clave} className="flex items-start gap-2.5 text-xs">
                            <span className="w-10 shrink-0 font-black text-slate-500 tabular-nums pt-0.5">{formatearHora(e.fecha)}</span>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 break-words">
                                    <span className={`inline-flex items-center gap-1 text-[9.5px] font-black px-1.5 py-0.5 rounded-full mr-1.5 align-middle ${clases[e.tono]}`}>
                                        <e.Icono className="w-3 h-3" />{textoInterfaz(e.etiqueta)}
                                    </span>
                                    {textoInterfaz(e.titulo)}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-500 break-words">{e.detalle}</p>
                            </div>
                        </li>
                    ))}</>} as="li" />
{eventos.map((e) => (
                        <li key={e.clave} className="flex items-start gap-2.5 text-xs">
                            <span className="w-10 shrink-0 font-black text-slate-500 tabular-nums pt-0.5">{formatearHora(e.fecha)}</span>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 break-words">
                                    <span className={`inline-flex items-center gap-1 text-[9.5px] font-black px-1.5 py-0.5 rounded-full mr-1.5 align-middle ${clases[e.tono]}`}>
                                        <e.Icono className="w-3 h-3" />{textoInterfaz(e.etiqueta)}
                                    </span>
                                    {textoInterfaz(e.titulo)}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-500 break-words">{e.detalle}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}