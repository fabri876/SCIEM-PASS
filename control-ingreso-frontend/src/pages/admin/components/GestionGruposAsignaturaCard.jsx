import React, { useState } from "react";
import {
    Layers,
    BookPlus,
    BookOpen,
    Users,
    CheckCircle,
    FileWarning,
    Loader2,
    UserCheck,
    Plus,
} from "lucide-react";

// =============================================================
// DATOS MOCKEADOS
// El backend los reemplazará con los datos reales de la BD.
// (Los números de grupo 1..10 sí son definitivos.)
// =============================================================
const ASIGNATURAS_MOCK = [
    { idAsignatura: 1, nombreAsignatura: "Simulación de Sistemas", cantidadGrupos: 2 },
    { idAsignatura: 2, nombreAsignatura: "Introducción a la Programación", cantidadGrupos: 3 },
    { idAsignatura: 3, nombreAsignatura: "Ingeniería de Software", cantidadGrupos: 4 },
    { idAsignatura: 4, nombreAsignatura: "Base de Datos I", cantidadGrupos: 0 },
    { idAsignatura: 5, nombreAsignatura: "Cálculo I", cantidadGrupos: 0 },
];

const DOCENTES_MOCK = [
    { idDocente: 1, nombreDocente: "Lic. Henry Villarroel Pérez" },
    { idDocente: 2, nombreDocente: "Dr. Carlos Mendoza Rojas" },
    { idDocente: 3, nombreDocente: "Lic. María Fernández Quispe" },
    { idDocente: 4, nombreDocente: "MSc. Ana Cabrera Montaño" },
];

// Asignaciones iniciales docente -> asignatura -> grupos
const ASIGNACIONES_MOCK = [
    { idDocente: 1, idAsignatura: 1, grupos: [1, 2] },
    { idDocente: 2, idAsignatura: 2, grupos: [1] },
];

// Rango definitivo de grupos por asignatura: del 1 al 10
const MAX_GRUPOS = 10;
const OPCIONES_GRUPOS = Array.from({ length: MAX_GRUPOS }, (_, i) => i + 1);

// Select con el mismo estilo que los combobox del BulkUploadCard
function CampoSelect({ icono: Icono, value, onChange, disabled = false, children }) {
    return (
        <div className="relative">
            <Icono className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary-blue" />
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-border bg-bg-app text-secondary font-semibold focus:outline-none focus:ring-2 focus:ring-primary-blue/40 text-primary-navy cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {children}
            </select>
            <svg
                className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-body/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    );
}

function MensajeEstado({ mensaje }) {
    if (!mensaje) return null;
    const esExito = mensaje.tipo === "exito";
    return (
        <div
            className={`mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl border ${esExito
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-accent-red/10 border-accent-red/30"
                }`}
        >
            {esExito ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
                <FileWarning className="w-4 h-4 text-accent-red mt-0.5 shrink-0" />
            )}
            <p
                className={`text-badge font-semibold leading-snug ${esExito ? "text-emerald-700" : "text-accent-red"
                    }`}
            >
                {mensaje.texto}
            </p>
        </div>
    );
}

/**
 * Props opcionales para conectar el backend:
 *  - onCrearGrupos({ idAsignatura | null, nombreAsignatura, cantidadGrupos, esNueva })
 *      -> debe devolver (o resolver) la asignatura guardada: { idAsignatura, nombreAsignatura, cantidadGrupos }
 *  - onAsignarDocente({ idDocente, idAsignatura, grupos: [1, 2, ...] })
 *  - asignaturasIniciales / docentesIniciales / asignacionesIniciales (reemplazan los mocks)
 * Si no se pasan, el componente funciona 100% con datos mockeados.
 */
