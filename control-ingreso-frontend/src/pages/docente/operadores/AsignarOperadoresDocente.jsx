import { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Clock } from "lucide-react";
import { obtenerHabilitaciones } from "../../../services/habilitacionService";
import {
    obtenerOperadoresDisponibles,
    obtenerAsignacionIngreso,
    guardarAsignacionIngreso,
} from "../../../services/asignacionOperadoresService";
import {
    ordenarPorApellido,
    repartoEquilibrado,
    validarReparto,
    cortarEnBloques,
    rangoLetras,
    letrasDeBloque,
    partirPorLetras,
    cortesEquitativos,
    inicialApellido,
} from "./utilidadesAsignacion";

const PASOS = ["Aulas y estudiantes", "Ayudantes por aula", "Resumen"];

function nombreCompleto(o) {
    return `${o.nombre || ""} ${o.apellido || ""}`.trim() || "Ayudante";
}

function iniciales(texto) {
    const p = String(texto || "").trim().split(/\s+/);
    return `${p[0]?.[0] || ""}${p[1]?.[0] || ""}`.toUpperCase() || "?";
}

function BotonPrincipal({ children, ...props }) {
    return (
        <button
            type="button"
            {...props}
            className="h-11 px-5 rounded-xl bg-[#003770] text-white font-bold text-[15px] hover:bg-[#002a55] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
            {children}
        </button>
    );
}

function BotonSecundario({ children, ...props }) {
    return (
        <button
            type="button"
            {...props}
            className="h-11 px-5 rounded-xl bg-white border-[1.5px] border-[#CBD5E1] text-[#003770] font-bold text-[15px] hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
            {children}
        </button>
    );
}

function Pildora({ children, tipo = "azul" }) {
    const clases = {
        azul: "bg-[#EFF6FF] text-[#003770] border-[#BFDBFE]",
        gris: "bg-slate-100 text-slate-600 border-slate-300",
        rojo: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    }[tipo];
    return <span className={`inline-flex items-center rounded-full border font-bold text-[13px] px-3 py-1 ${clases}`}>{children}</span>;
}

