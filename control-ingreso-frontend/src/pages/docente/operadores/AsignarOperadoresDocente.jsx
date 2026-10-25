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
    partirPorLetras,
    cortesEquitativos,
    inicialApellido,
} from "./utilidadesAsignacion";

const PASOS = ["Aulas", "Ayudantes", "Resumen"];
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function siguienteLetra(l) {
    const i = ALFABETO.indexOf(l);
    return i >= 0 && i < ALFABETO.length - 1 ? ALFABETO[i + 1] : l || "A";
}

function textoRango(desde, hasta) {
    if (!desde) return "—";
    return desde === hasta ? desde : `${desde} – ${hasta}`;
}

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
            className="h-9 px-4 rounded-xl bg-[#003770] text-white font-bold text-xs hover:bg-[#124B83] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="h-9 px-4 rounded-xl bg-white border border-[#CBD5E1] text-[#003770] font-bold text-xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
            {children}
        </button>
    );
}

function Etiqueta({ children }) {
    return <span className="inline-flex items-center rounded-full font-extrabold text-[11px] px-2.5 py-0.5 bg-[#E8F1FB] text-[#003770] whitespace-nowrap">{children}</span>;
}

function IconoAula() {
    return (
        <span className="w-7 h-7 rounded-lg bg-[#003770] text-white flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" />
        </span>
    );
}

