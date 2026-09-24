import { useState, useEffect, useMemo } from "react";
import {
    obtenerExamenes,
    obtenerTiposExamen,
    obtenerNormasGenerales,
} from "../../../services/examenService";
import {
    obtenerDocentesAdmin,
    obtenerAmbientesPorExamen,
    obtenerNormasParticularesAdmin,
    crearNormaGeneralAdmin,
    editarNormaGeneralAdmin,
    eliminarNormaGeneralAdmin,
    promoverNormaEspecificaAdmin,
} from "../../../services/adminNormasService";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import ExamenFormAdmin from "./ExamenFormAdmin";

const INT_EXAMENES_POR_PAGINA = 10;

// Colores para agrupar visualmente normas particulares con texto idéntico
// (no necesariamente exacto: el admin puede notar a ojo que dos dicen lo
// mismo con otras palabras, pero el agrupado automático solo detecta texto
// igual una vez normalizado — ver normalizarTexto más abajo).
const PALETA_GRUPOS = ["#F0F5FB", "#FBF3E9", "#F1F8F1", "#FCEFF5", "#F5F1FB"];

function IconoMas() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
    );
}

function IconoOjo() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function IconoLapiz() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
    );
}

function IconoBasurero() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a1.5 1.5 0 0 1-1.5 1.4H8.2a1.5 1.5 0 0 1-1.5-1.4L6 7" />
            <path strokeLinecap="round" d="M10 11v6M14 11v6" />
        </svg>
    );
}

function IconoX() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

function IconoDocumento() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
        </svg>
    );
}

function IconoUbicacion() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.3" />
        </svg>
    );
}

function IconoNormas() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75h6a1 1 0 011 1v1.25H8V4.75a1 1 0 011-1z" />
            <rect x="6" y="5" width="12" height="15" rx="1.5" />
            <path strokeLinecap="round" d="M9 11h6M9 14.5h6M9 18h3.5" />
        </svg>
    );
}

function IconoFlechaOrden() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16m0 0l-3-3m3 3l3-3M17 20V4m0 0l3 3m-3-3l-3 3" />
        </svg>
    );
}

function IconoFlechaIzquierda() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
    );
}

function IconoFlechaDerecha() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
    );
}

function formatearFecha(strFechaIso) {
    if (!strFechaIso) return "-";
    const [anio, mes, dia] = strFechaIso.split("-");
    return `${dia}/${mes}/${anio}`;
}

function formatearDuracion(strDuracion) {
    // duracionExamen llega como "HH:mm:ss" (LocalTime)
    if (!strDuracion) return "-";
    const [hh, mm] = strDuracion.split(":");
    const partes = [];
    if (parseInt(hh, 10) > 0) partes.push(`${parseInt(hh, 10)}h`);
    if (parseInt(mm, 10) > 0) partes.push(`${parseInt(mm, 10)}min`);
    return partes.length > 0 ? partes.join(" ") : "-";
}

