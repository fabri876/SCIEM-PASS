import { TablaConReporte } from '../../../components/common/ReporteLista.jsx';
import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import React, { useState, useEffect } from "react";
import { Upload, Database, Info, ArrowRight, FileWarning, X, CheckCircle, Loader2, GraduationCap, Users, Download, LayoutGrid } from "lucide-react";
import { previsualizarUsuariosMasivo } from "../../../services/usuarioService";
import { createPortal } from "react-dom";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import SeleccionGrupoLote from "../../../components/common/SeleccionGrupoLote";

const FORMATO_COLUMNAS = [
    { col: "A", nombre: "CODSIS", ejemplo: "202309099" },
    { col: "B", nombre: "CORREO", ejemplo: "202309099@est.umss.edu" },
    { col: "C", nombre: "CI", ejemplo: "7338351" },
    { col: "D", nombre: "APELLIDOS", ejemplo: "Balderrama Puyal" },
    { col: "E", nombre: "NOMBRES", ejemplo: "Ivan Raul" },
    { col: "F", nombre: "TELEFONO", ejemplo: "70756498" },
    { col: "G", nombre: "ID_ASIGNATURA", ejemplo: "10; 20 (IDs de ejemplo)" },
    { col: "H", nombre: "GRUPO", ejemplo: "2; 3" },
];

const EXTENSIONES_VALIDAS = [".xlsx", ".pdf"];
const TAMANO_MAXIMO_MB = 10;
const TAMANO_MAXIMO_BYTES = TAMANO_MAXIMO_MB * 1024 * 1024;

function obtenerExtension(nombreArchivo) {
    const idx = nombreArchivo.lastIndexOf(".");
    return idx === -1 ? "" : nombreArchivo.slice(idx).toLowerCase();
}

