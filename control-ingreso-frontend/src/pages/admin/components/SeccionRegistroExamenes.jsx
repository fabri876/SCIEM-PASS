import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    obtenerExamenes,
    obtenerTiposExamen,
    obtenerNormasGenerales,
} from "../../../services/examenService";
import {
    obtenerDocentesAdmin,
    obtenerNormasParticularesAdmin,
    crearNormaGeneralAdmin,
    editarNormaGeneralAdmin,
    eliminarNormaGeneralAdmin,
    promoverNormaEspecificaAdmin,
} from "../../../services/adminNormasService";
import VentanaEmergente from "../../../components/common/VentanaEmergente";
import ExamenFormAdmin from "./ExamenFormAdmin";
import DetalleExamenAdmin from "./DetalleExamenAdmin";
import MenuAccionesExamen from "./MenuAccionesExamen";
import ModalCancelarExamen from "../../../components/examenes/ModalCancelarExamen";
import AsignarOperadoresDocente from "../../docente/operadores/AsignarOperadoresDocente";
import PanelIngresosExamen from "../../control/ingreso/componentes/PanelIngresosExamen";
// "Seguridad de Sistemas · Primer Parcial · 24 oct" para el panel de ingresos
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function subtituloIngresos(strMateria, strTipo, strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  const strDia = m ? `${Number(m[3])} ${MESES_CORTOS[Number(m[2]) - 1]}` : "";
  return [strMateria, strTipo, strDia].filter(Boolean).join(" · ");
}

import {
    ESTILOS_ESTADO,
    estadoDeExamen,
    marcaDeExamen,
    fechaCorta,
    rangoHorario,
    tiempoDeExamen,
    nombreGrupo,
    horaAperturaControl,
    controlDisponible,
    sePuedeCancelar,
    ordenarPorFecha,
    sinAcentos,
} from "../utilidadesExamenAdmin";

const INT_EXAMENES_POR_PAGINA = 10;

// Colores para agrupar visualmente normas particulares con texto idéntico
// (no necesariamente exacto: el admin puede notar a ojo que dos dicen lo
// mismo con otras palabras, pero el agrupado automático solo detecta texto
// igual una vez normalizado — ver normalizarTexto más abajo).
const PALETA_GRUPOS = ["#F0F5FB", "#FBF3E9", "#F1F8F1", "#FCEFF5", "#F5F1FB"];

const OPCIONES_ORDEN = [
    { valor: "proximos", etiqueta: "Más próximos primero" },
    { valor: "antiguos", etiqueta: "Más antiguos primero" },
];

const CHIPS_ESTADO = [
    { valor: "TODOS", etiqueta: "Todos" },
    { valor: "PROXIMO", etiqueta: "Próximos" },
    { valor: "EN_CURSO", etiqueta: "En curso" },
    { valor: "FINALIZADO", etiqueta: "Finalizados" },
    { valor: "CANCELADO", etiqueta: "Cancelados" },
];

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

function IconoBuscar() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
        </svg>
    );
}

