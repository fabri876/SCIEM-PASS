import ReporteLista from '../../../components/common/ReporteLista.jsx';
import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import React from "react";

export default function StudentExamList({ listExamenes, cargando }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-5">
                <div>
                    <h2 className="text-base font-extrabold text-[#021B3B]">Mis Exámenes Masivos</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Listado de evaluaciones programadas y estados de habilitación</p>
                </div>
                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200">
                    {listExamenes.length} Registros
                </span>
            </div>

            {cargando ? (
                <div className="py-16 text-center text-slate-400 text-xs font-medium">
                    Cargando exámenes...
                </div>
            ) : listExamenes.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-medium">
                    No tienes exámenes programados por el momento.
                </div>
            ) : (
                <div className="space-y-4">
                    <ReporteLista titulo="Exámenes del estudiante" contenido={() => <>{listExamenes.map((ex) => (
                        <div
                            key={ex.id}
                            className="bg-white hover:border-blue-300 border border-slate-200/80 rounded-xl p-5 transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs group"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md tracking-wide border ${ex.estado === "HABILITADO"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}>
                                        {textoInterfaz(ex.estado)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">• {ex.fecha}</span>
                                </div>

                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1763C6] transition-colors">
                                    {textoInterfaz(ex.materia)}
                                </h3>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span><strong className="text-slate-700">Docente:</strong> {ex.docente}</span>
                                    <span>•</span>
                                    <span><strong className="text-slate-700">Ambiente:</strong> {ex.ambiente}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 group-hover:bg-blue-50/40 px-4 py-3 rounded-xl border border-slate-200/70 text-left md:text-right self-stretch md:self-auto flex flex-col justify-center transition-colors">
                                <span className="text-[10px] text-slate-400 font-bold tracking-wider">Horario de Ingreso</span>
                                <span className="text-xs font-mono font-extrabold text-slate-800 mt-0.5">{ex.hora}</span>
                            </div>
                        </div>
                    ))}</>} />
{listExamenes.map((ex) => (
                        <div
                            key={ex.id}
                            className="bg-white hover:border-blue-300 border border-slate-200/80 rounded-xl p-5 transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs group"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md tracking-wide border ${ex.estado === "HABILITADO"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}>
                                        {textoInterfaz(ex.estado)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">• {ex.fecha}</span>
                                </div>

                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1763C6] transition-colors">
                                    {textoInterfaz(ex.materia)}
                                </h3>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span><strong className="text-slate-700">Docente:</strong> {ex.docente}</span>
                                    <span>•</span>
                                    <span><strong className="text-slate-700">Ambiente:</strong> {ex.ambiente}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 group-hover:bg-blue-50/40 px-4 py-3 rounded-xl border border-slate-200/70 text-left md:text-right self-stretch md:self-auto flex flex-col justify-center transition-colors">
                                <span className="text-[10px] text-slate-400 font-bold tracking-wider">Horario de Ingreso</span>
                                <span className="text-xs font-mono font-extrabold text-slate-800 mt-0.5">{ex.hora}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}