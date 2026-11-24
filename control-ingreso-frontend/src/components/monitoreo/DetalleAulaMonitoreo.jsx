import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronLeft, Search, Download, RefreshCw, WifiOff, CheckCircle2 } from "lucide-react";
import {
    obtenerAsistentesAula,
    descargarAsistentesCsv,
    esEndpointNoDisponible,
} from "../../services/monitoreoService";
import usePolling from "../../hooks/usePolling";
import { ESTADOS_ASISTENTE, estiloOcupacion, normalizarAsistentes, textoBusqueda } from "./utilidadesMonitoreo";

const POR_PAGINA = 10;
const FILTROS = [
    { clave: "TODOS", etiqueta: "Todos", total: "todos" },
    { clave: "PRESENTE", etiqueta: "Presentes", total: "presentes" },
    { clave: "EXCEPCIONAL", etiqueta: "Excepcionales", total: "excepcionales" },
    { clave: "AUSENTE", etiqueta: "Ausentes", total: "ausentes" },
    { clave: "RETIRADO", etiqueta: "Retirados", total: "retirados", soloSiHay: true },
];

function Dato({ titulo, valor, tono = "text-slate-800" }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 min-w-0">
            <p className="text-[10px] font-extrabold text-slate-500 tracking-wide truncate">{titulo}</p>
            <p className={`text-xl font-black tabular-nums ${tono}`}>{textoInterfaz(valor)}</p>
        </div>
    );
}

/**
 * Detalle de un aula (mockup 10-B): totales, lista de asistentes con filtro,
 * búsqueda y paginación, y exportación CSV. La lista muestra el aula asignada
 * de cada estudiante y la nueva aula de los reubicados (criterios de QA).
 *   aula  → la tarjeta del tablero (idAmbiente, aula, ubicacion, capacidad, ...)
 *   boolCerradoInicial → true si ya pasó la hora de fin del aula (dato de la HU06)
 *
 * El cierre manual del ingreso NO forma parte de los criterios de la HU10: se quitó.
 */
