import React, { useState } from "react";
import { Upload, Database, Info, ArrowRight, FileWarning, X, LayoutGrid, BookOpen } from "lucide-react";

const FORMATO_COLUMNAS = [
    { col: "A", nombre: "CODSISS", ejemplo: "202309099" },
    { col: "B", nombre: "CORREO", ejemplo: "202309099@est.umss.edu" },
    { col: "C", nombre: "CI", ejemplo: "7338351" },
    { col: "D", nombre: "APELLIDOS", ejemplo: "Balderrama Puyal" },
    { col: "E", nombre: "NOMBRES", ejemplo: "Ivan Raul" },
    { col: "F", nombre: "CARRERA", ejemplo: "Ing. Sistemas" },
];

// Mock temporal: el backend reemplazará esto con la lista real de materias.
const MATERIAS_MOCK = [
    "Cálculo I",
    "Programación I",
    "Estructuras de Datos",
    "Base de Datos I",
    "Redes de Computadoras",
    "Ingeniería de Software I",
];

const EXTENSIONES_VALIDAS = [".xlsx", ".pdf"];

function obtenerExtension(nombreArchivo) {
    const idx = nombreArchivo.lastIndexOf(".");
    return idx === -1 ? "" : nombreArchivo.slice(idx).toLowerCase();
}

export default function BulkUploadCard({ onProcesar }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const [mostrarFormato, setMostrarFormato] = useState(false);
    const [materia, setMateria] = useState("");

    const validarYAsignar = (archivo) => {
        if (!archivo) return;
        const ext = obtenerExtension(archivo.name);
        if (!EXTENSIONES_VALIDAS.includes(ext)) {
            setFile(null);
            setError("Formato no válido. Solo se aceptan archivos .XLSX o .PDF.");
            return;
        }
        setError("");
        setFile(archivo);
    };

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
            validarYAsignar(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            validarYAsignar(e.target.files[0]);
        }
        // Permite volver a seleccionar el mismo archivo tras un error
        e.target.value = "";
    };

    return (
        <div className="lg:col-span-5 bg-bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between relative">
            <div>
                {/* Cabecera Tarjeta */}
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-blue text-bg-card flex items-center justify-center shadow-xs">
                            <Upload className="w-5 h-5" />
                        </div>
                        <h2 className="text-sub font-extrabold text-primary-navy">
                            Carga de Estudiantes al Sistema
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMostrarFormato(true)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-blue/30 text-primary-blue text-badge font-bold hover:bg-primary-blue/5 transition-colors"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Formato
                    </button>
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

                {/* Mensaje de error de validación */}
                {error && (
                    <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent-red/10 border border-accent-red/30">
                        <FileWarning className="w-4 h-4 text-accent-red mt-0.5 shrink-0" />
                        <p className="text-badge text-accent-red font-semibold leading-snug">{error}</p>
                    </div>
                )}
            </div>

            <div className="mt-6 space-y-3">
                {/* Combobox de asignatura (mock, el backend lo conectará a la BD real) */}
                <div>
                    <label className="block text-badge font-bold text-primary-navy mb-1.5">
                        Asignatura
                    </label>
                    <div className="relative">
                        <BookOpen className="w-4 h-4 text-primary-blue absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={materia}
                            onChange={(e) => setMateria(e.target.value)}
                            className="w-full appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-border bg-bg-app text-secondary font-semibold text-primary-navy focus:outline-none focus:ring-2 focus:ring-primary-blue/40 cursor-pointer"
                        >
                            <option value="" disabled>
                                Selecciona una asignatura
                            </option>
                            {MATERIAS_MOCK.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                        <svg
                            className="w-4 h-4 text-text-body/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Botón Inferior idéntico a "+ Nuevo Usuario" */}
                <button
                    onClick={() => onProcesar && onProcesar(file, materia)}
                    disabled={!file || !materia}
                    className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-slate-900 hover:from-blue-700 hover:to-slate-950 text-white font-bold text-secondary rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-slate-900"
                >
                    <Database className="w-4 h-4" />
                    <span>Procesar y Guardar Datos</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                </button>
            </div>

            {/* Modal: Guía de formato de subida */}
            {mostrarFormato && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-navy/40 backdrop-blur-sm"
                    onClick={() => setMostrarFormato(false)}
                >
                    <div
                        className="bg-bg-card rounded-2xl shadow-lg border border-border max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sub font-extrabold text-primary-navy">
                                Formato de subida
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMostrarFormato(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-text-body/60 hover:bg-bg-app transition-colors"
                                aria-label="Cerrar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-secondary text-text-body/70 mb-4 leading-relaxed">
                            Ya sea en Excel (.XLSX) o PDF, el archivo debe organizar la información de cada
                            estudiante en columnas, respetando exactamente este orden:
                        </p>

                        <div className="rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-bg-app">
                                        <th className="px-3 py-2 text-badge font-bold text-primary-navy w-10">
                                            Col.
                                        </th>
                                        <th className="px-3 py-2 text-badge font-bold text-primary-navy">
                                            Encabezado
                                        </th>
                                        <th className="px-3 py-2 text-badge font-bold text-primary-navy">
                                            Ejemplo
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {FORMATO_COLUMNAS.map((c, i) => (
                                        <tr key={c.col} className={i % 2 === 1 ? "bg-bg-app/50" : ""}>
                                            <td className="px-3 py-2 text-badge font-bold text-primary-blue">
                                                {c.col}
                                            </td>
                                            <td className="px-3 py-2 text-badge font-bold text-text-body">
                                                {c.nombre}
                                            </td>
                                            <td className="px-3 py-2 text-badge text-text-body/70">
                                                {c.ejemplo}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="mt-4 space-y-1.5 text-badge text-text-body/70 leading-relaxed list-disc pl-4">
                            <li>La primera fila debe contener los encabezados tal como se muestran arriba.</li>
                            <li>No dejes columnas vacías ni cambies el orden de las columnas.</li>
                            <li>En archivos PDF, la información debe presentarse como una tabla con las mismas columnas.</li>
                        </ul>

                        <button
                            type="button"
                            onClick={() => setMostrarFormato(false)}
                            className="mt-5 w-full py-2.5 px-5 bg-primary-blue hover:bg-primary-blue/90 text-white font-bold text-badge rounded-xl transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
