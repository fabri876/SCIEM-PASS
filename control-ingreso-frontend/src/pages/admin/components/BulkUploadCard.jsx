import React, { useState } from "react";
import { Upload, Database, Info, ArrowRight } from "lucide-react";

export default function BulkUploadCard({ onProcesar }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="lg:col-span-5 bg-bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between">
            <div>
                {/* Cabecera Tarjeta (sin la etiqueta HU-01) */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-primary-blue text-bg-card flex items-center justify-center shadow-xs">
                        <Upload className="w-5 h-5" />
                    </div>
                    <h2 className="text-sub font-extrabold text-primary-navy">
                        Carga Masiva de Estudiantes
                    </h2>
                </div>

                <p className="text-secondary text-text-body/70 mb-5 leading-relaxed">
                    Sube un archivo en formato .XLSX o .PDF para cargar múltiples estudiantes al sistema.
                </p>

                {/* Area Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed border-primary-blue/30 rounded-2xl p-6 text-center bg-bg-app hover:bg-primary-blue/5 transition-colors cursor-pointer flex flex-col items-center justify-center relative ${isDragging ? "border-primary-blue bg-primary-blue/10" : ""
                        }`}
                >
                    <input
                        type="file"
                        accept=".xlsx, .pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="w-12 h-12 bg-bg-card rounded-full shadow-md flex items-center justify-center text-primary-blue mb-3 border border-border">
                        <Upload className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <p className="text-secondary font-bold text-primary-navy">
                        {file ? file.name : "Arrastra y suelta tu archivo aquí"}
                    </p>
                    <p className="text-badge text-text-body/60 mt-0.5">
                        o haz clic para seleccionar
                    </p>

                    {/* Formatos Aceptados */}
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <span className="px-3 py-1 bg-emerald-600 text-bg-card text-badge font-bold rounded-md uppercase tracking-wider">
                            .XLSX
                        </span>
                        <span className="px-3 py-1 bg-accent-red text-bg-card text-badge font-bold rounded-md uppercase tracking-wider">
                            .PDF
                        </span>
                    </div>

                    <p className="text-badge text-text-body/60 mt-4 flex items-center justify-center gap-1 font-medium">
                        Tamaño máximo por archivo: <span className="font-bold text-text-body">10 MB</span>
                        <Info className="w-3.5 h-3.5 text-text-body/60" />
                    </p>
                </div>
            </div>

            {/* Botón Inferior idéntico a "+ Nuevo Usuario" */}
            <div className="mt-6">
                <button
                    onClick={() => onProcesar && onProcesar(file)}
                    className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-slate-900 hover:from-blue-700 hover:to-slate-950 text-white font-bold text-secondary rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                >
                    <Database className="w-4 h-4" />
                    <span>Procesar y Guardar en BD</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                </button>
            </div>
        </div>
    );
}