export default function DetalleAulaMonitoreo({ examen, aula, boolCerradoInicial, onVolver }) {
    const [detalle, setDetalle] = useState(null);
    const [strEstado, setStrEstado] = useState("cargando"); // cargando | ok | noDisponible | error
    const [strError, setStrError] = useState("");
    const [boolSinConexion, setBoolSinConexion] = useState(false);
    const boolCerrado = Boolean(boolCerradoInicial);

    const [strFiltro, setStrFiltro] = useState("TODOS");
    const [strBusqueda, setStrBusqueda] = useState("");
    const [intPagina, setIntPagina] = useState(1);

    const [boolExportando, setBoolExportando] = useState(false);
    const [strAviso, setStrAviso] = useState({ tipo: "", texto: "" });
    const refAviso = useRef(null);
    const refSolicitud = useRef(null);
    // Si ya hay una lista cargada y una actualización falla, se conserva (no se borra la tabla)
    const refHayLista = useRef(false);

    const idExamen = examen.idExamen;
    const idAmbiente = aula.idAmbiente;

    const fnActualizar = useCallback(async () => {
        refSolicitud.current?.abort();
        const ctrl = new AbortController();
        refSolicitud.current = ctrl;
        try {
            const datos = normalizarAsistentes(await obtenerAsistentesAula(idAmbiente, idExamen, { signal: ctrl.signal }));
            setDetalle(datos);
            refHayLista.current = true;
            setStrEstado("ok");
            setBoolSinConexion(false);
            setStrError("");
        } catch (err) {
            if (err?.name === "AbortError") return;
            if (esEndpointNoDisponible(err)) setStrEstado("noDisponible");
            else if (refHayLista.current) setBoolSinConexion(true); // conserva la lista anterior
            else setStrEstado("error");
            setStrError(err.message || "No se pudo cargar la lista del aula.");
        }
    }, [idAmbiente, idExamen]);

    usePolling(fnActualizar, 15000, { boolActivo: strEstado !== "noDisponible", clave: `${idExamen}-${idAmbiente}` });
    useEffect(() => () => {
        refSolicitud.current?.abort();
        clearTimeout(refAviso.current);
    }, []);

    const fnAviso = (tipo, texto) => {
        setStrAviso({ tipo, texto });
        clearTimeout(refAviso.current);
        refAviso.current = setTimeout(() => setStrAviso({ tipo: "", texto: "" }), 6000);
    };

    // Totales: los del backend si hay lista; si no, los del tablero (siempre disponibles)
    const t = detalle?.totales;
    const intAsignados = t ? t.asignados : aula.asignados ?? 0;
    const intPresentes = t ? t.presentesTotal : aula.ingresados ?? 0;
    const intExcepcionales = t ? t.excepcionales : null;
    const intAusentes = t ? t.ausentes : aula.pendientes ?? 0;

    const filtrados = useMemo(() => {
        if (!detalle) return [];
        const q = textoBusqueda(strBusqueda.trim());
        return detalle.asistentes.filter(
            (a) =>
                (strFiltro === "TODOS" || a.estado === strFiltro) &&
                (!q || [a.nombre, a.codSis].some((v) => textoBusqueda(v).includes(q)) || textoBusqueda(a.observacion).includes(q))
        );
    }, [detalle, strFiltro, strBusqueda]);

    const intPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const intPaginaVisible = Math.min(intPagina, intPaginas);
    const visibles = filtrados.slice((intPaginaVisible - 1) * POR_PAGINA, intPaginaVisible * POR_PAGINA);

    const fnExportar = async () => {
        if (boolExportando) return;
        setBoolExportando(true);
        try {
            const blob = await descargarAsistentesCsv(idAmbiente, idExamen);
            const url = URL.createObjectURL(blob);
            const enlace = document.createElement("a");
            enlace.href = url;
            enlace.download = `asistentes-${String(aula.aula).toLowerCase().replace(/\s+/g, "-")}.csv`;
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
            URL.revokeObjectURL(url);
            fnAviso("ok", "Lista exportada. La descarga quedó registrada en auditoría.");
        } catch (err) {
            fnAviso("error", esEndpointNoDisponible(err) ? "La exportación todavía no está disponible en el backend." : err.message || "No se pudo exportar la lista.");
        } finally {
            setBoolExportando(false);
        }
    };

    const estilo = estiloOcupacion(aula);
    const strDocente = detalle?.docente || aula.docenteResponsable || aula.docente;
    const strUbicacion = detalle?.ubicacion || aula.ubicacion;

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* Migas + volver */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
                <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-[#2563EB] hover:underline cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> Monitoreo
                </button>
                <span>/</span>
                <span className="truncate">{examen.asignatura}</span>
                <span>/</span>
                <span className="text-slate-800">{aula.aula}</span>
            </div>

            {/* Cabecera */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-black text-[#003770]">{aula.aula}</h3>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${boolCerrado ? "bg-slate-800 text-white" : estilo.pill}`}>
                                {textoInterfaz(boolCerrado ? "Ingreso finalizado" : estilo.etiqueta)}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                            {[strUbicacion, strDocente ? `Docente: ${strDocente}` : null].filter(Boolean).join(" · ") || "Sin ubicación registrada"}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold ${boolCerrado ? "text-slate-600" : "text-emerald-700"}`}>
                            <i className={`w-2 h-2 rounded-full ${boolCerrado ? "bg-slate-400" : "bg-emerald-500"}`} />
                            {boolCerrado ? "Ingreso finalizado (pasó la hora de fin)" : "Ingreso abierto"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Dato titulo="Asignados" valor={intAsignados} />
                    <Dato titulo="Presentes" valor={intPresentes} tono="text-emerald-700" />
                    <Dato titulo="Excepcionales" valor={intExcepcionales ?? "—"} tono="text-amber-700" />
                    <Dato titulo="Ausentes" valor={intAusentes} tono="text-slate-600" />
                </div>
            </div>

            {strAviso.texto && (
                <div role="status" className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${strAviso.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                    {strAviso.tipo === "ok" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    <span>{textoInterfaz(strAviso.tipo === "ok" ? "" : "✕ ")}{textoInterfaz(strAviso.texto)}</span>
                </div>
            )}

            {/* Lista de asistentes */}
            <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 min-w-0" aria-label="Lista de asistentes">
                {strEstado === "cargando" && <p className="text-xs text-slate-400 font-semibold py-10 text-center animate-pulse">Cargando la lista del aula...</p>}
                {strEstado === "noDisponible" && (
                    <p className="text-xs text-slate-500 font-semibold py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 px-4">
                        La lista de asistentes se activará cuando el backend publique el endpoint de asistentes. Los totales de arriba vienen del tablero.
                    </p>
                )}
                {strEstado === "error" && (
                    <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 flex-wrap">
                        <span>✕ {textoInterfaz(strError)}</span>
                        <button type="button" onClick={fnActualizar} className="underline cursor-pointer">Reintentar</button>
                    </div>
                )}

                {strEstado === "ok" && detalle && (
                    <>
                        {boolSinConexion && (
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full border bg-rose-50 border-rose-200 text-rose-700">
                                <WifiOff className="w-3.5 h-3.5" /> Sin conexión, mostrando la última lista cargada
                            </p>
                        )}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por estado">
                                {FILTROS.filter((f) => !f.soloSiHay || detalle.totales[f.total] > 0).map((f) => (
                                    <button
                                        key={f.clave} type="button" role="tab" aria-selected={strFiltro === f.clave}
                                        onClick={() => { setStrFiltro(f.clave); setIntPagina(1); }}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border cursor-pointer transition ${strFiltro === f.clave ? "bg-[#1A365D] border-[#1A365D] text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        {textoInterfaz(f.etiqueta)} <span className="tabular-nums opacity-80">{detalle.totales[f.total]}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#2563EB] flex-1 lg:w-64">
                                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <input
                                        type="search" value={strBusqueda} onChange={(e) => { setStrBusqueda(e.target.value); setIntPagina(1); }}
                                        placeholder="Buscar por nombre o SIS" aria-label="Buscar por nombre o SIS"
                                        className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                    />
                                </label>
                                <button
                                    type="button" onClick={fnExportar} disabled={boolExportando}
                                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
                                >
                                    {boolExportando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    Exportar CSV
                                </button>
                            </div>
                        </div>

                        {detalle.asistentes.length === 0 ? (
                            <p className="text-xs text-slate-400 font-semibold py-8 text-center">Esta aula no tiene estudiantes asignados todavía.</p>
                        ) : filtrados.length === 0 ? (
                            <p className="text-xs text-slate-400 font-semibold py-8 text-center">Ningún estudiante coincide con el filtro.</p>
                        ) : (
                            <div className="overflow-x-auto -mx-1 px-1">
                                <table className="w-full text-xs min-w-[640px]">
                                    <thead>
                                        <tr className="text-left text-[10.5px] tracking-wide text-slate-500">
                                            {["Código SIS", "Estudiante", "Estado", "Hora", "Método", "Observación"].map((c) => (
                                                <th key={c} className="py-2 pr-3 font-extrabold">{c}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibles.map((a) => {
                                            const est = ESTADOS_ASISTENTE[a.estado] || { etiqueta: a.estado || "—", clase: "bg-slate-100 text-slate-600" };
                                            return (
                                                <tr key={`${a.codSis}-${a.estado}`} className="border-t border-slate-100">
                                                    <td className="py-2 pr-3 font-bold tabular-nums text-slate-600">{a.codSis}</td>
                                                    <td className="py-2 pr-3 font-bold text-slate-800">{textoInterfaz(a.nombre)}</td>
                                                    <td className="py-2 pr-3"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${est.clase}`}>{textoInterfaz(est.etiqueta)}</span></td>
                                                    <td className="py-2 pr-3 tabular-nums text-slate-600">{a.hora}</td>
                                                    <td className="py-2 pr-3 text-slate-600">{textoInterfaz(a.metodo)}</td>
                                                    <td className="py-2 text-slate-600">{a.observacion}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {filtrados.length > 0 && (
                            <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-bold text-slate-500 pt-1">
                                <span>Mostrando {visibles.length} de {filtrados.length}</span>
                                <div className="flex items-center gap-1.5">
                                    <button type="button" onClick={() => setIntPagina(intPaginaVisible - 1)} disabled={intPaginaVisible <= 1}
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer">Anterior</button>
                                    <span className="tabular-nums">{intPaginaVisible} / {intPaginas}</span>
                                    <button type="button" onClick={() => setIntPagina(intPaginaVisible + 1)} disabled={intPaginaVisible >= intPaginas}
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer">Siguiente</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

        </div>
    );
}
