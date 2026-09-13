import React from "react";
import { Upload, Database, Info } from "lucide-react";

export default function BulkUploadCard() {
    return (
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div>
                {/* Cabecera Tarjeta */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-xs">
                            <Upload className="w-5 h-5" />
                        </div>
                        <h2 className="text-base font-bold text-[#021B3B]">Carga Masiva de Estudiantes</h2>
                    </div>
                    <span className="text-[11px] font-bold text-[#0066FF] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                        HU-01
                    </span>
                </div>

                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                    Sube un archivo en formato .XLSX o .PDF para cargar múltiples estudiantes al sistema.
                </p>

                {/* Area Drop Zone */}
                <div className="border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center bg-[#F8FAFC] hover:bg-blue-50/30 transition-colors cursor-pointer flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-[#0066FF] mb-3">
                        <Upload className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <p className="text-xs font-bold text-[#021B3B]">
                        Arrastra y suelta tu archivo aquí
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">o haz clic para seleccionar</p>

                    {/* Formatos Aceptados */}
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <span className="px-3 py-1 bg-[#00B87C] text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                            .XLSX
                        </span>
                        <span className="px-3 py-1 bg-[#FF3B30] text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                            .PDF
                        </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1 font-medium">
                        Tamaño máximo por archivo: <span className="font-bold text-slate-600">10 MB</span>
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                    </p>
                </div>
            </div>

            {/* Botón Inferior "Procesar y Guardar en BD" */}
            <div className="mt-6">
                <button className="w-full py-3.5 px-4 bg-[#021B3B] hover:bg-[#011229] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]">
                    <Database className="w-4 h-4" />
                    <span>Procesar y Guardar en BD</span>
                    <span className="text-sm leading-none ml-1">→</span>
                </button>
            </div>
        </div>
    );
}