function Indicador({ paso, pasoActivo, bloqueado, onIr }) {
    const hecho = paso < pasoActivo;
    const actual = paso === pasoActivo;
    const puedeIr = hecho && !bloqueado;
    return (
        <button
            type="button"
            disabled={!puedeIr}
            onClick={() => puedeIr && onIr(paso)}
            className={`flex items-center gap-3 ${puedeIr ? "cursor-pointer" : "cursor-default"}`}
        >
            <span
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-[15px] ${hecho || actual ? "bg-[#003770] border-[#003770] text-white" : "bg-white border-[#CBD5E1] text-slate-400"
                    }`}
            >
                {hecho ? <Check className="w-4 h-4" strokeWidth={3} /> : paso}
            </span>
            <span className={`font-bold text-[15px] ${hecho || actual ? "text-[#003770]" : "text-slate-400"} ${puedeIr ? "underline" : ""}`}>
                {PASOS[paso - 1]}
            </span>
        </button>
    );
}

function Pasos({ pasoActivo, bloquearPaso1, onIr }) {
    return (
        <div className="flex items-center gap-3 mt-5 flex-wrap">
            {PASOS.map((_, i) => (
                <div key={i} className="flex items-center gap-3 flex-1 last:flex-none min-w-0">
                    <Indicador paso={i + 1} pasoActivo={pasoActivo} bloqueado={i === 0 && bloquearPaso1} onIr={onIr} />
                    {i < PASOS.length - 1 && (
                        <div className={`flex-1 h-0.5 min-w-4 ${i + 1 < pasoActivo ? "bg-[#003770]" : "bg-[#CBD5E1]"}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

export default function AsignarOperadoresDocente({
    examen,
    usuario,
    soloLectura = false,
    onVolver,
    onRegistrarOperador,
    numRecargaOperadores = 0,
    boolVistaAdmin = false,
    strTextoVolver = "Control de ingresos",
}) {
    const aulas = useMemo(
        () =>
            (examen?.ambientes || []).map((a) => ({
                idAmbiente: a.idAmbiente,
                nombre: a.nombreAmbiente || a.nombreAula || "Aula",
                ubicacion: a.ubicacionAmbiente || a.bloque || "",
                capacidad: a.capacidadAmbiente ?? null,
            })),
        [examen]
    );

    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState("");
    const [estudiantes, setEstudiantes] = useState([]);
    const [guardada, setGuardada] = useState(null);

    const [operadores, setOperadores] = useState([]);
    const [fallaOperadores, setFallaOperadores] = useState(false);

    const [paso, setPaso] = useState(1);
    const [modo, setModo] = useState("EQUILIBRADO");
    const [modoAsignacion, setModoAsignacion] = useState("SUBDIVISION");
    const [cantidades, setCantidades] = useState([]);
    const [responsables, setResponsables] = useState({});
    const [base, setBase] = useState("");

    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState("");
    const [avisoDivision, setAvisoDivision] = useState("");

    const docente = useMemo(
        () => ({
            idUsuario: usuario?.idUsuario,
            nombre: `${usuario?.nombre || ""} ${usuario?.apellido || ""}`.trim() || "Docente",
            rol: "DOCENTE",
        }),
        [usuario]
    );

    // Estudiantes inscritos + asignación ya guardada
    useEffect(() => {
        let cancel = false;
        async function cargar() {
            setCargando(true);
            setErrorCarga("");
            try {
                if (!examen?.idAsignatura) throw new Error("No se pudo identificar la asignatura del examen.");
                const lista = await obtenerHabilitaciones(examen.idAsignatura);
                const ordenados = ordenarPorApellido(Array.isArray(lista) ? lista : []);
                let previa = null;
                try {
                    previa = await obtenerAsignacionIngreso(examen.idExamen);
                } catch (e) {
                    console.warn(e);
                }
                if (cancel) return;
                setEstudiantes(ordenados);
                setGuardada(previa);

                const caps = aulas.map((a) => a.capacidad);
                if (previa && Array.isArray(previa.aulas) && previa.aulas.length > 0) {
                    const cants = aulas.map((a) => previa.aulas.find((x) => x.idAmbiente === a.idAmbiente)?.cantidad || 0);
                    setModo(previa.modoReparto === "MANUAL" ? "MANUAL" : "EQUILIBRADO");
                    setModoAsignacion(previa.modoAsignacion === "ONLINE" ? "ONLINE" : "SUBDIVISION");
                    setCantidades(cants);
                    const porAula = {};
                    aulas.forEach((a) => {
                        const lista = (previa.responsables || [])
                            .filter((r) => r.idAmbiente === a.idAmbiente)
                            .sort((x, y) => String(x.apellidoDesde).localeCompare(String(y.apellidoDesde)))
                            .map((r, i, arr) => ({
                                idUsuario: r.idUsuario,
                                nombre: r.nombreResponsable || "Responsable",
                                rol: r.rol === "DOCENTE" ? "DOCENTE" : "OPERADOR",
                                hasta: i < arr.length - 1 ? r.apellidoHasta : null,
                            }));
                        porAula[a.idAmbiente] = lista.length ? lista : [{ ...docente, hasta: null }];
                    });
                    setResponsables(porAula);
                    setBase(JSON.stringify(cants));
                    setPaso(3);
                } else {
                    const cants = repartoEquilibrado(ordenados.length, caps);
                    setCantidades(cants);
                    setResponsables({});
                    setBase("");
                    setPaso(soloLectura ? 3 : 1);
                }
            } catch (e) {
                if (!cancel) setErrorCarga(e.message || "No se pudo cargar la información del examen.");
            } finally {
                if (!cancel) setCargando(false);
            }
        }
        cargar();
        return () => { cancel = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examen?.idExamen, examen?.idAsignatura]);

    // Operadores del docente (se recarga al registrar uno nuevo)
    useEffect(() => {
        let cancel = false;
        obtenerOperadoresDisponibles(examen.idExamen)
            .then((lista) => { if (!cancel) { setOperadores(lista); setFallaOperadores(false); } })
            .catch((e) => { console.warn(e); if (!cancel) { setOperadores([]); setFallaOperadores(true); } });
        return () => { cancel = true; };
    }, [examen?.idExamen, numRecargaOperadores]);

    const capacidades = aulas.map((a) => a.capacidad);
    const validacion = validarReparto(cantidades, capacidades, estudiantes.length);
    const bloques = useMemo(() => cortarEnBloques(estudiantes, cantidades), [estudiantes, cantidades]);

    function responsablesDe(idx) {
        const id = aulas[idx].idAmbiente;
        const lista = responsables[id];
        return lista && lista.length ? lista : [{ ...docente, hasta: null }];
    }

    function subBloques(idx) {
        const lista = responsablesDe(idx);
        if (modoAsignacion === "ONLINE") return lista.map(() => bloques[idx] || []);
        return partirPorLetras(bloques[idx], lista.slice(0, -1).map((r) => r.hasta));
    }

    const operadoresEnUso = new Set(
        aulas.flatMap((a, i) => responsablesDe(i).filter((r) => r.rol === "OPERADOR").map((r) => r.idUsuario))
    );

    function fijarResponsables(idx, lista) {
        const id = aulas[idx].idAmbiente;
        const k = lista.length;
        if (modoAsignacion === "ONLINE") {
            setAvisoDivision("");
            setResponsables((prev) => ({
                ...prev,
                [id]: lista.map((r) => ({ ...r, hasta: null })),
            }));
            return true;
        }
        const cortes = cortesEquitativos(bloques[idx], k);
        if (cortes === null) {
            setAvisoDivision(`En el ${aulas[idx].nombre} no hay suficientes apellidos distintos para dividirla entre ${k} responsables.`);
            return false;
        }
        setAvisoDivision("");
        setResponsables((prev) => ({
            ...prev,
            [id]: lista.map((r, i) => ({ ...r, hasta: i < k - 1 ? cortes[i] : null })),
        }));
        return true;
    }

    function agregarResponsable(idx, valor) {
        if (!valor) return;
        const nuevo =
            valor === "DOCENTE"
                ? { ...docente }
                : (() => {
                    const o = operadores.find((x) => String(x.idUsuario) === valor);
                    return o ? { idUsuario: o.idUsuario, nombre: nombreCompleto(o), rol: "OPERADOR" } : null;
                })();
        if (!nuevo) return;
        let actual = responsablesDe(idx);
        // El docente "por defecto" se reemplaza cuando llega el primer operador
        const soloDocentePorDefecto = actual.length === 1 && actual[0].rol === "DOCENTE" && nuevo.rol === "OPERADOR" && !responsables[aulas[idx].idAmbiente];
        if (soloDocentePorDefecto) actual = [];
        fijarResponsables(idx, [...actual, nuevo]);
    }

    function quitarResponsable(idx, iResp) {
        const restantes = responsablesDe(idx).filter((_, i) => i !== iResp);
        if (restantes.length === 0) {
            setAvisoDivision("");
            setResponsables((prev) => { const copia = { ...prev }; delete copia[aulas[idx].idAmbiente]; return copia; });
            return;
        }
        fijarResponsables(idx, restantes);
    }

    function cambiarHasta(idx, iResp, letra) {
        if (modoAsignacion === "ONLINE") return;
        const id = aulas[idx].idAmbiente;
        const letras = letrasDeBloque(bloques[idx]);
        const lista = responsablesDe(idx).map((r) => ({ ...r }));
        lista[iResp].hasta = letra;
        for (let j = iResp + 1; j < lista.length - 1; j++) {
            const previo = letras.indexOf(lista[j - 1].hasta);
            if (letras.indexOf(lista[j].hasta) <= previo) lista[j].hasta = letras[previo + 1];
        }
        setResponsables((prev) => ({ ...prev, [id]: lista }));
    }

    function dividirTodasEnPartesIguales() {
        if (modoAsignacion === "ONLINE") return;
        let ok = true;
        aulas.forEach((_, idx) => {
            const lista = responsablesDe(idx);
            if (lista.length > 1 && !fijarResponsables(idx, lista)) ok = false;
        });
        if (ok) setAvisoDivision("");
    }

    function elegirModo(nuevo) {
        setModo(nuevo);
        if (nuevo === "EQUILIBRADO") setCantidades(repartoEquilibrado(estudiantes.length, capacidades));
    }

    function elegirModoAsignacion(nuevo) {
        setModoAsignacion(nuevo);
        setAvisoDivision("");
        if (nuevo === "ONLINE") {
            setResponsables((prev) => Object.fromEntries(Object.entries(prev).map(([id, lista]) => [
                id,
                lista.map((r) => ({ ...r, hasta: null })),
            ])));
        } else {
            setResponsables((prev) => Object.fromEntries(Object.entries(prev).map(([id, lista]) => {
                const idx = aulas.findIndex((a) => String(a.idAmbiente) === String(id));
                const cortes = idx >= 0 ? cortesEquitativos(bloques[idx], lista.length) : null;
                return [id, cortes === null ? lista : lista.map((r, i) => ({ ...r, hasta: i < lista.length - 1 ? cortes[i] : null }))];
            })));
        }
    }

    function irAPaso2() {
        const firma = JSON.stringify(cantidades);
        if (firma !== base) {
            setResponsables({});
            setBase(firma);
        }
        setPaso(2);
    }

    const filasResumen = aulas.flatMap((aula, idx) => {
        if (!cantidades[idx]) return [];
        const subs = subBloques(idx);
        return responsablesDe(idx).map((r, i) => ({
            aula: aula.nombre,
            idAmbiente: aula.idAmbiente,
            responsable: r,
            rango: rangoLetras(subs[i]),
            cantidad: subs[i].length,
            estudiantes: subs[i],
        }));
    });

    async function guardar() {
        setGuardando(true);
        setErrorGuardar("");
        try {
            await guardarAsignacionIngreso(examen.idExamen, {
                modoReparto: modo,
                modoAsignacion,
                aulas: aulas.map((a, i) => ({ idAmbiente: a.idAmbiente, cantidad: Number(cantidades[i]) || 0 })),
                responsables: filasResumen.map((f) => ({
                    idAmbiente: f.idAmbiente,
                    idUsuario: f.responsable.idUsuario,
                    rol: f.responsable.rol,
                    nombreResponsable: f.responsable.nombre,
                    apellidoDesde: modoAsignacion === "ONLINE" ? null : (f.estudiantes.length ? inicialApellido(f.estudiantes[0]) : null),
                    apellidoHasta: modoAsignacion === "ONLINE" ? null : (f.estudiantes.length ? inicialApellido(f.estudiantes[f.estudiantes.length - 1]) : null),
                    codSisEstudiantes: f.estudiantes.map((e) => e.codSisEstudiante),
                })),
            });
            onVolver();
        } catch (e) {
            setErrorGuardar(e.message || "No se pudo guardar la asignación.");
        } finally {
            setGuardando(false);
        }
    }

    const editando = Boolean(guardada);
    const titulo = soloLectura ? "Ayudantes del examen" : editando ? "Editar ayudantes" : "Asignar ayudantes"
    const horaTxt = examen?.horaInicio || "la hora de inicio";

    const encabezado = (
        <div>
            <button type="button" onClick={onVolver} className="text-sm font-bold text-[#003770] hover:underline cursor-pointer">
                ← Volver a {strTextoVolver}
            </button>
            <h1 className="text-3xl font-black text-[#1A365D] mt-1">{titulo}</h1>
            <p className="text-[15px] text-slate-600 mt-1">
                {examen?.nombreExamen}{examen?.tipoExamen ? ` · ${examen.tipoExamen}` : ""} · {examen?.horario}
                {estudiantes.length ? ` · ${estudiantes.length} estudiantes inscritos` : ""}
            </p>
        </div>
    );

    if (cargando) {
        return (
            <div className="space-y-4">
                {encabezado}
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-[15px] font-semibold text-slate-500 animate-pulse">
                    Cargando información del examen...
                </div>
            </div>
        );
    }

    if (errorCarga || aulas.length === 0 || estudiantes.length === 0) {
        return (
            <div className="space-y-4">
                {encabezado}
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-5 text-[15px] text-slate-700">
                    <b className="text-[#B91C1C]">No se puede asignar ayudantes todavía.</b>{" "}
                    {errorCarga
                        ? errorCarga
                        : aulas.length === 0
                            ? "El examen no tiene aulas asignadas."
                            : "La asignatura aún no tiene estudiantes inscritos."}
                </div>
            </div>
        );
    }

    const hayOperadores = operadores.length > 0;

    return (
        <div className="space-y-5">
            {encabezado}
            {!soloLectura && <Pasos pasoActivo={paso} bloquearPaso1={editando} onIr={setPaso} />}

            {soloLectura && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-5 py-3.5 text-[15px] text-slate-700 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#003770] shrink-0" />
                    <span><b className="text-[#003770]">La asignación está bloqueada</b> porque el examen ya empezó.</span>
                </div>
            )}

            {!soloLectura && editando && paso === 3 && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-5 py-3.5 text-[15px] text-slate-700">
                    <b className="text-[#003770]">Puedes editar esta asignación hasta las {horaTxt},</b> cuando empieza el examen. Después quedará bloqueada.
                </div>
            )}

            {/* PASO 1 */}
            {paso === 1 && !soloLectura && (
                <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-xl font-black text-[#1A365D]">¿Cómo se reparten los estudiantes?</h2>
                        <p className="text-[15px] text-slate-500 mt-1">Los inscritos se ordenan por apellido y se dividen en bloques seguidos, uno por aula.</p>
                        <div className="grid sm:grid-cols-2 gap-3 mt-4">
                            {[
                                { id: "EQUILIBRADO", t: "Equilibrado", d: `Mismo número en cada aula (${cantidades.length ? repartoEquilibrado(estudiantes.length, capacidades).join(" y ") : ""}).`, rec: true },
                                { id: "MANUAL", t: "Manual", d: "Tú eliges cuántos van en cada aula." },
                            ].map((op) => (
                                <button
                                    key={op.id}
                                    type="button"
                                    onClick={() => elegirModo(op.id)}
                                    className={`text-left rounded-2xl p-4 cursor-pointer transition border-2 ${modo === op.id ? "border-[#003770] bg-[#EFF6FF]" : "border-[#CBD5E1] bg-white hover:bg-slate-50"}`}
                                >
                                    <span className="font-black text-base text-[#1A365D]">{op.t}</span>{" "}
                                    {op.rec && <Pildora>Recomendado</Pildora>}
                                    <p className="text-[14px] text-slate-600 mt-1">{op.d}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    {aulas.map((aula, idx) => (
                        <div key={aula.idAmbiente} className="flex items-center gap-4 px-6 py-4 border-t border-slate-200 flex-wrap">
                            <span className="w-11 h-11 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-[#003770]" />
                            </span>
                            <div className="flex-1 min-w-40">
                                <p className="font-black text-lg text-[#1A365D]">{aula.nombre}</p>
                                <p className="text-[14px] text-slate-500">
                                    {aula.ubicacion ? `${aula.ubicacion} · ` : ""}{aula.capacidad != null ? `capacidad ${aula.capacidad}` : "capacidad sin definir"}
                                </p>
                            </div>
                            <label className="flex items-center gap-2.5 text-[15px] text-slate-600">
                                Estudiantes
                                <input
                                    type="number"
                                    min="0"
                                    value={cantidades[idx] ?? 0}
                                    readOnly={modo === "EQUILIBRADO"}
                                    onChange={(e) => {
                                        const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                                        setCantidades((prev) => prev.map((c, i) => (i === idx ? v : c)));
                                    }}
                                    className={`w-24 h-11 rounded-xl text-center text-xl font-black text-[#1A365D] border-[1.5px] ${modo === "EQUILIBRADO" ? "border-[#CBD5E1] bg-slate-50" : "border-[#003770] bg-white"} outline-none focus:ring-2 focus:ring-[#003770]/20`}
                                />
                            </label>
                            <div className="w-40 text-right">
                                <Pildora>Apellidos {rangoLetras(bloques[idx])}</Pildora>
                            </div>
                        </div>
                    ))}
                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                        <span className={`text-[15px] ${validacion.ok ? "text-slate-700" : "text-[#B91C1C] font-bold"}`}>{validacion.mensaje}</span>
                        <BotonPrincipal disabled={!validacion.ok} onClick={irAPaso2}>Siguiente: ayudantes →</BotonPrincipal>
                    </div>
                </section>
            )}

            {/* PASO 2 */}
            {paso === 2 && !soloLectura && (
                <>
                    {!hayOperadores && (
                        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-60">
                                <p className="font-black text-base text-[#B91C1C]">
                                    {fallaOperadores
                                        ? (boolVistaAdmin ? "No se pudo cargar la lista de ayudantes del docente." : "No se pudo cargar tu lista de ayudantes.")
                                        : (boolVistaAdmin ? "El docente aún no tiene ayudantes registrados." : "Aún no tienes ayudantes registrados.")}
                                </p>
                                <p className="text-[15px] text-slate-700 mt-0.5">
                                    {boolVistaAdmin
                                        ? "Solo se pueden asignar ayudantes registrados en los grupos del docente. Mientras no tenga, el docente atiende todas las aulas."
                                        : "Solo puedes asignar ayudantes que hayas registrado en tus grupos. Mientras no tengas, tú atiendes todas las aulas."}
                                </p>
                            </div>
                            {onRegistrarOperador && <BotonPrincipal onClick={onRegistrarOperador}>Registrar ayudante</BotonPrincipal>}
                        </div>
                    )}
                    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                        <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-xl font-black text-[#1A365D]">¿Quién atiende cada aula?</h2>
                                <p className="text-[15px] text-slate-500 mt-1">
                                    {hayOperadores
                                        ? modoAsignacion === "ONLINE"
                                            ? "Todos los operadores seleccionados podrán gestionar cualquier estudiante del aula."
                                            : "Un responsable atiende toda el aula. Con dos o más, el rango de apellidos se divide entre ellos."
                                        : (boolVistaAdmin ? "Con los ayudantes del docente podrás dividir el rango de cada aula entre ellos." : "Con tus ayudantes registrados podrás dividir el rango de cada aula entre ellos.")}
                                </p>
                            </div>
                            {hayOperadores && modoAsignacion === "SUBDIVISION" && <BotonSecundario onClick={dividirTodasEnPartesIguales}>Dividir en partes iguales</BotonSecundario>}
                        </div>
                        <div className="px-6 pb-4">
                            <div className="grid sm:grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Tipo de asignación">
                                {[
                                    { id: "ONLINE", t: "Lista completa", d: "Todos atienden a cualquier estudiante del aula." },
                                    { id: "SUBDIVISION", t: "Subdivisión por apellido", d: "Cada operador atiende un rango de apellidos." },
                                ].map((op) => (
                                    <button
                                        key={op.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={modoAsignacion === op.id}
                                        onClick={() => elegirModoAsignacion(op.id)}
                                        className={`text-left rounded-xl px-4 py-3 transition ${modoAsignacion === op.id ? "bg-white shadow-sm ring-1 ring-[#003770]" : "text-slate-600 hover:bg-white/70"}`}
                                    >
                                        <span className="block font-black text-[15px] text-[#1A365D]">{op.t}</span>
                                        <span className="block text-[13px] mt-0.5">{op.d}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[13px] text-slate-500 mt-2">Solo puedes guardar una modalidad para este examen.</p>
                        </div>
                        {avisoDivision && <div className="px-6 pb-3 text-[14px] font-bold text-[#B91C1C]">{avisoDivision}</div>}

                        {aulas.map((aula, idx) => {
                            if (!cantidades[idx]) return null;
                            const lista = responsablesDe(idx);
                            const subs = subBloques(idx);
                            const letras = letrasDeBloque(bloques[idx]);
                            const disponibles = operadores.filter((o) => !operadoresEnUso.has(o.idUsuario));
                            const docenteYaEsta = lista.some((r) => r.rol === "DOCENTE");
                            return (
                                <div key={aula.idAmbiente}>
                                    <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center gap-3.5 flex-wrap">
                                        <span className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5 text-[#003770]" />
                                        </span>
                                        <p className="flex-1 min-w-40 font-black text-[17px] text-[#1A365D]">
                                            {aula.nombre} <span className="font-medium text-[15px] text-slate-500">{aula.ubicacion ? `· ${aula.ubicacion}` : ""}</span>
                                        </p>
                                        <Pildora>{modoAsignacion === "ONLINE" ? "Lista completa" : `Apellidos ${rangoLetras(bloques[idx])}`}</Pildora>
                                        <b className="text-[15px] text-slate-600">{cantidades[idx]} estudiantes</b>
                                    </div>
                                    {lista.map((r, i) => {
                                        const ultimo = i === lista.length - 1;
                                        const prevIdx = i === 0 ? -1 : letras.indexOf(lista[i - 1].hasta);
                                        const maxIdx = letras.length - 1 - (lista.length - 1 - i);
                                        const opciones = letras.slice(prevIdx + 1, maxIdx + 1);
                                        const desde = subs[i][0] ? inicialApellido(subs[i][0]) : "—";
                                        return (
                                            <div key={`${r.rol}-${r.idUsuario}`} className="flex items-center gap-4 px-6 py-3 border-t border-slate-200 flex-wrap">
                                                <span className={`w-10 h-10 rounded-full text-white font-black text-sm flex items-center justify-center shrink-0 ${r.rol === "DOCENTE" ? "bg-[#B91C1C]" : "bg-[#003770]"}`}>
                                                    {iniciales(r.nombre)}
                                                </span>
                                                <div className="w-52">
                                                    <p className="font-black text-base text-[#1A365D] leading-tight">{r.rol === "DOCENTE" && !boolVistaAdmin ? `Yo (${r.nombre})` : r.nombre}</p>
                                                    <p className="text-[13px] text-slate-500">{r.rol === "DOCENTE" ? "Docente" : "Ayudante"}</p>
                                                </div>
                                                {modoAsignacion === "ONLINE" ? (
                                                    <span className="flex items-center gap-2 text-[15px] text-slate-500">
                                                        Atiende toda el aula <Pildora tipo="gris">{cantidades[idx]} estudiantes</Pildora>
                                                    </span>
                                                ) : lista.length === 1 ? (
                                                    <span className="flex items-center gap-2 text-[15px] text-slate-500">
                                                        Atiende toda el aula <Pildora tipo="gris">{rangoLetras(bloques[idx])}</Pildora>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-[15px] text-slate-500">
                                                        Apellidos de
                                                        <span className="h-10 min-w-12 px-3 rounded-xl border-[1.5px] border-[#E2E8F0] bg-slate-50 flex items-center justify-center font-bold text-slate-700">{desde}</span>
                                                        a
                                                        {ultimo ? (
                                                            <span className="h-10 min-w-12 px-3 rounded-xl border-[1.5px] border-[#E2E8F0] bg-slate-50 flex items-center justify-center font-bold text-slate-700">
                                                                {subs[i].length ? inicialApellido(subs[i][subs[i].length - 1]) : "—"}
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={r.hasta || ""}
                                                                onChange={(e) => cambiarHasta(idx, i, e.target.value)}
                                                                className="h-10 min-w-16 px-3 rounded-xl border-[1.5px] border-[#CBD5E1] bg-white font-bold text-[15px] text-[#1A365D] cursor-pointer"
                                                            >
                                                                {opciones.map((l) => <option key={l} value={l}>{l}</option>)}
                                                            </select>
                                                        )}
                                                    </span>
                                                )}
                                                <div className="flex-1" />
                                                <b className="text-[15px] text-slate-600">{subs[i].length} estudiantes</b>
                                                {lista.length > 1 || r.rol === "OPERADOR" ? (
                                                    <button type="button" onClick={() => quitarResponsable(idx, i)} aria-label="Quitar responsable" className="text-slate-400 hover:text-[#B91C1C] text-2xl leading-none px-1 cursor-pointer">×</button>
                                                ) : <span className="w-6" />}
                                            </div>
                                        );
                                    })}
                                    <div className="px-6 py-3 border-t border-slate-200 flex items-center gap-3 flex-wrap">
                                        <select
                                            value=""
                                            onChange={(e) => agregarResponsable(idx, e.target.value)}
                                            disabled={disponibles.length === 0 && docenteYaEsta}
                                            className="h-10 px-3 rounded-xl border-[1.5px] border-[#CBD5E1] bg-white font-bold text-[14.5px] text-[#003770] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">+ Agregar responsable</option>
                                            {!docenteYaEsta && <option value="DOCENTE">{boolVistaAdmin ? docente.nombre : `Yo (${docente.nombre})`} · Docente</option>}
                                            {disponibles.map((o) => <option key={o.idUsuario} value={String(o.idUsuario)}>{nombreCompleto(o)} · Ayudante</option>)}
                                        </select>
                                        <span className="text-[14px] text-slate-500">{boolVistaAdmin ? "ayudante o el docente" : "ayudante o yo (docente)"}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
                            <BotonSecundario onClick={() => setPaso(editando ? 3 : 1)}>← Atrás</BotonSecundario>
                            <BotonPrincipal onClick={() => setPaso(3)}>Siguiente: resumen →</BotonPrincipal>
                        </div>
                    </section>
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-5 py-3.5 text-[15px] text-slate-700">
                        {boolVistaAdmin ? (
                            <><b className="text-[#003770]">Si un aula queda sin ayudante,</b> la atiende el docente. El administrador puede entrar a cualquier aula sin estar en la lista.</>
                        ) : (
                            <><b className="text-[#003770]">Si un aula queda sin ayudante,</b> la atiendes tú como docente. El administrador puede entrar a cualquier aula sin estar en la lista.</>
                        )}
                    </div>
                </>
            )}

            {/* PASO 3 */}
            {(paso === 3 || soloLectura) && (
                <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                    <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-xl font-black text-[#1A365D]">{editando ? "Asignación actual" : "Resumen de la asignación"}</h2>
                            <p className="text-[15px] text-slate-500 mt-1">
                                {soloLectura
                                    ? "Así quedó repartido el ingreso de este examen."
                                    : editando
                                        ? "Puedes cambiar quién atiende cada aula y cómo se dividen los apellidos."
                                        : "Revisa antes de guardar. Podrás editarla hasta que empiece el examen."}
                            </p>
                        </div>
                        {editando && !soloLectura && <BotonSecundario onClick={() => setPaso(2)}>Cambiar ayudantes</BotonSecundario>}
                    </div>
                    {soloLectura && !guardada ? (
                        <div className="px-6 pb-6 text-[15px] text-slate-600">No se asignaron ayudantes: el docente atiende el ingreso de todas las aulas.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[15px] min-w-[560px]">
                                <thead>
                                    <tr className="bg-slate-50 text-[13px] font-bold text-slate-500 tracking-wide text-left">
                                        <th className="px-6 py-2.5 border-t border-slate-200">AULA</th>
                                        <th className="px-3 py-2.5 border-t border-slate-200">RESPONSABLE</th>
                                        <th className="px-3 py-2.5 border-t border-slate-200">ROL</th>
                                        <th className="px-3 py-2.5 border-t border-slate-200">APELLIDOS</th>
                                        <th className="px-6 py-2.5 border-t border-slate-200 text-right">ESTUDIANTES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasResumen.map((f, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-3.5 border-t border-slate-200 font-black text-[#1A365D]">{f.aula}</td>
                                            <td className="px-3 py-3.5 border-t border-slate-200">{f.responsable.rol === "DOCENTE" && !boolVistaAdmin ? `${f.responsable.nombre} (yo)` : f.responsable.nombre}</td>
                                            <td className="px-3 py-3.5 border-t border-slate-200">
                                                <Pildora tipo={f.responsable.rol === "DOCENTE" ? "rojo" : "azul"}>{f.responsable.rol === "DOCENTE" ? "Docente" : "Ayudante"}</Pildora>
                                            </td>
                                            <td className="px-3 py-3.5 border-t border-slate-200 text-slate-700">{f.rango}</td>
                                            <td className="px-6 py-3.5 border-t border-slate-200 text-right font-black">{f.cantidad}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {errorGuardar && <div className="px-6 py-3 border-t border-slate-200 text-[14.5px] font-bold text-[#B91C1C]">{errorGuardar}</div>}
                    {!soloLectura && (
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
                            {editando ? <BotonSecundario onClick={onVolver}>Cancelar</BotonSecundario> : <BotonSecundario onClick={() => setPaso(2)}>← Atrás</BotonSecundario>}
                            <BotonPrincipal disabled={guardando} onClick={guardar}>
                                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Guardar asignación"}
                            </BotonPrincipal>
                        </div>
                    )}
                </section>
            )}

            {!soloLectura && editando && paso === 3 && (
                <p className="text-[14px] text-slate-500 px-1">El reparto de estudiantes por aula queda fijo una vez guardado, porque cada estudiante ya tiene su aula asignada.</p>
            )}
        </div>
    );
}