export default function GestionGruposAsignaturaCard({
    onCrearGrupos,
    onAsignarDocente,
    asignaturasIniciales = ASIGNATURAS_MOCK,
    docentesIniciales = DOCENTES_MOCK,
    asignacionesIniciales = ASIGNACIONES_MOCK,
}) {
    const [asignaturas, setAsignaturas] = useState(asignaturasIniciales);
    const [asignaciones, setAsignaciones] = useState(asignacionesIniciales);

    // ---------- Parte 1: crear grupos ----------
    const [modoAsignatura, setModoAsignatura] = useState("existente"); // "nueva" | "existente"
    const [strNombreNueva, setStrNombreNueva] = useState("");
    const [idAsignaturaSel, setIdAsignaturaSel] = useState("");
    const [cantidadGrupos, setCantidadGrupos] = useState("");
    const [boolGuardandoGrupos, setBoolGuardandoGrupos] = useState(false);
    const [mensajeGrupos, setMensajeGrupos] = useState(null);

    // ---------- Parte 2: asignar docente ----------
    const [idDocente, setIdDocente] = useState("");
    const [idAsignaturaDoc, setIdAsignaturaDoc] = useState("");
    const [gruposSel, setGruposSel] = useState([]);
    const [boolGuardandoAsignacion, setBoolGuardandoAsignacion] = useState(false);
    const [mensajeAsignacion, setMensajeAsignacion] = useState(null);

    const esNueva = modoAsignatura === "nueva";
    const asignaturaExistente = asignaturas.find((a) => String(a.idAsignatura) === String(idAsignaturaSel));
    const gruposActuales = !esNueva && asignaturaExistente ? asignaturaExistente.cantidadGrupos : 0;

    const asignaturasConGrupos = asignaturas.filter((a) => a.cantidadGrupos > 0);
    const asignaturaDoc = asignaturas.find((a) => String(a.idAsignatura) === String(idAsignaturaDoc));
    const gruposDisponibles = asignaturaDoc
        ? Array.from({ length: asignaturaDoc.cantidadGrupos }, (_, i) => i + 1)
        : [];

    const asignacionesDocente = asignaciones.filter((a) => String(a.idDocente) === String(idDocente));

    // ---------- Handlers parte 1 ----------
    const handleCambiarModo = (modo) => {
        setModoAsignatura(modo);
        setStrNombreNueva("");
        setIdAsignaturaSel("");
        setCantidadGrupos("");
        setMensajeGrupos(null);
    };

    const handleCrearGrupos = async () => {
        setMensajeGrupos(null);

        const strNombre = strNombreNueva.trim();
        const intCantidad = Number(cantidadGrupos);

        if (esNueva) {
            if (!strNombre) {
                setMensajeGrupos({ tipo: "error", texto: "Escribe el nombre de la nueva asignatura." });
                return;
            }
            const boolDuplicada = asignaturas.some(
                (a) => a.nombreAsignatura.toLowerCase() === strNombre.toLowerCase()
            );
            if (boolDuplicada) {
                setMensajeGrupos({
                    tipo: "error",
                    texto: "Ya existe una asignatura con ese nombre. Selecciónala en el modo \"Existente\".",
                });
                return;
            }
        } else if (!asignaturaExistente) {
            setMensajeGrupos({ tipo: "error", texto: "Selecciona una asignatura." });
            return;
        }

        if (!intCantidad) {
            setMensajeGrupos({ tipo: "error", texto: "Selecciona la cantidad de grupos." });
            return;
        }
        if (!esNueva && intCantidad === gruposActuales) {
            setMensajeGrupos({
                tipo: "error",
                texto: `La asignatura ya tiene ${gruposActuales} grupo(s). Elige una cantidad distinta.`,
            });
            return;
        }

        setBoolGuardandoGrupos(true);
        try {
            const payload = {
                idAsignatura: esNueva ? null : asignaturaExistente.idAsignatura,
                nombreAsignatura: esNueva ? strNombre : asignaturaExistente.nombreAsignatura,
                cantidadGrupos: intCantidad,
                esNueva,
            };

            // Backend: devolver la asignatura guardada (con su id real).
            const guardada = onCrearGrupos ? await onCrearGrupos(payload) : null;

            if (esNueva) {
                setAsignaturas((prev) => [
                    ...prev,
                    {
                        idAsignatura: guardada?.idAsignatura ?? Date.now(), // id temporal (mock)
                        nombreAsignatura: payload.nombreAsignatura,
                        cantidadGrupos: intCantidad,
                    },
                ]);
            } else {
                setAsignaturas((prev) =>
                    prev.map((a) =>
                        a.idAsignatura === payload.idAsignatura ? { ...a, cantidadGrupos: intCantidad } : a
                    )
                );
            }

            setMensajeGrupos({
                tipo: "exito",
                texto: `Se configuraron ${intCantidad} grupo(s) para "${payload.nombreAsignatura}".`,
            });
            setStrNombreNueva("");
            setIdAsignaturaSel(esNueva ? "" : idAsignaturaSel);
            setCantidadGrupos("");
        } catch (error) {
            setMensajeGrupos({
                tipo: "error",
                texto: error?.message || "No se pudieron crear los grupos.",
            });
        } finally {
            setBoolGuardandoGrupos(false);
        }
    };

    // ---------- Handlers parte 2 ----------
    const precargarGrupos = (docenteId, asignaturaId) => {
        const existente = asignaciones.find(
            (a) => String(a.idDocente) === String(docenteId) && String(a.idAsignatura) === String(asignaturaId)
        );
        setGruposSel(existente ? existente.grupos : []);
    };

    const handleCambiarDocente = (valor) => {
        setIdDocente(valor);
        setMensajeAsignacion(null);
        precargarGrupos(valor, idAsignaturaDoc);
    };

    const handleCambiarAsignaturaDoc = (valor) => {
        setIdAsignaturaDoc(valor);
        setMensajeAsignacion(null);
        precargarGrupos(idDocente, valor);
    };

    const handleToggleGrupo = (numGrupo) => {
        setMensajeAsignacion(null);
        setGruposSel((prev) =>
            prev.includes(numGrupo) ? prev.filter((g) => g !== numGrupo) : [...prev, numGrupo].sort((a, b) => a - b)
        );
    };

    const handleSeleccionarTodos = () => {
        setMensajeAsignacion(null);
        setGruposSel(gruposSel.length === gruposDisponibles.length ? [] : gruposDisponibles);
    };

    const handleCompletarAsignacion = async () => {
        setMensajeAsignacion(null);

        if (!idDocente) {
            setMensajeAsignacion({ tipo: "error", texto: "Selecciona un docente." });
            return;
        }
        if (!asignaturaDoc) {
            setMensajeAsignacion({ tipo: "error", texto: "Selecciona una asignatura." });
            return;
        }
        if (gruposSel.length === 0) {
            setMensajeAsignacion({ tipo: "error", texto: "Selecciona al menos un grupo." });
            return;
        }

        setBoolGuardandoAsignacion(true);
        try {
            const payload = {
                idDocente: Number(idDocente),
                idAsignatura: asignaturaDoc.idAsignatura,
                grupos: gruposSel, // ej: [1, 2]
            };

            if (onAsignarDocente) await onAsignarDocente(payload);

            // Reemplaza el conjunto de grupos del docente para esa asignatura.
            setAsignaciones((prev) => {
                const otras = prev.filter(
                    (a) => !(a.idDocente === payload.idDocente && a.idAsignatura === payload.idAsignatura)
                );
                return [...otras, payload];
            });

            const docente = docentesIniciales.find((d) => d.idDocente === payload.idDocente);
            setMensajeAsignacion({
                tipo: "exito",
                texto: `${docente?.nombreDocente} dictará "${asignaturaDoc.nombreAsignatura}" en los grupos ${gruposSel.join(", ")}.`,
            });
        } catch (error) {
            setMensajeAsignacion({
                tipo: "error",
                texto: error?.message || "No se pudo completar la asignación.",
            });
        } finally {
            setBoolGuardandoAsignacion(false);
        }
    };

    const nombreAsignaturaPorId = (id) =>
        asignaturas.find((a) => a.idAsignatura === id)?.nombreAsignatura || "Asignatura";

    return (
        <div className="bg-bg-card rounded-2xl p-6 shadow-sm border border-border">
            {/* Cabecera */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-primary-blue text-bg-card flex items-center justify-center shadow-xs">
                    <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-sub font-extrabold text-primary-navy">
                    Gestión de Grupos por Asignatura
                </h2>
            </div>

            <p className="text-secondary text-text-body/70 mb-5 leading-relaxed">
                Define cuántos grupos tiene una asignatura y asigna docentes a esos grupos.
            </p>

            {/* =========================================================
                PARTE 1: CREAR GRUPOS
                ========================================================= */}
            <div className="space-y-3">
                <p className="text-badge font-extrabold text-primary-blue uppercase tracking-wider">
                    1. Grupos de la asignatura
                </p>

                {/* Selector nueva / existente */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-bg-app rounded-xl border border-border">
                    <button
                        type="button"
                        onClick={() => handleCambiarModo("existente")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-badge font-bold transition-colors ${!esNueva
                            ? "bg-primary-blue text-bg-card shadow-sm"
                            : "text-text-body/60 hover:text-primary-navy"
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Existente
                    </button>
                    <button
                        type="button"
                        onClick={() => handleCambiarModo("nueva")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-badge font-bold transition-colors ${esNueva
                            ? "bg-primary-blue text-bg-card shadow-sm"
                            : "text-text-body/60 hover:text-primary-navy"
                            }`}
                    >
                        <BookPlus className="w-4 h-4" />
                        Nueva
                    </button>
                </div>

                {/* Asignatura: texto (nueva) o combobox (existente) */}
                <div>
                    <label className="block text-badge font-bold mb-1.5 text-primary-navy">
                        {esNueva ? "Nombre de la nueva asignatura" : "Asignatura"}
                    </label>
                    {esNueva ? (
                        <div className="relative">
                            <BookPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary-blue" />
                            <input
                                type="text"
                                value={strNombreNueva}
                                maxLength={80}
                                onChange={(e) => {
                                    setStrNombreNueva(e.target.value);
                                    setMensajeGrupos(null);
                                }}
                                placeholder="Ej: Sistemas Operativos"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-bg-app text-secondary font-semibold focus:outline-none focus:ring-2 focus:ring-primary-blue/40 text-primary-navy placeholder:text-text-body/40 placeholder:font-medium"
                            />
                        </div>
                    ) : (
                        <CampoSelect
                            icono={BookOpen}
                            value={idAsignaturaSel}
                            onChange={(e) => {
                                setIdAsignaturaSel(e.target.value);
                                setCantidadGrupos("");
                                setMensajeGrupos(null);
                            }}
                        >
                            <option value="">Selecciona una asignatura</option>
                            {asignaturas.map((a) => (
                                <option key={a.idAsignatura} value={a.idAsignatura}>
                                    {a.nombreAsignatura}
                                </option>
                            ))}
                        </CampoSelect>
                    )}

                    {!esNueva && asignaturaExistente && (
                        <p className="text-badge text-text-body/60 mt-1.5">
                            Grupos actuales:{" "}
                            <span className="font-bold text-text-body">{asignaturaExistente.cantidadGrupos}</span>
                        </p>
                    )}
                </div>

                {/* Cantidad de grupos (1 al 10) */}
                <div>
                    <label className="block text-badge font-bold mb-1.5 text-primary-navy">
                        Cantidad de grupos
                    </label>
                    <CampoSelect
                        icono={Layers}
                        value={cantidadGrupos}
                        onChange={(e) => {
                            setCantidadGrupos(e.target.value);
                            setMensajeGrupos(null);
                        }}
                    >
                        <option value="">Selecciona la cantidad (1 - {MAX_GRUPOS})</option>
                        {OPCIONES_GRUPOS.map((n) => (
                            <option key={n} value={n} disabled={n < gruposActuales}>
                                {n} {n === 1 ? "grupo" : "grupos"}
                            </option>
                        ))}
                    </CampoSelect>
                    {!esNueva && gruposActuales > 0 && (
                        <p className="text-badge text-text-body/60 mt-1.5">
                            No se puede reducir por debajo de los grupos ya existentes.
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleCrearGrupos}
                    disabled={boolGuardandoGrupos}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-primary-blue hover:bg-primary-blue/90 text-white font-bold text-badge rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {boolGuardandoGrupos ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Plus className="w-4 h-4" />
                    )}
                    {boolGuardandoGrupos ? "Guardando..." : "Guardar Grupos"}
                </button>

                <MensajeEstado mensaje={mensajeGrupos} />
            </div>

            <hr className="my-6 border-border" />

            {/* =========================================================
                PARTE 2: ASIGNAR DOCENTE A GRUPOS
                ========================================================= */}
            <div className="space-y-3">
                <p className="text-badge font-extrabold text-primary-blue uppercase tracking-wider">
                    2. Asignación de docentes
                </p>

                {/* Docente */}
                <div>
                    <label className="block text-badge font-bold mb-1.5 text-primary-navy">Docente</label>
                    <CampoSelect
                        icono={Users}
                        value={idDocente}
                        onChange={(e) => handleCambiarDocente(e.target.value)}
                    >
                        <option value="">Selecciona un docente</option>
                        {docentesIniciales.map((d) => (
                            <option key={d.idDocente} value={d.idDocente}>
                                {d.nombreDocente}
                            </option>
                        ))}
                    </CampoSelect>
                </div>

                {/* Asignaciones actuales del docente */}
                {idDocente && asignacionesDocente.length > 0 && (
                    <div className="rounded-xl border border-border bg-bg-app p-3">
                        <p className="text-badge font-bold text-primary-navy mb-2">Asignaciones actuales</p>
                        <ul className="space-y-1.5">
                            {asignacionesDocente.map((a) => (
                                <li
                                    key={a.idAsignatura}
                                    className="flex items-center justify-between gap-2 text-badge"
                                >
                                    <span className="font-semibold text-text-body truncate">
                                        {nombreAsignaturaPorId(a.idAsignatura)}
                                    </span>
                                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-primary-blue/10 text-primary-blue font-bold">
                                        {a.grupos.length === 1 ? "Grupo" : "Grupos"} {a.grupos.join(", ")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Asignatura (solo las que ya tienen grupos) */}
                <div>
                    <label className="block text-badge font-bold mb-1.5 text-primary-navy">Asignatura</label>
                    <CampoSelect
                        icono={BookOpen}
                        value={idAsignaturaDoc}
                        onChange={(e) => handleCambiarAsignaturaDoc(e.target.value)}
                        disabled={asignaturasConGrupos.length === 0}
                    >
                        <option value="">
                            {asignaturasConGrupos.length === 0
                                ? "Primero crea grupos para una asignatura"
                                : "Selecciona una asignatura"}
                        </option>
                        {asignaturasConGrupos.map((a) => (
                            <option key={a.idAsignatura} value={a.idAsignatura}>
                                {a.nombreAsignatura} ({a.cantidadGrupos} {a.cantidadGrupos === 1 ? "grupo" : "grupos"})
                            </option>
                        ))}
                    </CampoSelect>
                </div>

                {/* Grupos (selección múltiple con chips) */}
                {asignaturaDoc && (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-badge font-bold text-primary-navy">
                                Grupos que dictará
                            </label>
                            <button
                                type="button"
                                onClick={handleSeleccionarTodos}
                                className="text-badge font-bold text-primary-blue hover:underline"
                            >
                                {gruposSel.length === gruposDisponibles.length ? "Quitar todos" : "Seleccionar todos"}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {gruposDisponibles.map((n) => {
                                const boolActivo = gruposSel.includes(n);
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        aria-pressed={boolActivo}
                                        onClick={() => handleToggleGrupo(n)}
                                        className={`min-w-[3.25rem] px-3 py-2 rounded-lg border text-badge font-bold transition-colors ${boolActivo
                                            ? "bg-primary-blue text-bg-card border-primary-blue shadow-sm"
                                            : "bg-bg-app text-text-body/70 border-border hover:border-primary-blue/40 hover:text-primary-navy"
                                            }`}
                                    >
                                        G{n}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleCompletarAsignacion}
                    disabled={boolGuardandoAsignacion}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-primary-blue hover:bg-primary-blue/90 text-white font-bold text-badge rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {boolGuardandoAsignacion ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <UserCheck className="w-4 h-4" />
                    )}
                    {boolGuardandoAsignacion ? "Guardando..." : "Completar Asignación"}
                </button>

                <MensajeEstado mensaje={mensajeAsignacion} />
            </div>
        </div>
    );
}