function normalizarTexto(strTexto) {
    return (strTexto || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Números de página con "…" cuando son muchas: 1 … 4 5 6 … 12
function armarPaginas(intActual, intTotal) {
    if (intTotal <= 7) return Array.from({ length: intTotal }, (_, i) => i + 1);
    const set = new Set([1, intTotal, intActual - 1, intActual, intActual + 1]);
    const arr = [...set].filter((p) => p >= 1 && p <= intTotal).sort((a, b) => a - b);
    const res = [];
    arr.forEach((p, i) => {
        if (i > 0 && p - arr[i - 1] > 1) res.push("…");
        res.push(p);
    });
    return res;
}

const CLASE_SELECT =
    "h-[38px] px-3 rounded-[10px] border border-[#D5DEEC] bg-white text-[#10294D] text-[12.5px] font-semibold max-w-full cursor-pointer outline-none focus:border-[#2B6CB0]";

function Paginacion({ intActual, intTotal, onCambiar }) {
    const clasePagina = (boolActiva) =>
        `w-[34px] h-[34px] rounded-lg border text-[12.5px] font-bold flex items-center justify-center transition ${boolActiva
            ? "bg-[#003770] border-[#003770] text-white"
            : "bg-white border-[#D5DEEC] text-slate-600 hover:bg-slate-50 cursor-pointer"
        }`;
    return (
        <nav aria-label="Paginación" className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={() => onCambiar(Math.max(1, intActual - 1))}
                disabled={intActual === 1}
                aria-label="Página anterior"
                className={clasePagina(false) + " disabled:opacity-40 disabled:cursor-not-allowed"}
            >
                <IconoFlechaIzquierda />
            </button>
            {armarPaginas(intActual, intTotal).map((p, i) =>
                p === "…" ? (
                    <span key={`e${i}`} className="w-[24px] text-center text-slate-400">…</span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onCambiar(p)}
                        aria-current={p === intActual ? "page" : undefined}
                        className={clasePagina(p === intActual)}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                type="button"
                onClick={() => onCambiar(Math.min(intTotal, intActual + 1))}
                disabled={intActual === intTotal}
                aria-label="Página siguiente"
                className={clasePagina(false) + " disabled:opacity-40 disabled:cursor-not-allowed"}
            >
                <IconoFlechaDerecha />
            </button>
        </nav>
    );
}

function PildoraEstado({ strEstado }) {
    const e = ESTILOS_ESTADO[strEstado] || ESTILOS_ESTADO.PROXIMO;
    return (
        <span className={`inline-block rounded-full border text-[11.5px] font-bold px-3 py-[3px] whitespace-nowrap ${e.clase}`}>
            {e.texto}
        </span>
    );
}

export default function SeccionRegistroExamenes() {
    const navigate = useNavigate();
    const [strTabActiva, setStrTabActiva] = useState("examenes"); // "examenes" | "generales" | "particulares"

    const [arrExamenes, setArrExamenes] = useState([]);
    const [mapTiposExamen, setMapTiposExamen] = useState({});
    const [arrDocentes, setArrDocentes] = useState([]);
    const [arrNormasGenerales, setArrNormasGenerales] = useState([]);
    const [arrNormasParticulares, setArrNormasParticulares] = useState([]);

    const [boolCargando, setBoolCargando] = useState(true);
    const [boolModalAbierto, setBoolModalAbierto] = useState(false);
    const [examenEnDetalle, setExamenEnDetalle] = useState(null);
    const [objExamenEditando, setObjExamenEditando] = useState(null);

    // Acciones del botón "Ingreso"
    const [examenOperadores, setExamenOperadores] = useState(null);
    const [examenLista, setExamenLista] = useState(null);
    const [examenACancelar, setExamenACancelar] = useState(null);

    // Filtros, orden y paginación
    const [strBusqueda, setStrBusqueda] = useState("");
    const [strEstadoFiltro, setStrEstadoFiltro] = useState("TODOS");
    const [strDocenteFiltro, setStrDocenteFiltro] = useState("");
    const [strAsignaturaFiltro, setStrAsignaturaFiltro] = useState("");
    const [strOrden, setStrOrden] = useState("proximos");
    const [intPaginaActual, setIntPaginaActual] = useState(1);

    // El estado (Próximo / En curso / Finalizado) depende de la hora: se recalcula cada minuto
    const [dateAhora, setDateAhora] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setDateAhora(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

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
        ])
            .then(([examenes, tipos, docentes]) => {
                setArrExamenes(examenes || []);
                setIntPaginaActual(1);

                const objMapTipo = {};
                (tipos || []).forEach((t) => {
                    objMapTipo[t.idTipoExamen] = t.nombreTipoExamen;
                });
                setMapTiposExamen(objMapTipo);

                setArrDocentes(docentes || []);
                // Las normas no bloquean la tabla de exámenes; se cargan en segundo plano.
                Promise.all([obtenerNormasGenerales(), obtenerNormasParticularesAdmin()])
                    .then(([normasGenerales, normasParticulares]) => {
                        setArrNormasGenerales(normasGenerales || []);
                        setArrNormasParticulares(normasParticulares || []);
                    })
                    .catch(() => {});
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

    function nombreDocenteDe(ex) {
        return ex.nombreDocente || mapDocentePorId[ex.idUsuario] || `Docente #${ex.idUsuario ?? "-"}`;
    }

    function nombreTipoDe(ex) {
        return ex.nombreTipoExamen || mapTiposExamen[ex.idTipoExamen] || ex.detalleTipoExamen || "-";
    }

    // Cada examen con sus datos calculados (estado, docente, tipo) para filtrar y ordenar
    const arrExamenesCalculados = useMemo(
        () =>
            arrExamenes.map((ex) => ({
                ...ex,
                _estado: estadoDeExamen(ex, dateAhora),
                _marca: marcaDeExamen(ex),
                _docente: nombreDocenteDe(ex),
                _tipo: nombreTipoDe(ex),
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [arrExamenes, dateAhora, mapDocentePorId, mapTiposExamen]
    );

    const arrDocentesOpciones = useMemo(() => {
        const mapa = new Map();
        arrExamenesCalculados.forEach((ex) => mapa.set(String(ex.idUsuario), ex._docente));
        return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [arrExamenesCalculados]);

    const arrAsignaturasOpciones = useMemo(() => {
        const mapa = new Map();
        arrExamenesCalculados.forEach((ex) =>
            mapa.set(String(ex.idAsignatura), ex.nombreAsignatura || `Asignatura #${ex.idAsignatura}`)
        );
        return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [arrExamenesCalculados]);

    // Búsqueda + docente + asignatura (sin estado: los chips cuentan sobre este resultado)
    const arrBaseFiltrada = useMemo(() => {
        const strQ = sinAcentos(strBusqueda);
        return arrExamenesCalculados.filter((ex) => {
            if (strDocenteFiltro && String(ex.idUsuario) !== strDocenteFiltro) return false;
            if (strAsignaturaFiltro && String(ex.idAsignatura) !== strAsignaturaFiltro) return false;
            if (strQ) {
                const strTexto = sinAcentos(`${ex.nombreAsignatura || ""} ${ex.siglaAsignatura || ""} ${ex._docente}`);
                if (!strTexto.includes(strQ)) return false;
            }
            return true;
        });
    }, [arrExamenesCalculados, strBusqueda, strDocenteFiltro, strAsignaturaFiltro]);

    const objConteos = useMemo(() => {
        const c = { TODOS: arrBaseFiltrada.length, PROXIMO: 0, EN_CURSO: 0, FINALIZADO: 0, CANCELADO: 0 };
        arrBaseFiltrada.forEach((ex) => { c[ex._estado] += 1; });
        return c;
    }, [arrBaseFiltrada]);

    const arrExamenesOrdenados = useMemo(() => {
        const arr = strEstadoFiltro === "TODOS"
            ? arrBaseFiltrada
            : arrBaseFiltrada.filter((ex) => ex._estado === strEstadoFiltro);
        return ordenarPorFecha(arr, strOrden);
    }, [arrBaseFiltrada, strEstadoFiltro, strOrden]);

    const boolHayFiltros = Boolean(strBusqueda || strDocenteFiltro || strAsignaturaFiltro || strEstadoFiltro !== "TODOS");

    function handleLimpiarFiltros() {
        setStrBusqueda("");
        setStrEstadoFiltro("TODOS");
        setStrDocenteFiltro("");
        setStrAsignaturaFiltro("");
    }

    const intTotalPaginas = Math.max(1, Math.ceil(arrExamenesOrdenados.length / INT_EXAMENES_POR_PAGINA));

    // Al cambiar filtros u orden se vuelve a la página 1
    useEffect(() => {
        setIntPaginaActual(1);
    }, [strBusqueda, strEstadoFiltro, strDocenteFiltro, strAsignaturaFiltro, strOrden]);

    // Si la página quedó fuera de rango (p. ej. tras recargar con menos exámenes)
    useEffect(() => {
        setIntPaginaActual((prev) => Math.min(prev, intTotalPaginas));
    }, [intTotalPaginas]);

    const intDesde = (intPaginaActual - 1) * INT_EXAMENES_POR_PAGINA;
    const arrExamenesPagina = arrExamenesOrdenados.slice(intDesde, intDesde + INT_EXAMENES_POR_PAGINA);

    function handleCerrarModal() {
        setBoolModalAbierto(false);
        setObjExamenEditando(null);
        cargarTodo();
    }

    function handleVerDetalle(ex) {
        setExamenEnDetalle(ex);
    }

    function handleCerrarDetalle() {
        setExamenEnDetalle(null);
    }

    function handleEditar(ex) {
        // PUT /api/examenes/{id}. Los ambientes (aulas y horas) ya vienen dentro de cada examen.
        setObjExamenEditando(ex);
        setBoolModalAbierto(true);
    }

    function handleAbrirControl(ex) {
        navigate(`/admin/examenes/${ex.idExamen}/control-ingreso`, {
            // El control necesita asignatura y ambiente para cargar el examen
            // seleccionado. Antes solo se enviaba el nombre del docente y la
            // vista intentaba buscarlo como si fuera un examen delegado.
            state: { nombreDocente: ex._docente, examen: ex },
        });
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

    async function handleGuardarNuevaGeneral() {
        const strTexto = strNuevaDescripcionGeneral.trim();
        if (!strTexto) return;
        if (arrNormasGenerales.some((n) => normalizarTexto(n.descripcionNorma) === normalizarTexto(strTexto))) {
            setStrMensajeNormas("Ya existe una norma general con ese texto.");
            return;
        }
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
        if (
            arrNormasGenerales.some(
                (n) =>
                    n.idNormaGeneral !== idNormaGeneral &&
                    normalizarTexto(n.descripcionNorma) === normalizarTexto(strTexto)
            )
        ) {
            setStrMensajeNormas("Ya existe otra norma general con ese texto.");
            return;
        }
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
                ? examenOrigen.nombreDocente || mapDocentePorId[examenOrigen.idUsuario] || `Docente #${examenOrigen.idUsuario}`
                : null;

            return { ...n, strColor, strDocente };
        });
    }, [arrNormasParticulares, mapExamenPorId, mapDocentePorId]);

    // ===================== Asignar / ver ayudantes =====================

    if (examenOperadores) {
        const strDocenteOp = examenOperadores._docente;
        return (
            <AsignarOperadoresDocente
                key={examenOperadores.idExamen}
                examen={{
                    idExamen: examenOperadores.idExamen,
                    idAsignatura: examenOperadores.idAsignatura,
                    nombreExamen: examenOperadores.nombreAsignatura,
                    tipoExamen: examenOperadores._tipo,
                    horario: rangoHorario(examenOperadores),
                    horaInicio: tiempoDeExamen(examenOperadores).horaInicio,
                    horaFin: tiempoDeExamen(examenOperadores).horaFin,
                    fechaExamen: examenOperadores.fechaExamen,
                    ambientes: examenOperadores.ambientes || [],
                }}
                usuario={{ idUsuario: examenOperadores.idUsuario, nombre: strDocenteOp, apellido: "" }}
                soloLectura={examenOperadores._estado !== "PROXIMO"}
                boolVistaAdmin
                strTextoVolver="Gestión de Exámenes"
                onVolver={() => setExamenOperadores(null)}
            />
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
                <div>
                    <h2 className="text-[17px] font-bold text-[#163F79]">Gestión de Exámenes</h2>
                </div>
            </div>

            {/* overflow-y-hidden: evita la barrita de desplazamiento vertical que salía a la derecha */}
            <div className="flex gap-4 sm:gap-6 border-b border-[#EEF1F8] mb-5 overflow-x-auto overflow-y-hidden whitespace-nowrap">
                <button
                    type="button"
                    onClick={() => setStrTabActiva("examenes")}
                    className={`py-3 text-[13.5px] font-bold relative shrink-0 ${strTabActiva === "examenes" ? "text-[#163F79]" : "text-gray-400"
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
                    className={`py-3 text-[13.5px] font-bold relative shrink-0 ${strTabActiva === "generales" ? "text-[#163F79]" : "text-gray-400"
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
                    className={`py-3 text-[13.5px] font-bold relative flex items-center gap-2 shrink-0 ${strTabActiva === "particulares" ? "text-[#163F79]" : "text-gray-400"
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
                    {arrExamenes.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-10">
                            <p className="text-[13px] text-gray-500">Todavía no hay exámenes registrados.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setObjExamenEditando(null);
                                    setBoolModalAbierto(true);
                                }}
                                className="flex items-center gap-2 h-[40px] px-5 rounded-[10px] bg-[#003770] hover:bg-[#002a55] text-white font-semibold text-[13px]"
                            >
                                <IconoMas />
                                Registrar examen
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Filtros */}
                            <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
                                <div className="relative flex-1 basis-[240px] max-w-[340px]">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <IconoBuscar />
                                    </span>
                                    <input
                                        type="text"
                                        value={strBusqueda}
                                        onChange={(e) => setStrBusqueda(e.target.value)}
                                        placeholder="Buscar asignatura o docente…"
                                        className="w-full h-[38px] pl-9 pr-3 rounded-[10px] border border-[#D5DEEC] text-[12.5px] text-[#10294D] placeholder:text-slate-400 outline-none focus:border-[#2B6CB0]"
                                    />
                                </div>
                                <select value={strDocenteFiltro} onChange={(e) => setStrDocenteFiltro(e.target.value)} className={CLASE_SELECT}>
                                    <option value="">Docente: Todos</option>
                                    {arrDocentesOpciones.map(([id, nombre]) => (
                                        <option key={id} value={id}>{nombre}</option>
                                    ))}
                                </select>
                                <select value={strAsignaturaFiltro} onChange={(e) => setStrAsignaturaFiltro(e.target.value)} className={CLASE_SELECT}>
                                    <option value="">Asignatura: Todas</option>
                                    {arrAsignaturasOpciones.map(([id, nombre]) => (
                                        <option key={id} value={id}>{nombre}</option>
                                    ))}
                                </select>
                                {boolHayFiltros && (
                                    <button
                                        type="button"
                                        onClick={handleLimpiarFiltros}
                                        className="text-[12.5px] font-bold text-[#003770] hover:underline cursor-pointer"
                                    >
                                        Limpiar
                                    </button>
                                )}
                                <div className="flex-1" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setObjExamenEditando(null);
                                        setBoolModalAbierto(true);
                                    }}
                                    className="flex items-center gap-2 h-[38px] px-4 rounded-[10px] bg-[#003770] hover:bg-[#002a55] text-white font-semibold text-[12.5px] cursor-pointer"
                                >
                                    <IconoMas />
                                    Registrar examen
                                </button>
                            </div>

                            {/* Chips de estado + orden */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    {CHIPS_ESTADO.map((chip) => {
                                        const boolActivo = strEstadoFiltro === chip.valor;
                                        return (
                                            <button
                                                key={chip.valor}
                                                type="button"
                                                onClick={() => setStrEstadoFiltro(chip.valor)}
                                                aria-pressed={boolActivo}
                                                className={`inline-flex items-center gap-2 h-[30px] pl-3.5 pr-1.5 rounded-full border text-[12px] font-bold cursor-pointer transition ${boolActivo
                                                    ? "bg-[#003770] border-[#003770] text-white"
                                                    : "bg-white border-[#D5DEEC] text-slate-600 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {chip.etiqueta}
                                                <span className={`min-w-[20px] text-center px-1.5 py-px rounded-full text-[11px] ${boolActivo ? "bg-white/20" : "bg-[#EEF2F8]"}`}>
                                                    {objConteos[chip.valor]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <label className="inline-flex items-center gap-2 text-[12px] text-slate-500">
                                    Fecha del examen:
                                    <select
                                        value={strOrden}
                                        onChange={(e) => setStrOrden(e.target.value)}
                                        className={CLASE_SELECT + " h-[30px] text-[12px]"}
                                    >
                                        {OPCIONES_ORDEN.map((o) => (
                                            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {arrExamenesOrdenados.length === 0 ? (
                                <div className="flex flex-col items-center py-12 text-center">
                                    <span className="w-[68px] h-[68px] rounded-full bg-[#EAF1FB] text-[#003770] flex items-center justify-center mb-3.5">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <circle cx="11" cy="11" r="7" />
                                            <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                                        </svg>
                                    </span>
                                    <p className="text-[15px] font-bold text-[#0B3A73]">No se encontraron exámenes</p>
                                    <p className="text-[13px] text-slate-500 mt-1">Ajusta los filtros de búsqueda.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <th className="pb-3 pr-3">Asignatura</th>
                                                    <th className="pb-3 pr-3">Tipo</th>
                                                    <th className="pb-3 pr-3">Docente</th>
                                                    <th className="pb-3 pr-3">Fecha y hora</th>
                                                    {/* En "Cancelados" todos tienen el mismo estado: su lugar lo toma el motivo */}
                                                    <th className="pb-3 pr-3">{strEstadoFiltro === "CANCELADO" ? "Motivo" : "Estado"}</th>
                                                    <th className="pb-3 w-10" aria-label="Opciones" />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {arrExamenesPagina.map((ex) => {
                                                    const strGrupo = nombreGrupo(ex);
                                                    return (
                                                        <tr key={ex.idExamen} className="border-t border-[#EEF1F8] text-[13px] text-[#10294D]">
                                                            <td className="py-3.5 pr-3 font-bold">
                                                                <span className="inline-flex items-center gap-2">
                                                                    {ex.nombreAsignatura || `Asignatura #${ex.idAsignatura}`}
                                                                    {strGrupo && (
                                                                        <span className="bg-[#E8F0FB] text-[#003770] border border-[#BFD3F2] rounded-full text-[11px] font-bold px-2.5 py-px whitespace-nowrap">
                                                                            {strGrupo}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 pr-3 whitespace-nowrap">{ex._tipo}</td>
                                                            <td className="py-3.5 pr-3">{ex._docente}</td>
                                                            <td className="py-3.5 pr-3 whitespace-nowrap">{fechaCorta(ex)}</td>
                                                            <td className="py-3.5 pr-3">
                                                                {strEstadoFiltro === "CANCELADO" ? (
                                                                    <span className="block max-w-[280px] text-[12.5px] text-slate-600 break-words">{ex.motivoCancelacion || "-"}</span>
                                                                ) : (
                                                                    <PildoraEstado strEstado={ex._estado} />
                                                                )}
                                                            </td>
                                                            <td className="py-3.5 text-center">
                                                                {ex._estado === "CANCELADO" ? (
                                                                    // Cancelado: solo se puede ver el detalle (con el motivo)
                                                                    <button type="button" title="Ver detalle" aria-label="Ver detalle" onClick={() => handleVerDetalle(ex)} className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#475569] hover:bg-[#EEF2F7] hover:text-[#003770] cursor-pointer">
                                                                        <IconoOjo />
                                                                    </button>
                                                                ) : (
                                                                    <MenuAccionesExamen
                                                                        boolSoloLectura={ex._estado !== "PROXIMO"}
                                                                        boolFinalizado={ex._estado === "FINALIZADO"}
                                                                        boolControlDisponible={controlDisponible(ex, dateAhora)}
                                                                        strDisponibleDesde={horaAperturaControl(ex)}
                                                                        boolPuedeCancelar={sePuedeCancelar(ex, dateAhora)}
                                                                        onAsignar={() => setExamenOperadores(ex)}
                                                                        onVerLista={() => setExamenLista(ex)}
                                                                        onAbrirControl={() => handleAbrirControl(ex)}
                                                                        onVerDetalle={() => handleVerDetalle(ex)}
                                                                        onEditar={() => handleEditar(ex)}
                                                                        onCancelar={() => setExamenACancelar(ex)}
                                                                    />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-4 border-t border-[#EEF1F8] gap-3">
                                        <p className="text-[12px] text-slate-500">
                                            Mostrando {intDesde + 1}–{intDesde + arrExamenesPagina.length} de {arrExamenesOrdenados.length} exámenes
                                        </p>
                                        {intTotalPaginas > 1 && (
                                            <Paginacion intActual={intPaginaActual} intTotal={intTotalPaginas} onCambiar={setIntPaginaActual} />
                                        )}
                                    </div>
                                </>
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
                        <div className="flex flex-col sm:flex-row gap-2.5 mb-4 bg-[#F4F6FA] p-3.5 rounded-lg">
                            <input
                                type="text"
                                value={strNuevaDescripcionGeneral}
                                onChange={(e) => setStrNuevaDescripcionGeneral(e.target.value)}
                                maxLength={100}
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
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    value={strTextoEdicionGeneral}
                                                    onChange={(e) => setStrTextoEdicionGeneral(e.target.value)}
                                                    maxLength={100}
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
                <ExamenFormAdmin
                    key={objExamenEditando ? `editar-${objExamenEditando.idExamen}` : "nuevo"}
                    onCancelar={handleCerrarModal}
                    objExamenAEditar={objExamenEditando}
                    arrAmbientesExamenAEditar={
                        objExamenEditando ? objExamenEditando.ambientes || [] : null
                    }
                    arrNormasParticularesExamenAEditar={
                        objExamenEditando
                            ? arrNormasParticulares.filter((n) => n.idExamen === objExamenEditando.idExamen)
                            : []
                    }
                />
            </VentanaEmergente>

            <VentanaEmergente boolAbierto={!!examenEnDetalle} onCerrar={handleCerrarDetalle} strMaxWidth="max-w-xl">
                {examenEnDetalle && (
                    <DetalleExamenAdmin
                        examen={examenEnDetalle}
                        strTipo={nombreTipoDe(examenEnDetalle)}
                        strDocente={nombreDocenteDe(examenEnDetalle)}
                        strEstado={estadoDeExamen(examenEnDetalle, dateAhora)}
                        arrNormasParticulares={arrNormasParticulares.filter((n) => n.idExamen === examenEnDetalle.idExamen)}
                        onCerrar={handleCerrarDetalle}
                    />
                )}
            </VentanaEmergente>

            <ModalCancelarExamen
                examen={examenACancelar}
                onCerrar={() => setExamenACancelar(null)}
                onCancelado={() => { setExamenACancelar(null); cargarTodo(); }}
            />

            {/* "Ver ingresos": todos los estudiantes con su estado, hora y quién registró (solo lectura) */}
            <PanelIngresosExamen
                boolAbierto={!!examenLista}
                onCerrar={() => setExamenLista(null)}
                idExamen={examenLista ? examenLista.idExamen : null}
                strSubtitulo={examenLista ? subtituloIngresos(examenLista.nombreAsignatura, examenLista.nombreTipoExamen, examenLista.fechaExamen) : ""}
            />
        </div>
    );
}