function Pasos({ pasoActivo, bloquearPaso1, onIr }) {
    return (
        <div className="flex items-center gap-2 mt-3">
            {PASOS.map((strPaso, i) => {
                const n = i + 1;
                const hecho = n < pasoActivo;
                const actual = n === pasoActivo;
                const puedeIr = hecho && !(n === 1 && bloquearPaso1);
                return (
                    <div key={strPaso} className="flex items-center gap-2 flex-1 last:flex-none min-w-0">
                        <button
                            type="button"
                            disabled={!puedeIr}
                            onClick={() => puedeIr && onIr(n)}
                            className={`flex items-center gap-1.5 text-xs font-extrabold ${hecho || actual ? "text-[#003770]" : "text-slate-400"} ${puedeIr ? "cursor-pointer hover:underline" : "cursor-default"}`}
                        >
                            <span className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center text-[11px] ${hecho || actual ? "bg-[#003770] border-[#003770] text-white" : "bg-white border-[#CBD5E1] text-slate-400"}`}>
                                {hecho ? <Check className="w-3 h-3" strokeWidth={3} /> : n}
                            </span>
                            {strPaso}
                        </button>
                        {i < PASOS.length - 1 && <div className={`flex-1 h-0.5 min-w-4 ${n < pasoActivo ? "bg-[#003770]" : "bg-[#CBD5E1]"}`} />}
                    </div>
                );
            })}
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
    // Con internet todos registran a cualquier estudiante del aula; el reparto por apellidos
    // se guarda siempre y solo se usa sin internet.
    const modoAsignacion = "SUBDIVISION";
    const [idAulaAjustando, setIdAulaAjustando] = useState(null);
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
                const lista = await obtenerHabilitaciones(examen.idAsignatura, examen.idExamen);
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
                    // El endpoint histórico devuelve la capacidad física del aula,
                    // no la cantidad de inscritos. La distribución debe basarse en
                    // la nómina real del examen para no mostrar, por ejemplo, 40
                    // estudiantes cuando solo hay 15 habilitados.
                    const guardadas = aulas.map((a) => previa.aulas.find((x) => x.idAmbiente === a.idAmbiente)?.cantidad || 0);
                    const sumaGuardada = guardadas.reduce((suma, cantidad) => suma + Number(cantidad || 0), 0);
                    const cants = sumaGuardada === ordenados.length && guardadas.every((cantidad, i) => caps[i] == null || Number(cantidad) <= caps[i])
                        ? guardadas
                        : repartoEquilibrado(ordenados.length, caps);
                    setModo(previa.modoReparto === "MANUAL" ? "MANUAL" : "EQUILIBRADO");
                    setCantidades(cants);
                    const bloquesCarga = cortarEnBloques(ordenados, cants);
                    const porAula = {};
                    aulas.forEach((a, idxAula) => {
                        const lista = (previa.responsables || [])
                            .filter((r) => r.idAmbiente === a.idAmbiente)
                            .sort((x, y) => String(x.apellidoDesde).localeCompare(String(y.apellidoDesde)))
                            .map((r, i, arr) => ({
                                idUsuario: r.idUsuario,
                                nombre: r.nombreResponsable || "Responsable",
                                rol: r.rol === "DOCENTE" ? "DOCENTE" : "OPERADOR",
                                hasta: i < arr.length - 1 ? r.apellidoHasta : null,
                            }));
                        // Asignaciones antiguas guardadas como "lista completa" no traen cortes: se reparten en partes iguales
                        const faltanCortes = lista.length > 1 && lista.slice(0, -1).some((r) => !r.hasta);
                        const cortes = faltanCortes ? cortesEquitativos(bloquesCarga[idxAula] || [], lista.length) : null;
                        const listaFinal = cortes ? lista.map((r, i) => ({ ...r, hasta: i < lista.length - 1 ? cortes[i] : null })) : lista;
                        porAula[a.idAmbiente] = listaFinal.length ? listaFinal : [{ ...docente, hasta: null }];
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
        return partirPorLetras(bloques[idx], lista.slice(0, -1).map((r) => r.hasta));
    }

    const operadoresEnUso = new Set(
        aulas.flatMap((a, i) => responsablesDe(i).filter((r) => r.rol === "OPERADOR").map((r) => r.idUsuario))
    );

    function fijarResponsables(idx, lista) {
        const id = aulas[idx].idAmbiente;
        const k = lista.length;
        const cortes = cortesEquitativos(bloques[idx], k);
        if (cortes === null) {
            setAvisoDivision(`En el ${aulas[idx].nombre} no hay suficientes apellidos distintos para repartirlos entre ${k} personas.`);
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

    // Cambia la letra de corte de una persona (cualquier letra de la A a la Z dentro del tramo del aula)
    // y corre las siguientes si quedaron antes de la nueva letra
    function cambiarHasta(idx, iResp, letra) {
        const id = aulas[idx].idAmbiente;
        const lista = responsablesDe(idx).map((r) => ({ ...r }));
        lista[iResp].hasta = letra;
        for (let j = iResp + 1; j < lista.length - 1; j++) {
            const previo = ALFABETO.indexOf(lista[j - 1].hasta);
            if (ALFABETO.indexOf(lista[j].hasta) <= previo) lista[j].hasta = ALFABETO[previo + 1];
        }
        setResponsables((prev) => ({ ...prev, [id]: lista }));
    }

    // "Volver a partes iguales" de un aula
    function partesIgualesAula(idx) {
        fijarResponsables(idx, responsablesDe(idx));
    }

    function elegirModo(nuevo) {
        setModo(nuevo);
        if (nuevo === "EQUILIBRADO") setCantidades(repartoEquilibrado(estudiantes.length, capacidades));
    }

    function irAPaso2() {
        const firma = JSON.stringify(cantidades);
        if (firma !== base) {
            setResponsables({});
            setBase(firma);
        }
        setPaso(2);
    }

    // Tramos de A a Z: la primera aula empieza en A, la última termina en Z y no quedan huecos entre tramos
    const rangosAulas = (() => {
        const res = aulas.map(() => null);
        const idxs = aulas.map((_, k) => k).filter((k) => cantidades[k] && bloques[k]?.length);
        let prevHasta = null;
        idxs.forEach((k, n) => {
            const b = bloques[k];
            const primera = inicialApellido(b[0]);
            const ultima = inicialApellido(b[b.length - 1]);
            const desde = prevHasta == null ? "A" : primera === prevHasta ? primera : siguienteLetra(prevHasta);
            const hasta = n === idxs.length - 1 ? "Z" : ultima;
            res[k] = { desde, hasta };
            prevHasta = ultima;
        });
        return res;
    })();

    function rangosPersonas(idx) {
        const lista = responsablesDe(idx);
        const subs = subBloques(idx);
        const aulaR = rangosAulas[idx] || { desde: "A", hasta: "Z" };
        let prevHasta = null;
        return lista.map((r, j) => {
            const sub = subs[j] || [];
            const primera = sub.length ? inicialApellido(sub[0]) : null;
            const ultima = sub.length ? inicialApellido(sub[sub.length - 1]) : null;
            const desde = j === 0 ? aulaR.desde : primera && primera === prevHasta ? primera : siguienteLetra(prevHasta);
            const hasta = j === lista.length - 1 ? aulaR.hasta : r.hasta || ultima || desde;
            prevHasta = hasta;
            return { desde, hasta };
        });
    }

    const filasResumen = aulas.flatMap((aula, idx) => {
        if (!cantidades[idx]) return [];
        const subs = subBloques(idx);
        const rangos = rangosPersonas(idx);
        return responsablesDe(idx).map((r, i) => ({
            aula: aula.nombre,
            idAmbiente: aula.idAmbiente,
            responsable: r,
            desde: rangos[i].desde,
            hasta: rangos[i].hasta,
            rango: textoRango(rangos[i].desde, rangos[i].hasta),
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
                    apellidoDesde: f.desde,
                    apellidoHasta: f.hasta,
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
    const titulo = soloLectura ? "Ayudantes del examen" : editando ? "Editar ayudantes" : "Asignar ayudantes";
    const horaTxt = examen?.horaInicio || "la hora de inicio";
    const boolHayAulaSinAyudante = aulas.some((a, idx) => cantidades[idx] && !responsables[a.idAmbiente]);

    const encabezado = (
        <div>
            <button type="button" onClick={onVolver} className="text-xs font-bold text-[#003770] hover:underline cursor-pointer">
                ← Volver a {strTextoVolver}
            </button>
            <h1 className="text-2xl font-black text-[#1A365D] mt-1">{titulo}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
                {[examen?.nombreExamen, examen?.tipoExamen, examen?.horario].filter(Boolean).join(" · ")}
            </p>
        </div>
    );

    if (cargando) {
        return (
            <div className="space-y-4">
                {encabezado}
                <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 text-center text-xs font-semibold text-slate-500 animate-pulse">
                    Cargando información del examen...
                </div>
            </div>
        );
    }

    if (errorCarga || aulas.length === 0 || estudiantes.length === 0) {
        return (
            <div className="space-y-4">
                {encabezado}
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 text-sm text-slate-700">
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
        <div className="space-y-4 text-[#08264A]">
            {encabezado}
            {!soloLectura && <Pasos pasoActivo={paso} bloquearPaso1={editando} onIr={setPaso} />}

            {soloLectura && (
                <div className="bg-[#F0F6FC] border border-[#D9E8F7] rounded-xl px-4 py-2.5 text-xs text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#003770] shrink-0" />
                    La asignación está bloqueada porque el examen ya empezó.
                </div>
            )}

            {!soloLectura && editando && paso === 3 && (
                <div className="bg-[#F0F6FC] border border-[#D9E8F7] rounded-xl px-4 py-2.5 text-xs text-slate-700">
                    Puedes editar esta asignación hasta las <b className="text-[#003770]">{horaTxt}</b>.
                </div>
            )}

            {/* PASO 1 · Estudiantes por aula */}
            {paso === 1 && !soloLectura && (
                <section className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden">
                    <div className="bg-[#F0F6FC] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-sm font-extrabold">Estudiantes por aula</h2>
                        <div role="group" aria-label="Forma de reparto" className="inline-flex gap-0.5 p-[3px] rounded-[9px] bg-white border border-[#D9E8F7]">
                            {[["EQUILIBRADO", "Equilibrado"], ["MANUAL", "Manual"]].map(([id, t]) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={modo === id}
                                    onClick={() => elegirModo(id)}
                                    className={`px-3 h-7 rounded-[7px] text-xs font-extrabold cursor-pointer ${modo === id ? "bg-[#003770] text-white" : "text-[#475569] hover:text-[#003770]"}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    {aulas.map((aula, idx) => (
                        <div key={aula.idAmbiente} className="flex items-center gap-3 px-4 py-2.5 border-t border-[#E2E8F0]">
                            <IconoAula />
                            <span className="flex-1 min-w-0 text-sm font-bold truncate">{aula.nombre}</span>
                            <input
                                type="number"
                                min="0"
                                aria-label={`Estudiantes en ${aula.nombre}`}
                                value={cantidades[idx] ?? 0}
                                readOnly={modo === "EQUILIBRADO"}
                                onChange={(e) => {
                                    const v = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setCantidades((prev) => prev.map((c, i) => (i === idx ? v : c)));
                                }}
                                className={`w-16 h-8 rounded-lg text-center text-sm font-black border outline-none focus:ring-2 focus:ring-[#003770]/20 ${modo === "EQUILIBRADO" ? "border-[#CBD5E1] bg-slate-50" : "border-[#003770] bg-white"}`}
                            />
                            <span className="w-16 text-right">
                                <Etiqueta>{rangosAulas[idx] ? textoRango(rangosAulas[idx].desde, rangosAulas[idx].hasta) : "—"}</Etiqueta>
                            </span>
                        </div>
                    ))}
                    <div className="bg-slate-50 border-t border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                        <span className={`text-xs ${validacion.ok ? "text-slate-500" : "text-[#B91C1C] font-bold"}`}>
                            {validacion.ok ? `${estudiantes.length} de ${estudiantes.length} ubicados` : validacion.mensaje}
                        </span>
                        <BotonPrincipal disabled={!validacion.ok} onClick={irAPaso2}>Siguiente →</BotonPrincipal>
                    </div>
                </section>
            )}

            {/* PASO 2 · Ayudantes por aula */}
            {paso === 2 && !soloLectura && (
                <>
                    {!hayOperadores && (
                        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap">
                            <p className="flex-1 min-w-60 text-xs text-slate-700">
                                <b className="text-[#B91C1C]">
                                    {fallaOperadores
                                        ? (boolVistaAdmin ? "No se pudo cargar la lista de ayudantes del docente." : "No se pudo cargar tu lista de ayudantes.")
                                        : (boolVistaAdmin ? "El docente aún no tiene ayudantes registrados." : "Aún no tienes ayudantes registrados.")}
                                </b>
                            </p>
                            {onRegistrarOperador && <BotonPrincipal onClick={onRegistrarOperador}>Registrar ayudante</BotonPrincipal>}
                        </div>
                    )}
                    <section className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden">
                        {avisoDivision && <div className="px-4 pt-3 text-xs font-bold text-[#B91C1C]">{avisoDivision}</div>}

                        {aulas.map((aula, idx) => {
                            if (!cantidades[idx]) return null;
                            const lista = responsablesDe(idx);
                            const subs = subBloques(idx);
                            const rangos = rangosPersonas(idx);
                            const aulaR = rangosAulas[idx] || { desde: "A", hasta: "Z" };
                            const disponibles = operadores.filter((o) => !operadoresEnUso.has(o.idUsuario));
                            const docenteYaEsta = lista.some((r) => r.rol === "DOCENTE");
                            const ajustando = idAulaAjustando === aula.idAmbiente && lista.length > 1;
                            const nombreDe = (r) => (r.rol === "DOCENTE" ? (boolVistaAdmin ? `${r.nombre} (docente)` : "Yo (docente)") : r.nombre);
                            return (
                                <div key={aula.idAmbiente} className={`px-4 py-3 ${idx === aulas.findIndex((_, k) => cantidades[k]) ? "" : "border-t border-[#E2E8F0]"}`}>
                                    <div className="flex items-center gap-2.5">
                                        <IconoAula />
                                        <span className="flex-1 min-w-0 text-sm font-extrabold truncate">{aula.nombre}</span>
                                        {lista.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setIdAulaAjustando(ajustando ? null : aula.idAmbiente)}
                                                className="text-xs font-extrabold text-[#003770] hover:underline cursor-pointer"
                                            >
                                                {ajustando ? "Listo" : "Ajustar letras"}
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-1.5">
                                        {lista.map((r, i) => {
                                            const ultimo = i === lista.length - 1;
                                            // Todas las letras posibles: desde donde empieza esta persona hasta dejar
                                            // al menos una letra a cada una de las siguientes
                                            const minIdx = ALFABETO.indexOf(rangos[i].desde);
                                            const maxIdx = ALFABETO.indexOf(aulaR.hasta) - (lista.length - 1 - i);
                                            const opciones = ALFABETO.slice(Math.max(0, minIdx), maxIdx + 1).split("");
                                            return (
                                                <div key={`${r.rol}-${r.idUsuario}`} className={`flex items-center gap-2.5 py-1.5 ${i === 0 ? "" : "border-t border-[#EEF2F7]"}`}>
                                                    <span className={`w-[26px] h-[26px] shrink-0 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center ${r.rol === "DOCENTE" ? "bg-[#B91C1C]" : "bg-[#003770]"}`}>
                                                        {iniciales(r.nombre)}
                                                    </span>
                                                    <span className="flex-1 min-w-0 text-[13px] font-bold truncate">{nombreDe(r)}</span>
                                                    {ajustando && !ultimo ? (
                                                        <span className="shrink-0 flex items-center gap-1 text-xs font-extrabold text-[#003770]">
                                                            {rangos[i].desde} –
                                                            <select
                                                                value={r.hasta || ""}
                                                                onChange={(e) => cambiarHasta(idx, i, e.target.value)}
                                                                aria-label={`Hasta qué letra registra ${r.nombre}`}
                                                                className="h-7 px-1.5 rounded-md border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#003770] cursor-pointer"
                                                            >
                                                                {opciones.map((l) => <option key={l} value={l}>{l}</option>)}
                                                            </select>
                                                        </span>
                                                    ) : (
                                                        <b className="shrink-0 text-xs font-extrabold text-[#003770] whitespace-nowrap">{textoRango(rangos[i].desde, rangos[i].hasta)}</b>
                                                    )}
                                                    <span className="w-14 shrink-0 text-xs text-slate-500 text-right">{subs[i].length} est.</span>
                                                    {lista.length > 1 || r.rol === "OPERADOR" ? (
                                                        <button type="button" onClick={() => quitarResponsable(idx, i)} aria-label={`Quitar a ${r.nombre}`} className="w-5 shrink-0 text-slate-400 hover:text-[#B91C1C] text-base leading-none cursor-pointer">×</button>
                                                    ) : <span className="w-5 shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {ajustando && (
                                        <div className="mt-1.5 flex justify-end">
                                            <button type="button" onClick={() => partesIgualesAula(idx)} className="text-xs font-bold text-slate-500 hover:text-[#003770] hover:underline cursor-pointer">
                                                Volver a partes iguales
                                            </button>
                                        </div>
                                    )}

                                    <select
                                        value=""
                                        onChange={(e) => agregarResponsable(idx, e.target.value)}
                                        disabled={disponibles.length === 0 && docenteYaEsta}
                                        aria-label={`Agregar persona al ${aula.nombre}`}
                                        className="mt-2 w-full h-9 px-3 rounded-lg border-[1.5px] border-dashed border-[#94A3B8] bg-white font-extrabold text-xs text-[#003770] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">{boolVistaAdmin ? "+ Agregar ayudante o al docente" : "+ Agregar ayudante o agregarme"}</option>
                                        {!docenteYaEsta && <option value="DOCENTE">{boolVistaAdmin ? `${docente.nombre} · Docente` : "Yo (docente)"}</option>}
                                        {disponibles.map((o) => <option key={o.idUsuario} value={String(o.idUsuario)}>{nombreCompleto(o)} · Ayudante</option>)}
                                    </select>
                                </div>
                            );
                        })}

                        <div className="bg-slate-50 border-t border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-[11.5px] text-slate-500">
                                Las letras solo se usan sin internet.
                                {boolHayAulaSinAyudante && " Las aulas sin ayudante asignado quedan a cargo del docente."}
                            </span>
                            <div className="flex gap-2">
                                <BotonSecundario onClick={() => setPaso(editando ? 3 : 1)}>← Atrás</BotonSecundario>
                                <BotonPrincipal onClick={() => { setIdAulaAjustando(null); setPaso(3); }}>Siguiente →</BotonPrincipal>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* PASO 3 · Resumen */}
            {(paso === 3 || soloLectura) && (
                <section className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden">
                    {soloLectura && !guardada ? (
                        <div className="px-4 py-4 text-xs text-slate-600">No se asignaron ayudantes: el docente estuvo a cargo del ingreso de todas las aulas.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px] min-w-[480px]">
                                <thead>
                                    <tr className="bg-[#E8F1FB] text-[10.5px] font-extrabold text-[#124B83] tracking-[.5px] text-left">
                                        <th className="px-4 py-2">AULA</th>
                                        <th className="px-3 py-2">RESPONSABLE</th>
                                        <th className="px-3 py-2">APELLIDOS</th>
                                        <th className="px-4 py-2 text-right">ESTUDIANTES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasResumen.map((f, i) => (
                                        <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                                            <td className="px-4 py-2 border-t border-[#E2E8F0] font-extrabold">{f.aula}</td>
                                            <td className="px-3 py-2 border-t border-[#E2E8F0]">
                                                {f.responsable.rol === "DOCENTE" ? (boolVistaAdmin ? `${f.responsable.nombre} (docente)` : "Yo (docente)") : f.responsable.nombre}
                                            </td>
                                            <td className="px-3 py-2 border-t border-[#E2E8F0]">{f.rango}</td>
                                            <td className="px-4 py-2 border-t border-[#E2E8F0] text-right">{f.cantidad}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {errorGuardar && <div className="px-4 py-2.5 border-t border-[#E2E8F0] text-xs font-bold text-[#B91C1C]">{errorGuardar}</div>}
                    {!soloLectura && (
                        <div className="bg-slate-50 border-t border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between gap-3">
                            {editando ? <BotonSecundario onClick={onVolver}>Cancelar</BotonSecundario> : <BotonSecundario onClick={() => setPaso(2)}>← Atrás</BotonSecundario>}
                            <div className="flex gap-2">
                                {editando && <BotonSecundario onClick={() => setPaso(2)}>Cambiar ayudantes</BotonSecundario>}
                                <BotonPrincipal disabled={guardando} onClick={guardar}>
                                    {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Guardar asignación"}
                                </BotonPrincipal>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