export default function BulkUploadCard({ onProcesar, soloEstudiantes = false }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const [resultado, setResultado] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [segundosGuardando, setSegundosGuardando] = useState(0);
    const [mostrarFormato, setMostrarFormato] = useState(false);
    const [vistaPrevia, setVistaPrevia] = useState(null);
    const [grupoLote, setGrupoLote] = useState(null);
    const [mismaCarrera,setMismaCarrera]=useState(false);

    const [tipoCarga, setTipoCarga] = useState("estudiantes"); // "estudiantes" | "docentes"

    const esCargaDocentes = tipoCarga === "docentes";
    useEffect(() => {
        if (!isSaving) return;
        const reloj = setInterval(() => setSegundosGuardando(s => s + 1), 1000);
        return () => clearInterval(reloj);
    }, [isSaving]);
    useEffect(() => {
        if (!vistaPrevia) return;
        const anterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const cerrar = e => { if (e.key === "Escape") setVistaPrevia(null); };
        document.addEventListener("keydown", cerrar);
        return () => { document.body.style.overflow = anterior; document.removeEventListener("keydown", cerrar); };
    }, [vistaPrevia, isSubmitting]);

    const validarYAsignar = (archivo) => {
        if (!archivo || isSubmitting) return;
        setVistaPrevia(null);
        const ext = obtenerExtension(archivo.name);
        if (!EXTENSIONES_VALIDAS.includes(ext)) {
            setFile(null);
            setError("Formato no válido. Solo se aceptan archivos Excel (.XLSX) o .PDF.");
            setResultado(null);
            return;
        }
        if (archivo.size > TAMANO_MAXIMO_BYTES) {
            setFile(null);
            setError(`El archivo supera el tamaño máximo permitido de ${TAMANO_MAXIMO_MB} MB. Por favor sube un archivo más liviano.`);
            setResultado(null);
            return;
        }
        setError("");
        setResultado(null);
        setFile(archivo);
        if (!esCargaDocentes && !grupoLote) setError("Seleccione la asignatura y el grupo del lote.");
        if (esCargaDocentes || grupoLote) handleRevisarArchivo(archivo);
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
        setResultado(null);
        setVistaPrevia(null);
        setFile(null); setGrupoLote(null); setError("");
    };

    const handleRevisarArchivo = async (archivo = file) => {
        if (!archivo || isSubmitting) return;
        if (!esCargaDocentes && !grupoLote) { setError("Seleccione la asignatura y el grupo del lote."); return; }
        setIsSubmitting(true); setError(""); setResultado(null);
        try {
            const preview = await previsualizarUsuariosMasivo(archivo, esCargaDocentes ? "DOCENTE" : "ESTUDIANTE", esCargaDocentes ? null : grupoLote.idGrupo);
            setVistaPrevia(preview);
        } catch (err) { setError(err.message || "No se pudo leer el archivo seleccionado."); }
        finally { setIsSubmitting(false); }
    };

    const handleProcesarSubmit = async () => {
        if (!file || isSubmitting) return;
        if (!esCargaDocentes && !grupoLote) { setError("Seleccione la asignatura y el grupo del lote."); return; }
        setIsSaving(true); setSegundosGuardando(0);
        setIsSubmitting(true);
        setError("");
        setResultado(null);

        try {
            if (onProcesar) {
                const res = await onProcesar(file, grupoLote?.idAsignatura || null, tipoCarga, null, esCargaDocentes ? null : grupoLote.idGrupo,esCargaDocentes || !mismaCarrera ? null : grupoLote.idCarrera);
                setResultado(res);
                setFile(null);
                setVistaPrevia(null);
            }
        } catch (err) {
            setError(err.message || "Ocurrió un error al procesar la carga masiva.");
        } finally {
            setIsSaving(false);
            setIsSubmitting(false);
        }
    };

    const boolHuboFallos = (resultado?.fallidos || 0) > 0;

    return (
        <div className="lg:col-span-5 bg-bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between relative">
            <div>
                <p className="text-sm text-secondary mb-2">Máximo 10 MB y 2000 filas por archivo. Divida listas mayores.</p>
                {!esCargaDocentes && <div className="mb-4 rounded-xl border border-border p-3 text-sm">
                    <label className="flex gap-2 items-start"><input type="checkbox" checked={mismaCarrera} disabled={isSubmitting} onChange={e=>setMismaCarrera(e.target.checked)} />Todos los estudiantes de este archivo pertenecen a la carrera seleccionada.</label>
                    <p className="mt-2">Si mezcla carreras, deje la casilla desmarcada. En Excel añada ID_CARRERA por estudiante nuevo o pendiente de completar. Las cuentas existentes conservan su carrera; todos pueden compartir asignatura y grupo. Para PDF use un lote de una sola carrera.</p>
                </div>}
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
                {!soloEstudiantes && <div className="mb-4">
                    <label className="block text-badge font-bold text-primary-navy mb-1.5">
                        ¿Qué vas a cargar?
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-bg-app rounded-xl border border-border">
                        <button
                            type="button"
                            onClick={() => handleCambiarTipoCarga("estudiantes")}
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-badge font-bold transition-colors ${esCargaDocentes
                                ? "bg-primary-blue text-bg-card shadow-sm"
                                : "text-text-body/60 hover:text-primary-navy"
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Docentes
                        </button>
                    </div>
                </div>}

                {!esCargaDocentes && <div className="mb-4 space-y-2">
                    <p className="text-secondary">Todos los estudiantes del archivo se inscriben en la asignatura y el grupo seleccionados.</p>
                    <SeleccionGrupoLote value={grupoLote} onChange={g => { setGrupoLote(g); setVistaPrevia(null); setError(""); }} disabled={isSubmitting} />
                </div>}

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
                        aria-label="Seleccionar archivo de usuarios"
                        disabled={isSubmitting}
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
                        <span className="px-3 py-1 bg-emerald-600 text-bg-card text-badge font-bold rounded-md tracking-wider">
                            .XLSX
                        </span>
                        <span className="px-3 py-1 bg-accent-red text-bg-card text-badge font-bold rounded-md tracking-wider">
                            .PDF
                        </span>
                    </div>

                    <p className="text-badge text-text-body/60 mt-4 flex items-center justify-center gap-1 font-medium">
                        Tamaño máximo por archivo: <span className="font-bold text-text-body">10 MB</span>
                        <Info className="w-3.5 h-3.5 text-text-body/60" />
                    </p>
                </div>

                {file && <div className="mt-3 rounded-xl bg-primary-blue/5 border border-primary-blue/20 p-3 text-secondary" role="status">
                    <p className="font-bold text-primary-navy break-all">Archivo seleccionado: {file.name}</p>
                    <p>{(file.size / 1024 / 1024).toFixed(2)} MB · Carga de {esCargaDocentes ? "docentes" : "estudiantes"}</p>
                </div>}

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
                                {textoInterfaz(resultado.mensaje || "Carga masiva procesada.")}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 mt-2 pl-6 text-badge font-bold">
                            <span className="text-text-body/70">Total: {resultado.totalProcesados ?? 0}</span>
                            <span className="text-emerald-700">Nuevos: {resultado.exitosos ?? 0}</span>
                            {(resultado.existentes || 0) > 0 && <span className="text-primary-navy">Filas de docentes existentes: {resultado.existentes}</span>}
                            <span className={boolHuboFallos ? "text-accent-red" : "text-text-body/70"}>
                                Fallidos: {resultado.fallidos ?? 0}
                            </span>
                        </div>

                        {resultado.avisos?.length > 0 && <ul className="mt-2 space-y-1 max-h-48 overflow-auto text-secondary">{resultado.avisos.map((aviso, i) => <li key={i}>{aviso}</li>)}</ul>}
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

                {esCargaDocentes ? <div className="rounded-xl bg-primary-blue/5 border border-primary-blue/20 p-4 text-secondary space-y-2">
                    <p className="font-bold text-primary-navy">Materias y grupos de cada {esCargaDocentes ? "docente" : "estudiante"}</p>
                    <p>Incluya ID_ASIGNATURA y GRUPO en cada fila del archivo. También puede usar CODIGO_ASIGNATURA o ASIGNATURA en lugar de ID_ASIGNATURA.</p>
                    <p>Para varias materias, separe ambas listas con punto y coma en el mismo orden. Registre primero el catálogo desde el horario PDF.</p>
                    <p>La plantilla contiene dos personas ficticias y los IDs 10 y 20 como ejemplo. Reemplace esos datos e IDs por los de su registro antes de cargarla.</p>
                </div> : <p className="rounded-xl bg-primary-blue/5 border border-primary-blue/20 p-4 text-secondary">El Excel de estudiantes contiene seis columnas, desde CODSIS hasta TELEFONO. La materia y el grupo se eligen arriba y se aplican a todo el lote.</p>}
                <button
                    onClick={() => handleRevisarArchivo()}
                    disabled={!file || isSubmitting || (!esCargaDocentes && !grupoLote)}
                    className="w-full py-3 px-5 bg-primary-blue hover:bg-primary-navy text-white font-bold text-secondary rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{isSaving ? `Registrando usuarios… ${segundosGuardando} s` : "Leyendo archivo..."}</span>
                        </>
                    ) : (
                        <>
                            <Database className="w-4 h-4" />
                            <span>Revisar registros antes de guardar</span>
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                    )}
                </button>
                {isSaving && <p role="status" className="text-secondary text-primary-navy">El guardado continúa aunque cierre la vista previa. El resultado se mostrará aquí al terminar. Tiempo transcurrido: {segundosGuardando} s.</p>}
            </div>

            {vistaPrevia && createPortal(<VentanaEmergente boolAbierto strMaxWidth="max-w-6xl" onCerrar={() => setVistaPrevia(null)}>
                <div className="p-5 sm:p-7 space-y-4" role="dialog" aria-modal="true" aria-labelledby="titulo-carga-usuarios">
                    <div className="flex items-start justify-between gap-3">
                        <div><h2 id="titulo-carga-usuarios" className="text-card-title font-extrabold text-primary-navy">Vista previa de {esCargaDocentes ? "docentes" : "estudiantes"}</h2>
                            <p className="text-secondary break-all">{vistaPrevia.archivo} · {vistaPrevia.filas.length} registros encontrados</p></div>
                        <button autoFocus type="button" aria-label="Cerrar vista previa" onClick={() => setVistaPrevia(null)} className="p-2 rounded-xl hover:bg-bg-app text-primary-navy"><X size={20} /></button>
                    </div>
                    <p className="text-secondary">{isSubmitting ? `Guardando ${vistaPrevia.filas.length} registros… ${segundosGuardando} s. Puede cerrar esta vista; el guardado continuará y verá el resultado en el panel.` : "Todavía no se ha registrado ningún usuario. Revise los datos y confirme para guardar; el sistema validará cada fila al realizar la carga."}</p>
                    {error && <p role="alert" className="text-accent-red font-bold">{error}</p>}
                    <div className="overflow-auto max-h-[55vh] border border-border rounded-xl" tabIndex={0} role="region" aria-label="Registros del archivo">
                        <TablaConReporte titulo="Previsualización de carga masiva">{(_paraReporte) => (<table className="w-full text-left text-secondary">
                            <thead className="sticky top-0 bg-bg-app text-primary-navy"><tr>{["Fila", "Nombre completo", "CI", "SIS", "Correo", "Teléfono", "Rol", "Asignatura", "Grupo"].map(t => <th key={t} className="p-3 whitespace-nowrap">{t}</th>)}</tr></thead>
                            <tbody>{vistaPrevia.filas.map(f => <tr key={f.fila} className="border-t border-border">
                                <td className="p-3">{f.fila}</td><td className="p-3 font-semibold text-primary-navy">{textoInterfaz(f.nombre)} {f.apellido}</td>
                                <td className="p-3">{f.ci || "Sin CI"}</td><td className="p-3">{f.codigoSis ?? "Sin SIS"}</td><td className="p-3">{f.correo || "Sin correo"}</td>
                                <td className="p-3">{f.telefono ?? "—"}</td><td className="p-3">{textoInterfaz(f.rol === "DOCENTE" ? "Docente" : f.rol === "ESTUDIANTE" ? "Estudiante" : f.rol)}</td>
                                <td className="p-3">{textoInterfaz(f.asignatura || grupoLote?.nombreAsignatura || "Sin asignación")}</td>
                                <td className="p-3">{f.grupo || grupoLote?.nombreGrupo || "Sin asignación"}</td>
                            </tr>)}</tbody>
                        </table>)}</TablaConReporte>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" onClick={() => setVistaPrevia(null)} className="px-4 py-2.5 rounded-xl border border-border text-primary-navy font-bold">{isSubmitting ? "Cerrar vista (el guardado continúa)" : "Volver sin guardar"}</button>
                        <button type="button" disabled={isSubmitting} onClick={handleProcesarSubmit} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-blue hover:bg-primary-navy text-white font-bold disabled:opacity-50">
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}Confirmar y registrar
                        </button>
                    </div>
                </div>
            </VentanaEmergente>, document.body)}

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
                                    {(esCargaDocentes ? FORMATO_COLUMNAS : FORMATO_COLUMNAS.slice(0, 6)).map((c, i) => (
                                        <tr key={c.col} className={i % 2 === 1 ? "bg-bg-app/50" : ""}>
                                            <td className="px-3 py-2 text-badge font-bold text-primary-blue">
                                                {c.col}
                                            </td>
                                            <td className="px-3 py-2 text-badge font-bold text-text-body">
                                                {textoInterfaz(c.nombre)}
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
                            <li>{esCargaDocentes ? "Para la materia, elija solo uno: ID_ASIGNATURA, CODIGO_ASIGNATURA o ASIGNATURA." : "Elija la asignatura y el grupo en los selectores antes de confirmar la carga."}</li>
                            <li>No deje columnas vacías ni cambie el orden de las columnas.</li>
                            <li>En archivos PDF, la información debe presentarse como una tabla con las mismas columnas.</li>
                        </ul>

                        {/* Descarga de plantilla Excel */}
                        <a
                            href={`${import.meta.env.BASE_URL}plantillas/plantilla-${tipoCarga}.xlsx`}
                            download={`plantilla-${tipoCarga}.xlsx`}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl border border-primary-blue/30 text-primary-blue font-bold text-badge hover:bg-primary-blue/5 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Descargar plantilla de {esCargaDocentes ? "docentes" : "estudiantes"} (.XLSX)
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
