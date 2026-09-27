import React, { useState, useEffect } from "react";
import { Upload, Database, Info, ArrowRight, FileWarning, X, LayoutGrid, BookOpen, CheckCircle, Loader2, GraduationCap, Users, Download } from "lucide-react";
import { obtenerTodasAsignaturas } from "../../../services/asignaturaService";

const FORMATO_COLUMNAS = [
    { col: "A", nombre: "CODSISS", ejemplo: "202309099" },
    { col: "B", nombre: "CORREO", ejemplo: "202309099@est.umss.edu" },
    { col: "C", nombre: "CI", ejemplo: "7338351" },
    { col: "D", nombre: "APELLIDOS", ejemplo: "Balderrama Puyal" },
    { col: "E", nombre: "NOMBRES", ejemplo: "Ivan Raul" },
    { col: "F", nombre: "TELEFONO", ejemplo: "70756498" },
];

const EXTENSIONES_VALIDAS = [".xlsx", ".pdf"];

// Plantilla de Excel embebida en Base64 para que el usuario la descargue como guía de formato.
const PLANTILLA_XLSX_BASE64 = "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";
const PLANTILLA_NOMBRE_ARCHIVO = "plantilla_carga.xlsx";
const PLANTILLA_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function obtenerExtension(nombreArchivo) {
    const idx = nombreArchivo.lastIndexOf(".");
    return idx === -1 ? "" : nombreArchivo.slice(idx).toLowerCase();
}

