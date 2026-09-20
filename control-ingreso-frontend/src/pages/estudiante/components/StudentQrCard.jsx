import React from "react";

export default function StudentQrCard({ usuario }) {
    const strNombre = usuario?.nombre || "Estudiante";
    const strApellido = usuario?.apellido || "";
    const codigoSis = usuario?.codigoSis || "202308123";

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Credencial Digital</h3>
                    <p className="text-xs text-slate-400">Código de acceso oficial</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Activo
                </span>
            </div>

            <div className="flex flex-col items-center justify-center bg-slate-50/80 border border-slate-200/60 rounded-xl p-6 text-center space-y-4">
                <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                    <div className="w-full h-full bg-[#021B3B] rounded-lg flex flex-col items-center justify-center text-white font-mono p-3 text-center shadow-inner">
                        <span className="text-[10px] text-blue-300 font-sans tracking-widest uppercase mb-1">SCAN QR</span>
                        <span className="text-sm font-bold tracking-wider">{codigoSis}</span>
                    </div>
                </div>
                <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
                    Aproxímalo al lector de ingreso en la puerta del aula asignada.
                </p>
            </div>

            <div className="space-y-2.5 pt-1 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Estudiante:</span>
                    <span className="font-bold text-slate-700">{`${strNombre} ${strApellido}`}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400 font-medium">Código SIS:</span>
                    <span className="font-mono font-bold text-[#1763C6] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{codigoSis}</span>
                </div>
            </div>
        </div>
    );
}
