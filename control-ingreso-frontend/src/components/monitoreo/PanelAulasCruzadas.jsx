import { textoNombre } from '../common/textoNombre.js';
import { reporteColumnas } from '../../utils/reportesListas.js';
import ReporteLista from '../common/ReporteLista.jsx';
import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useMemo, useState } from "react";
import { Search, Zap } from "lucide-react";
import ComparadorAulas from "./ComparadorAulas";
import { nombreAula } from "./utilidadesMonitoreo";
import { formatearHora } from "../incidencias/utilidadesIncidencias";

const UMBRAL_BUSCADOR = 4;

/**
 * Estudiantes que se presentaron en un aula distinta a la de su boleta
 * (intentos AMBIENTE_DIFERENTE). El botón de Reubicación Express solo lo ve el
 * DOCENTE; el Administrador consulta pero no opera (regla de la HU10).
 */
export default function PanelAulasCruzadas({ alertas, rol, onReubicar }) {
    const [strBusqueda, setStrBusqueda] = useState("");

    const alertasFiltradas = useMemo(() => {
        const strQ = strBusqueda.trim().toLowerCase();
        if (!strQ) return alertas;
        return alertas.filter((a) =>
            [a.estudiante, a.codSis, a.ci].some((v) => String(v ?? "").toLowerCase().includes(strQ))
        );
    }, [alertas, strBusqueda]);

    return (
        <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 min-w-0" aria-label="Estudiantes en un aula diferente">
            <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-black text-[#003770]">Estudiantes en un aula diferente</h4>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${alertas.length ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                    {alertas.length}
                </span>
            </div>

            {alertas.length >= UMBRAL_BUSCADOR && (
                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#2563EB]">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                        type="search"
                        value={strBusqueda}
                        onChange={(e) => setStrBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, SIS o CI"
                        className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                </label>
            )}

            {alertas.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-6 text-center">
                    Ningún estudiante se presentó en un aula que no es la suya.
                </p>
            ) : alertasFiltradas.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-6 text-center">Sin resultados para «{strBusqueda}».</p>
            ) : (
                <ul className="space-y-2.5 max-h-[34rem] overflow-y-auto pr-3 [scrollbar-gutter:stable]">
                    <ReporteLista filtros={[strBusqueda]} datos={() => reporteColumnas(alertasFiltradas, [["Estudiante", a => textoNombre(a.estudiante)], ["SIS", a => a.codSis], ["Aula de intento", a => a.aulaActual], ["Aula asignada", a => a.aulaAsignada], ["Hora", a => a.hora]])} titulo="Alertas de aulas cruzadas"  as="li" />
{alertasFiltradas.map((alerta) => (
                        <li key={alerta.idIntento} className="border border-rose-200 bg-rose-50/40 rounded-2xl p-3.5 space-y-2.5 text-xs break-words">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-black text-slate-800">{alerta.estudiante}</p>
                                    <p className="text-[11px] font-bold text-slate-500">
                                        SIS {alerta.codSis}
                                        {alerta.ci ? ` · CI ${alerta.ci}` : ""} · {formatearHora(alerta.hora)}
                                    </p>
                                </div>
                                <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white text-center shrink-0">
                                    Ingreso a un ambiente diferente
                                </span>
                            </div>

                            <ComparadorAulas alerta={alerta} />

                            {rol === "DOCENTE" ? (
                                alerta.puedeReubicar ? (
                                    <button
                                        type="button"
                                        onClick={() => onReubicar(alerta)}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#1A365D] hover:bg-[#132743] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                        <Zap className="w-3.5 h-3.5" />
                                        Reubicar y Autorizar en {nombreAula(alerta.aulaActual)}
                                    </button>
                                ) : (
                                    <p className="text-[11px] font-bold text-slate-500">
                                        {textoInterfaz(alerta.motivoNoReubicable || "No se puede reubicar en este momento.")}
                                    </p>
                                )
                            ) : (
                                <p className="text-[11px] font-bold text-slate-500">Solo el docente de la materia puede reubicar al estudiante.</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}