export default function BulkUploadCard({ onProcesar }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const [resultado, setResultado] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mostrarFormato, setMostrarFormato] = useState(false);
    const [materia, setMateria] = useState("");
    const [tipoCarga, setTipoCarga] = useState("estudiantes"); // "estudiantes" | "docentes"
    const [arrAsignaturas, setArrAsignaturas] = useState([]);

    const esCargaDocentes = tipoCarga === "docentes";

    // BUG-003 (QA): el desplegable mostraba materias inventadas (MATERIAS_MOCK)
    // en vez de las asignaturas reales de la BD.
    useEffect(() => {
        obtenerTodasAsignaturas()
            .then(setArrAsignaturas)
            .catch(() => setArrAsignaturas([]));
    }, []);

    const validarYAsignar = (archivo) => {
        if (!archivo) return;
        const ext = obtenerExtension(archivo.name);
        if (!EXTENSIONES_VALIDAS.includes(ext)) {
            setFile(null);
            setError("Formato no válido. Solo se aceptan archivos Excel (.XLSX) o .PDF.");
            setResultado(null);
            return;
        }
        setError("");
        setResultado(null);
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
        e.target.value = "";
    };

    const handleCambiarTipoCarga = (tipo) => {
        setTipoCarga(tipo);
        if (tipo === "docentes") {
            // El combobox de asignatura es exclusivo para estudiantes.
            setMateria("");
        }
    };

    const handleProcesarSubmit = async () => {
        if (!file) return;
        setIsSubmitting(true);
        setError("");
        setResultado(null);

        try {
            if (onProcesar) {
                const res = await onProcesar(file, materia, tipoCarga);
                setResultado(res);
                setFile(null);
            }
        } catch (err) {
            setError(err.message || "Ocurrió un error al procesar la carga masiva.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const boolHuboFallos = (resultado?.fallidos || 0) > 0;

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
                            Carga de {esCargaDocentes ? "Docentes" : "Estudiantes"} al Sistema
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

                <p className="text-secondary text-text-body/70 mb-4 leading-relaxed">
                    Sube un archivo en formato .XLSX o .PDF para cargar múltiples {esCargaDocentes ? "docentes" : "estudiantes"} al sistema.
                </p>

                {/* Selector de tipo de carga */}
                <div className="mb-4">
                    <label className="block text-badge font-bold text-primary-navy mb-1.5">
                        ¿Qué vas a cargar?
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-bg-app rounded-xl border border-border">
                        <button
                            type="button"
                            onClick={() => handleCambiarTipoCarga("estudiantes")}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-badge font-bold transition-colors ${!esCargaDocentes
                                ? "bg-primary-blue text-bg-card shadow-sm"
                                : "text-text-body/60 hover:text-primary-navy"
                                }`}
                        >
                            <GraduationCap className="w-4 h-4" />
                            Estudiantes
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCambiarTipoCarga("docentes")}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-badge font-bold transition-colors ${esCargaDocentes
                                ? "bg-primary-blue text-bg-card shadow-sm"
                                : "text-text-body/60 hover:text-primary-navy"
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Docentes
                        </button>
                    </div>
                </div>

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

                {/* Resultado del procesamiento: totales + detalle de CADA fila
                    fallida (BUG-010 QA: antes solo se leía detallesErrores[0]
                    y siempre se pintaba de verde, incluso con fallos). */}
                {resultado && (
                    <div className={`mt-3 rounded-xl border p-3 ${boolHuboFallos
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-emerald-500/10 border-emerald-500/30"
                        }`}>
                        <div className="flex items-start gap-2">
                            {boolHuboFallos ? (
                                <FileWarning className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            ) : (
                                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            )}
                            <p className={`text-badge font-semibold leading-snug ${boolHuboFallos ? "text-amber-700" : "text-emerald-700"}`}>
                                {resultado.mensaje || "Carga masiva procesada."}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 mt-2 pl-6 text-badge font-bold">
                            <span className="text-text-body/70">Total: {resultado.totalProcesados ?? 0}</span>
                            <span className="text-emerald-700">Exitosos: {resultado.exitosos ?? 0}</span>
                            <span className={boolHuboFallos ? "text-accent-red" : "text-text-body/70"}>
                                Fallidos: {resultado.fallidos ?? 0}
                            </span>
                        </div>

                        {boolHuboFallos && resultado.detallesErrores?.length > 0 && (
                            <ul className="mt-2 pl-6 space-y-1 max-h-40 overflow-y-auto">
                                {resultado.detallesErrores.map((err, idx) => (
                                    <li key={idx} className="text-badge text-accent-red">
                                        Fila {err.fila}
                                        {err.correo ? ` (${err.correo})` : ""}: {Array.isArray(err.errores) ? err.errores.join(", ") : err.errores}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Mensaje de error de validación */}
                {error && (
                    <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent-red/10 border border-accent-red/30">
                        <FileWarning className="w-4 h-4 text-accent-red mt-0.5 shrink-0" />
                        <p className="text-badge text-accent-red font-semibold leading-snug">{error}</p>
                    </div>
                )}
            </div>

            <div className="mt-6 space-y-3">
                {/* Combobox de asignatura (exclusivo para carga de estudiantes) */}
                <div>
                    <label className={`block text-badge font-bold mb-1.5 ${esCargaDocentes ? "text-text-body/40" : "text-primary-navy"}`}>
                        Asignatura (Opcional)
                    </label>
                    <div className="relative">
                        <BookOpen className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${esCargaDocentes ? "text-text-body/30" : "text-primary-blue"}`} />
                        <select
                            value={materia}
                            onChange={(e) => setMateria(e.target.value)}
                            disabled={esCargaDocentes}
                            className={`w-full appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-border bg-bg-app text-secondary font-semibold focus:outline-none focus:ring-2 focus:ring-primary-blue/40 ${esCargaDocentes
                                ? "text-text-body/40 cursor-not-allowed"
                                : "text-primary-navy cursor-pointer"
                                }`}
                        >
                            <option value="">
                                {esCargaDocentes ? "No aplica para docentes" : "Selecciona una asignatura"}
                            </option>
                            {arrAsignaturas.map((a) => (
                                <option key={a.idAsignatura} value={a.idAsignatura}>
                                    {a.nombreAsignatura}
                                </option>
                            ))}
                        </select>
                        <svg
                            className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${esCargaDocentes ? "text-text-body/30" : "text-text-body/60"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Botón Inferior */}
                <button
                    onClick={handleProcesarSubmit}
                    disabled={!file || isSubmitting}
                    className="w-full py-3 px-5 bg-gradient-to-r from-blue-600 to-slate-900 hover:from-blue-700 hover:to-slate-950 text-white font-bold text-secondary rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-slate-900"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Procesando archivo...</span>
                        </>
                    ) : (
                        <>
                            <Database className="w-4 h-4" />
                            <span>Procesar y Guardar Datos</span>
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                    )}
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
                            usuario en columnas, respetando este orden:
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
                            <li>No deje columnas vacías ni cambie el orden de las columnas.</li>
                            <li>En archivos PDF, la información debe presentarse como una tabla con las mismas columnas.</li>
                        </ul>

                        {/* Descarga de plantilla Excel */}
                        <a
                            href={`data:${PLANTILLA_XLSX_MIME};base64,${PLANTILLA_XLSX_BASE64}`}
                            download={PLANTILLA_NOMBRE_ARCHIVO}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl border border-primary-blue/30 text-primary-blue font-bold text-badge hover:bg-primary-blue/5 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Descargar plantilla de ejemplo (.XLSX)
                        </a>

                        <button
                            type="button"
                            onClick={() => setMostrarFormato(false)}
                            className="mt-3 w-full py-2.5 px-5 bg-primary-blue hover:bg-primary-blue/90 text-white font-bold text-badge rounded-xl transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