function normalizarTexto(strTexto) {
    return (strTexto || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Extrae la clave de comparación según el criterio elegido.
// "registro": cuándo se cargó el examen en el sistema (fechaCreacionExamen,
//   con idExamen como respaldo si esa fecha no viene en la respuesta).
// "examen": cuándo se rinde el examen (fechaExamen).
function obtenerClaveOrden(ex, strCriterio) {
    if (strCriterio === "examen") {
        return ex.fechaExamen || null;
    }
    return ex.fechaCreacionExamen || null;
}

function compararExamenes(a, b, strCriterio) {
    const claveA = obtenerClaveOrden(a, strCriterio);
    const claveB = obtenerClaveOrden(b, strCriterio);
    if (claveA && claveB && claveA !== claveB) {
        return claveA < claveB ? -1 : 1;
    }
    if (claveA && !claveB) return -1;
    if (!claveA && claveB) return 1;
    // Respaldo: por id autoincremental (más antiguo -> más nuevo)
    return (a.idExamen ?? 0) - (b.idExamen ?? 0);
}

const ETIQUETAS_ORDEN = {
    registro: { desc: "Más recientes primero", asc: "Más antiguos primero" },
    examen: { desc: "Fecha más lejana primero", asc: "Fecha más próxima primero" },
};

export default function SeccionRegistroExamenes() {
    const [strTabActiva, setStrTabActiva] = useState("examenes"); // "examenes" | "generales" | "particulares"

    const [arrExamenes, setArrExamenes] = useState([]);
    const [mapTiposExamen, setMapTiposExamen] = useState({});
    const [arrDocentes, setArrDocentes] = useState([]);
    const [arrNormasGenerales, setArrNormasGenerales] = useState([]);
    const [arrNormasParticulares, setArrNormasParticulares] = useState([]);

    const [boolCargando, setBoolCargando] = useState(true);
    const [boolModalAbierto, setBoolModalAbierto] = useState(false);
    const [examenEnDetalle, setExamenEnDetalle] = useState(null);

    const [strCriterioOrden, setStrCriterioOrden] = useState("registro"); // "registro" | "examen"
    const [strDireccionOrden, setStrDireccionOrden] = useState("desc"); // "desc" | "asc"
    const [intPaginaActual, setIntPaginaActual] = useState(1);

    // Ambientes (aulas asignadas) por examen, para la columna "Docente / Aula / Hora".
    // Se piden solo para los exámenes visibles en la página actual (10 como
    // máximo), no para los 200 de golpe, dado que el backend es lento.
    const [mapAmbientesPorExamen, setMapAmbientesPorExamen] = useState({});

    // Edición inline de normas generales
    const [idNormaGeneralEnEdicion, setIdNormaGeneralEnEdicion] = useState(null);
    const [strTextoEdicionGeneral, setStrTextoEdicionGeneral] = useState("");
    const [boolFormularioNuevaGeneralAbierto, setBoolFormularioNuevaGeneralAbierto] = useState(false);
    const [strNuevaDescripcionGeneral, setStrNuevaDescripcionGeneral] = useState("");
    const [strMensajeNormas, setStrMensajeNormas] = useState("");

    function cargarTodo() {
        setBoolCargando(true);

        Promise.all([
            obtenerExamenes(),
            obtenerTiposExamen(),
            obtenerDocentesAdmin(),
            obtenerNormasGenerales(),
            obtenerNormasParticularesAdmin(),
        ])
            .then(([examenes, tipos, docentes, normasGenerales, normasParticulares]) => {
                setArrExamenes(examenes || []);
                setIntPaginaActual(1);
                setMapAmbientesPorExamen({});

                const objMapTipo = {};
                (tipos || []).forEach((t) => {
                    objMapTipo[t.idTipoExamen] = t.nombreTipoExamen;
                });
                setMapTiposExamen(objMapTipo);

                setArrDocentes(docentes || []);
                setArrNormasGenerales(normasGenerales || []);
                setArrNormasParticulares(normasParticulares || []);
            })
            .catch(() => {
                setArrExamenes([]);
            })
            .finally(() => setBoolCargando(false));
    }

    useEffect(() => {
        cargarTodo();
    }, []);

    const mapDocentePorId = useMemo(() => {
        const mapa = {};
        arrDocentes.forEach((d) => {
            mapa[d.idUsuario] = `${d.nombre} ${d.apellido}`;
        });
        return mapa;
    }, [arrDocentes]);

    const mapExamenPorId = useMemo(() => {
        const mapa = {};
        arrExamenes.forEach((ex) => {
            mapa[ex.idExamen] = ex;
        });
        return mapa;
    }, [arrExamenes]);

    const arrExamenesOrdenados = useMemo(() => {
        const copia = [...arrExamenes].sort((a, b) => compararExamenes(a, b, strCriterioOrden));
        if (strDireccionOrden === "desc") copia.reverse();
        return copia;
    }, [arrExamenes, strCriterioOrden, strDireccionOrden]);

    const intTotalPaginas = Math.max(
        1,
        Math.ceil(arrExamenesOrdenados.length / INT_EXAMENES_POR_PAGINA)
    );

    // Si cambia el orden o la página quedó fuera de rango (p.ej. tras recargar
    // con menos exámenes), volvemos a una página válida.
    useEffect(() => {
        setIntPaginaActual((prev) => Math.min(prev, intTotalPaginas));
    }, [strCriterioOrden, strDireccionOrden, intTotalPaginas]);

    const arrExamenesPagina = arrExamenesOrdenados.slice(
        (intPaginaActual - 1) * INT_EXAMENES_POR_PAGINA,
        intPaginaActual * INT_EXAMENES_POR_PAGINA
    );

    // Trae los ambientes de los exámenes de la página actual que todavía no
    // se hayan pedido (se cachean en mapAmbientesPorExamen para no repetir).
    useEffect(() => {
        const arrIdsFaltantes = arrExamenesPagina
            .map((ex) => ex.idExamen)
            .filter((id) => !(id in mapAmbientesPorExamen));

        if (arrIdsFaltantes.length === 0) return;

        // Marca como "cargando" de inmediato para no repetir el fetch si el
        // efecto se vuelve a disparar antes de que respondan.
        setMapAmbientesPorExamen((prev) => {
            const siguiente = { ...prev };
            arrIdsFaltantes.forEach((id) => {
                siguiente[id] = "cargando";
            });
            return siguiente;
        });

        arrIdsFaltantes.forEach((id) => {
            obtenerAmbientesPorExamen(id)
                .then((ambientes) => {
                    setMapAmbientesPorExamen((prev) => ({ ...prev, [id]: ambientes || [] }));
                })
                .catch(() => {
                    setMapAmbientesPorExamen((prev) => ({ ...prev, [id]: "error" }));
                });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arrExamenesPagina]);

    function handleCerrarModal() {
        setBoolModalAbierto(false);
        cargarTodo();
    }

    function handleVerDetalle(ex) {
        setExamenEnDetalle(ex);
    }

    function handleCerrarDetalle() {
        setExamenEnDetalle(null);
    }

    function handleEditar() {
        // No hay PUT /api/examenes/{id} en el backend todavía (lo confirmamos
        // revisando ExamenController.java) — no hay nada que este botón
        // pueda hacer de verdad hasta que Neil lo agregue.
        alert("Editar un examen todavía no está soportado por el backend (no existe PUT /api/examenes/{id}).");
    }

    async function handleEliminarNormaGeneral(norma) {
        const boolConfirmado = window.confirm(
            `¿Eliminar la norma general "${norma.descripcionNorma}"? Los exámenes que ya la usaron no se ven afectados.`
        );
        if (!boolConfirmado) return;

        setStrMensajeNormas("");
        try {
            await eliminarNormaGeneralAdmin(norma.idNormaGeneral);
            setArrNormasGenerales((prev) => prev.filter((n) => n.idNormaGeneral !== norma.idNormaGeneral));
        } catch (error) {
            setStrMensajeNormas(error.message || "No se pudo eliminar la norma general.");
        }
    }

    async function handleUsarComoBaseParaGeneral(norma) {
        setStrMensajeNormas("");
        try {
            const normaGeneralCreada = await promoverNormaEspecificaAdmin(norma.idNormaEspecifica);
            setArrNormasGenerales((prev) => [...prev, normaGeneralCreada]);
            setArrNormasParticulares((prev) =>
                prev.map((n) =>
                    n.idNormaEspecifica === norma.idNormaEspecifica ? { ...n, promovida: true } : n
                )
            );
        } catch (error) {
            setStrMensajeNormas(error.message || "No se pudo crear la norma general a partir de esta.");
        }
    }

    function handleCambiarCriterio(e) {
        const strNuevoCriterio = e.target.value;
        setStrCriterioOrden(strNuevoCriterio);
        // Por defecto: registro -> recientes primero; examen -> próximos primero
        setStrDireccionOrden(strNuevoCriterio === "examen" ? "asc" : "desc");
    }

    function handleAlternarDireccion() {
        setStrDireccionOrden((prev) => (prev === "desc" ? "asc" : "desc"));
    }

    function renderCeldaDocenteAulaHora(ex) {
        const strNombreDocente = mapDocentePorId[ex.idUsuario] || `Docente #${ex.idUsuario ?? "-"}`;
        const ambientes = mapAmbientesPorExamen[ex.idExamen];

        if (ambientes === undefined || ambientes === "cargando") {
            return <span className="text-gray-400">Cargando…</span>;
        }
        if (ambientes === "error") {
            return <span className="text-gray-400">{strNombreDocente}</span>;
        }
        if (!ambientes || ambientes.length === 0) {
            return <span>{strNombreDocente} · sin aula asignada</span>;
        }

        const strAulas = ambientes.map((a) => a.nombreAmbiente).join(", ");
        const strHora = ambientes[0]?.horaInicio ? ambientes[0].horaInicio.slice(0, 5) : "";
        return (
            <span>
                {strNombreDocente} · {strAulas}
                {strHora ? ` · ${strHora}` : ""}
            </span>
        );
    }

    // ===================== Normas generales =====================

    async function handleGuardarNuevaGeneral() {
        const strTexto = strNuevaDescripcionGeneral.trim();
        if (!strTexto) return;
        setStrMensajeNormas("");
        try {
            const nueva = await crearNormaGeneralAdmin(strTexto);
            setArrNormasGenerales((prev) => [...prev, nueva]);
            setStrNuevaDescripcionGeneral("");
            setBoolFormularioNuevaGeneralAbierto(false);
        } catch (error) {
            setStrMensajeNormas(error.message || "No se pudo crear la norma general.");
        }
    }

    function handleEmpezarEdicionGeneral(norma) {
        setIdNormaGeneralEnEdicion(norma.idNormaGeneral);
        setStrTextoEdicionGeneral(norma.descripcionNorma);
        setStrMensajeNormas("");
    }

    function handleCancelarEdicionGeneral() {
        setIdNormaGeneralEnEdicion(null);
        setStrTextoEdicionGeneral("");
    }

    async function handleGuardarEdicionGeneral(idNormaGeneral) {
        const strTexto = strTextoEdicionGeneral.trim();
        if (!strTexto) return;
        setStrMensajeNormas("");
        try {
            const actualizada = await editarNormaGeneralAdmin(idNormaGeneral, strTexto);
            setArrNormasGenerales((prev) =>
                prev.map((n) => (n.idNormaGeneral === idNormaGeneral ? actualizada : n))
            );
            setIdNormaGeneralEnEdicion(null);
            setStrTextoEdicionGeneral("");
        } catch (error) {
            setStrMensajeNormas(error.message || "No se pudo guardar la edición.");
        }
    }

    // ===================== Normas particulares (historial) =====================

    const arrParticularesConColor = useMemo(() => {
        const conteo = {};
        arrNormasParticulares.forEach((n) => {
            const clave = normalizarTexto(n.descripcionNorma);
            conteo[clave] = (conteo[clave] || 0) + 1;
        });

        const colorPorClave = {};
        let siguienteColor = 0;

        return arrNormasParticulares.map((n) => {
            const clave = normalizarTexto(n.descripcionNorma);
            let strColor = null;
            if (conteo[clave] >= 2) {
                if (!(clave in colorPorClave)) {
                    colorPorClave[clave] = PALETA_GRUPOS[siguienteColor % PALETA_GRUPOS.length];
                    siguienteColor += 1;
                }
                strColor = colorPorClave[clave];
            }

            const examenOrigen = mapExamenPorId[n.idExamen];
            const strDocente = examenOrigen
                ? mapDocentePorId[examenOrigen.idUsuario] || `Docente #${examenOrigen.idUsuario}`
                : null;

            return { ...n, strColor, strDocente };
        });
    }, [arrNormasParticulares, mapExamenPorId, mapDocentePorId]);

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
                <div>
                    <h2 className="text-[17px] font-bold text-[#163F79]">Registro de Exámenes</h2>
                </div>
            </div>

            <div className="flex gap-6 border-b border-[#EEF1F8] mb-5">
                <button
                    type="button"
                    onClick={() => setStrTabActiva("examenes")}
                    className={`py-3 text-[13.5px] font-bold relative ${strTabActiva === "examenes" ? "text-[#163F79]" : "text-gray-400"
                        }`}
                >
                    Exámenes registrados
                    {strTabActiva === "examenes" && (
                        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2B6CB0] rounded-t" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setStrTabActiva("generales")}
                    className={`py-3 text-[13.5px] font-bold relative ${strTabActiva === "generales" ? "text-[#163F79]" : "text-gray-400"
                        }`}
                >
                    Normas generales
                    {strTabActiva === "generales" && (
                        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2B6CB0] rounded-t" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setStrTabActiva("particulares")}
                    className={`py-3 text-[13.5px] font-bold relative flex items-center gap-2 ${strTabActiva === "particulares" ? "text-[#163F79]" : "text-gray-400"
                        }`}
                >
                    Normas particulares
                    {arrNormasParticulares.length > 0 && (
                        <span className="text-[10.5px] font-extrabold bg-[#FDEFE0] text-[#B4650C] rounded-full px-2 py-0.5">
                            {arrNormasParticulares.length}
                        </span>
                    )}
                    {strTabActiva === "particulares" && (
                        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#2B6CB0] rounded-t" />
                    )}
                </button>
            </div>

            {boolCargando && (
                <p className="text-[13px] text-gray-500 py-6 text-center">Cargando…</p>
            )}

            {/* ===================== TAB: Exámenes registrados ===================== */}
            {!boolCargando && strTabActiva === "examenes" && (
                <>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <p className="text-[13px] text-gray-500">
                            {arrExamenes.length} examen{arrExamenes.length === 1 ? "" : "es"} en el periodo actual
                        </p>
                        <div className="flex items-center gap-2.5">
                            {arrExamenes.length > 0 && (
                                <>
                                    <select
                                        value={strCriterioOrden}
                                        onChange={handleCambiarCriterio}
                                        className="h-[42px] px-3 rounded-md border border-[#C8D6E8] text-[#163F79] text-[12.5px] font-semibold"
                                    >
                                        <option value="registro">Ordenar por: fecha de registro</option>
                                        <option value="examen">Ordenar por: fecha del examen</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAlternarDireccion}
                                        title="Alternar dirección"
                                        className="flex items-center gap-1.5 h-[42px] px-3.5 rounded-md border border-[#C8D6E8] text-[#163F79] text-[12.5px] font-semibold"
                                    >
                                        <IconoFlechaOrden />
                                        {ETIQUETAS_ORDEN[strCriterioOrden][strDireccionOrden]}
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => setBoolModalAbierto(true)}
                                className="flex items-center gap-2 h-[42px] px-5 rounded-md bg-[#163F79] text-white font-semibold text-[13.5px]"
                            >
                                <IconoMas />
                                Registrar examen
                            </button>
                        </div>
                    </div>

                    {arrExamenes.length === 0 && (
                        <p className="text-[13px] text-gray-500 py-6 text-center">
                            Todavía no hay exámenes registrados.
                        </p>
                    )}

                    {arrExamenes.length > 0 && (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wide">
                                            <th className="pb-3 pr-3">Asignatura</th>
                                            <th className="pb-3 pr-3">Tipo</th>
                                            <th className="pb-3 pr-3">Fecha del examen</th>
                                            <th className="pb-3 pr-3">Registrado el</th>
                                            <th className="pb-3 pr-3">Duración</th>
                                            <th className="pb-3 pr-3">Docente / Aula / Hora</th>
                                            <th className="pb-3">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {arrExamenesPagina.map((ex) => {
                                            const strNombreTipo =
                                                mapTiposExamen[ex.idTipoExamen] || ex.detalleTipoExamen || "-";
                                            return (
                                                <tr key={ex.idExamen} className="border-t border-[#EEF1F8] text-[13.5px] text-[#22304F]">
                                                    <td className="py-3.5 pr-3 font-semibold">
                                                        Asignatura #{ex.idAsignatura}
                                                    </td>
                                                    <td className="py-3.5 pr-3">{strNombreTipo}</td>
                                                    <td className="py-3.5 pr-3">{formatearFecha(ex.fechaExamen)}</td>
                                                    <td className="py-3.5 pr-3 text-gray-500">
                                                        {ex.fechaCreacionExamen ? formatearFecha(ex.fechaCreacionExamen) : "—"}
                                                    </td>
                                                    <td className="py-3.5 pr-3">{formatearDuracion(ex.duracionExamen)}</td>
                                                    <td className="py-3.5 pr-3">{renderCeldaDocenteAulaHora(ex)}</td>
                                                    <td className="py-3.5">
                                                        <div className="flex items-center gap-3.5">
                                                            <button type="button" title="Ver detalles" onClick={() => handleVerDetalle(ex)} className="text-[#5E71A0] hover:text-[#163F79]">
                                                                <IconoOjo />
                                                            </button>
                                                            <button type="button" title="Editar" onClick={handleEditar} className="text-[#5E71A0] hover:text-[#163F79]">
                                                                <IconoLapiz />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {intTotalPaginas > 1 && (
                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#EEF1F8]">
                                    <p className="text-[12.5px] text-gray-500">
                                        Página {intPaginaActual} de {intTotalPaginas}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIntPaginaActual((p) => Math.max(1, p - 1))}
                                            disabled={intPaginaActual === 1}
                                            className="flex items-center gap-1 h-[36px] px-3 rounded-md border border-[#C8D6E8] text-[#163F79] text-[12.5px] font-semibold disabled:opacity-40"
                                        >
                                            <IconoFlechaIzquierda />
                                            Anterior
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIntPaginaActual((p) => Math.min(intTotalPaginas, p + 1))}
                                            disabled={intPaginaActual === intTotalPaginas}
                                            className="flex items-center gap-1 h-[36px] px-3 rounded-md border border-[#C8D6E8] text-[#163F79] text-[12.5px] font-semibold disabled:opacity-40"
                                        >
                                            Siguiente
                                            <IconoFlechaDerecha />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* ===================== TAB: Normas generales ===================== */}
            {!boolCargando && strTabActiva === "generales" && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button
                            type="button"
                            onClick={() => setBoolFormularioNuevaGeneralAbierto((v) => !v)}
                            className="flex items-center gap-2 h-[40px] px-4 rounded-md bg-[#163F79] text-white font-semibold text-[13px]"
                        >
                            <IconoMas />
                            Agregar norma general
                        </button>
                    </div>

                    {boolFormularioNuevaGeneralAbierto && (
                        <div className="flex gap-2.5 mb-4 bg-[#F4F6FA] p-3.5 rounded-lg">
                            <input
                                type="text"
                                value={strNuevaDescripcionGeneral}
                                onChange={(e) => setStrNuevaDescripcionGeneral(e.target.value)}
                                placeholder="Escriba el texto de la nueva norma general..."
                                className="h-[40px] flex-1 border border-[#C8D6E8] rounded-md px-3 text-[13px]"
                            />
                            <button
                                type="button"
                                onClick={handleGuardarNuevaGeneral}
                                className="h-[40px] px-4 rounded-md bg-[#163F79] text-white font-semibold text-[12.5px]"
                            >
                                Guardar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setBoolFormularioNuevaGeneralAbierto(false);
                                    setStrNuevaDescripcionGeneral("");
                                }}
                                className="h-[40px] px-4 rounded-md border border-[#C8D6E8] text-[#163F79] font-semibold text-[12.5px]"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    {strMensajeNormas && (
                        <p className="text-[12.5px] text-red-600 font-semibold mb-3">{strMensajeNormas}</p>
                    )}

                    {arrNormasGenerales.length === 0 ? (
                        <p className="text-[13px] text-gray-500 py-6 text-center">
                            Todavía no hay normas generales en el catálogo.
                        </p>
                    ) : (
                        <div>
                            {arrNormasGenerales.map((norma, index) => (
                                <div
                                    key={norma.idNormaGeneral}
                                    className={`flex items-start gap-3.5 py-3.5 ${index > 0 ? "border-t border-[#EEF1F8]" : ""}`}
                                >
                                    <div className="flex-shrink-0 w-[26px] h-[26px] rounded-md bg-[#EEF1F8] text-[#5E6B8A] text-[11px] font-extrabold flex items-center justify-center mt-0.5">
                                        {String(index + 1).padStart(2, "0")}
                                    </div>
                                    <div className="flex-1">
                                        {idNormaGeneralEnEdicion === norma.idNormaGeneral ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={strTextoEdicionGeneral}
                                                    onChange={(e) => setStrTextoEdicionGeneral(e.target.value)}
                                                    className="h-[36px] flex-1 border border-[#2B6CB0] rounded-md px-3 text-[13px]"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleGuardarEdicionGeneral(norma.idNormaGeneral)}
                                                    className="h-[36px] px-3 rounded-md bg-[#163F79] text-white font-semibold text-[12px]"
                                                >
                                                    Guardar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelarEdicionGeneral}
                                                    className="h-[36px] px-3 rounded-md border border-[#C8D6E8] text-[#163F79] font-semibold text-[12px]"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-[13.5px] font-semibold text-[#22304F]">
                                                {norma.descripcionNorma}
                                            </div>
                                        )}
                                    </div>
                                    {idNormaGeneralEnEdicion !== norma.idNormaGeneral && (
                                        <div className="flex items-center gap-2.5 flex-shrink-0">
                                            <button
                                                type="button"
                                                title="Editar"
                                                onClick={() => handleEmpezarEdicionGeneral(norma)}
                                                className="text-[#5E71A0] hover:text-[#163F79]"
                                            >
                                                <IconoLapiz />
                                            </button>
                                            <button
                                                type="button"
                                                title="Eliminar"
                                                onClick={() => handleEliminarNormaGeneral(norma)}
                                                className="text-[#5E71A0] hover:text-red-600"
                                            >
                                                <IconoBasurero />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ===================== TAB: Normas particulares (historial) ===================== */}
            {!boolCargando && strTabActiva === "particulares" && (
                <div className="overflow-x-auto">
                    {strMensajeNormas && (
                        <p className="text-[12.5px] text-red-600 font-semibold mb-3">{strMensajeNormas}</p>
                    )}
                    {arrParticularesConColor.length === 0 ? (
                        <p className="text-[13px] text-gray-500 py-6 text-center">
                            Todavía no se registraron normas particulares.
                        </p>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wide">
                                    <th className="pb-3 pr-3">Norma particular</th>
                                    <th className="pb-3 pr-3">Docente / Asignatura</th>
                                    <th className="pb-3">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {arrParticularesConColor.map((n) => (
                                    <tr
                                        key={n.idNormaEspecifica}
                                        className="border-t border-[#EEF1F8] text-[13.5px] text-[#22304F]"
                                        style={n.strColor ? { background: n.strColor } : undefined}
                                    >
                                        <td className="py-3.5 pr-3 max-w-[420px]">{n.descripcionNorma}</td>
                                        <td className="py-3.5 pr-3">
                                            <span className="block font-semibold text-[12.5px]">
                                                {n.strDocente || "—"}
                                            </span>
                                            <span className="block text-[11.5px] text-gray-500">
                                                Asignatura #{n.idAsignatura}
                                            </span>
                                        </td>
                                        <td className="py-3.5">
                                            {n.promovida ? (
                                                <span className="text-[11.5px] font-semibold text-[#1C8A4C]">
                                                    ✓ Ya está en el catálogo
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUsarComoBaseParaGeneral(n)}
                                                    className="text-[11.5px] font-semibold text-[#2B6CB0] hover:underline"
                                                >
                                                    Usar como base para norma general
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <VentanaEmergente boolAbierto={boolModalAbierto} onCerrar={handleCerrarModal}>
                <ExamenFormAdmin onCancelar={handleCerrarModal} />
            </VentanaEmergente>

            <VentanaEmergente boolAbierto={!!examenEnDetalle} onCerrar={handleCerrarDetalle}>
                {examenEnDetalle && (
                    <div className="bg-white rounded-lg overflow-hidden w-full">
                        <div className="flex items-start justify-between p-6 pb-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#163F79] flex items-center justify-center text-white flex-shrink-0">
                                    <IconoDocumento />
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-bold text-[#163F79]">
                                        Asignatura #{examenEnDetalle.idAsignatura}
                                    </h3>
                                    <p className="text-[12px] text-gray-500">
                                        {mapTiposExamen[examenEnDetalle.idTipoExamen] || examenEnDetalle.detalleTipoExamen || "-"}
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={handleCerrarDetalle} className="text-gray-400 hover:text-[#163F79] mt-1">
                                <IconoX />
                            </button>
                        </div>

                        <div className="bg-[#EBF3FA] px-6 py-2.5 mt-4 font-bold text-[13px] text-[#163F79] flex items-center gap-2">
                            <IconoUbicacion />
                            Información general
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-x-4 gap-y-4">
                            <div>
                                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                                    Fecha del examen
                                </div>
                                <div className="text-[13.5px] text-[#22304F] font-semibold">
                                    {formatearFecha(examenEnDetalle.fechaExamen)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                                    Registrado el
                                </div>
                                <div className="text-[13.5px] text-[#22304F]">
                                    {examenEnDetalle.fechaCreacionExamen ? formatearFecha(examenEnDetalle.fechaCreacionExamen) : "—"}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                                    Duración
                                </div>
                                <div className="text-[13.5px] text-[#22304F]">
                                    {formatearDuracion(examenEnDetalle.duracionExamen)}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                                    Docente
                                </div>
                                <div className="text-[13.5px] text-[#22304F]">
                                    {mapDocentePorId[examenEnDetalle.idUsuario] || `Docente #${examenEnDetalle.idUsuario ?? "-"}`}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#EBF3FA] px-6 py-2.5 font-bold text-[13px] text-[#163F79] flex items-center gap-2">
                            <IconoUbicacion />
                            Ambiente(s)
                        </div>
                        <div className="p-6">
                            {(() => {
                                const ambientes = mapAmbientesPorExamen[examenEnDetalle.idExamen];
                                if (ambientes === undefined || ambientes === "cargando") {
                                    return <span className="text-[13px] text-gray-400">Cargando…</span>;
                                }
                                if (ambientes === "error" || !ambientes || ambientes.length === 0) {
                                    return <span className="text-[13px] text-gray-400">Sin aula asignada</span>;
                                }
                                return (
                                    <div className="flex flex-wrap gap-1.5">
                                        {ambientes.map((a) => (
                                            <span
                                                key={a.idAmbiente}
                                                className="inline-flex items-center gap-1.5 bg-[#F4F6FA] text-[#22304F] border border-[#E2E8F0] px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
                                            >
                                                {a.nombreAmbiente}
                                                <span className="text-gray-400 font-normal">
                                                    {a.horaInicio?.slice(0, 5)}-{a.horaFin?.slice(0, 5)}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="bg-[#EBF3FA] px-6 py-2.5 font-bold text-[13px] text-[#163F79] flex items-center gap-2">
                            <IconoNormas />
                            Normas particulares de este examen
                        </div>
                        <div className="p-6">
                            {(() => {
                                const propias = arrNormasParticulares.filter(
                                    (n) => n.idExamen === examenEnDetalle.idExamen
                                );
                                if (propias.length === 0) {
                                    return <span className="text-[13px] text-gray-400">Ninguna</span>;
                                }
                                return (
                                    <ul className="space-y-1.5">
                                        {propias.map((n) => (
                                            <li key={n.idNormaEspecifica} className="text-[13px] text-[#22304F] flex gap-2">
                                                <span className="text-[#2B6CB0] flex-shrink-0">•</span>
                                                {n.descripcionNorma}
                                            </li>
                                        ))}
                                    </ul>
                                );
                            })()}
                        </div>

                        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={handleCerrarDetalle}
                                className="h-[38px] px-5 rounded-md border border-[#C8D6E8] text-[#163F79] font-semibold text-[13px]"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </VentanaEmergente>
        </div>
    );
}