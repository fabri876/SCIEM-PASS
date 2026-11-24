import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import React, { useEffect, useState } from "react";
import {
    Users,
    ShieldCheck,
    GraduationCap,
    UserCheck,
    UserCog,
    Calendar,
    Clock
} from "lucide-react";
import { obtenerExamenesMonitoreo, obtenerTableroMonitoreo } from "../../../services/monitoreoService";
import { horaCorta, nombreAula } from "../../../components/monitoreo/utilidadesMonitoreo";

const INT_REFRESCO_MS = 30000;

/** "2026-10-20" de HOY en la zona horaria del navegador (sin pasar por UTC). */
function fechaDeHoy() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function horaActualCorta() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Próximo examen: el que está en curso; si no hay, el siguiente de hoy que
 * aún no terminó; si no hay, el primero de los próximos días. null si no hay.
 */
export function elegirProximoExamen(arrExamenes, strHoy = fechaDeHoy(), strAhora = horaActualCorta()) {
    const arr = Array.isArray(arrExamenes) ? arrExamenes : [];
    const enCurso = arr.find((e) => e.enCurso);
    if (enCurso) return enCurso;

    const clave = (e) => `${e.fechaExamen || "9999-12-31"} ${horaCorta(e.horaInicio) || "00:00"}`;
    return arr
        .filter((e) => {
            if (!e.fechaExamen) return false;
            if (e.fechaExamen > strHoy) return true;
            if (e.fechaExamen < strHoy) return false;
            return !e.horaFin || horaCorta(e.horaFin) >= strAhora; // hoy y todavía no terminó
        })
        .sort((a, b) => clave(a).localeCompare(clave(b)))[0] || null;
}

/** true si el examen de hoy ya terminó (no está en curso y su hora de fin ya pasó). */
function examenTerminado(e, strAhora = horaActualCorta()) {
    return !e.enCurso && Boolean(e.horaFin) && horaCorta(e.horaFin) < strAhora;
}

/** El último examen de hoy que ya terminó (el de hora de fin más tarde), o null. */
export function elegirUltimoExamenDeHoy(arrExamenesHoy, strAhora = horaActualCorta()) {
    return (Array.isArray(arrExamenesHoy) ? arrExamenesHoy : [])
        .filter((e) => examenTerminado(e, strAhora))
        .sort((a, b) => horaCorta(b.horaFin).localeCompare(horaCorta(a.horaFin)))[0] || null;
}

/** "Hoy" / "Mañana" / "20/10/2026" */
function etiquetaDia(strFecha, strHoy = fechaDeHoy()) {
    if (strFecha === strHoy) return "Hoy";
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const pad = (n) => String(n).padStart(2, "0");
    if (strFecha === `${manana.getFullYear()}-${pad(manana.getMonth() + 1)}-${pad(manana.getDate())}`) return "Mañana";
    const [a, m, d] = String(strFecha).split("-");
    return `${d}/${m}/${a}`;
}

/**
 * Datos reales de las tarjetas "Ya ingresaron" y "Próximo Examen" a partir del
 * monitoreo (HU10): GET /api/monitoreo/examenes y .../tablero. El administrador
 * ve todos los exámenes. Se refresca cada 30 s.
 */
function useResumenExamenes() {
    const [objResumen, setObjResumen] = useState({ estado: "cargando", ingresados: 0, habilitados: 0, avance: 0, hayExamenesHoy: false, hoyFinalizado: false, proximo: null, ultimo: null, aulas: [] });

    useEffect(() => {
        let boolCancelado = false;
        const ctrl = new AbortController();

        const fnCargar = async () => {
            try {
                const arrExamenes = await obtenerExamenesMonitoreo({ signal: ctrl.signal });
                const arr = Array.isArray(arrExamenes) ? arrExamenes : [];
                const strHoy = fechaDeHoy();
                const arrHoy = arr.filter((e) => e.fechaExamen === strHoy);
                const proximo = elegirProximoExamen(arr, strHoy);
                // Todos los exámenes de hoy ya terminaron → "examen finalizado" y "Último examen"
                const boolHoyFinalizado = arrHoy.length > 0 && arrHoy.every((e) => examenTerminado(e));
                const ultimo = !proximo ? elegirUltimoExamenDeHoy(arrHoy) : null;

                // Un tablero por cada examen de hoy (+ el próximo si es de otro día), en paralelo
                const arrIds = [...new Set([...arrHoy.map((e) => e.idExamen), ...(proximo ? [proximo.idExamen] : [])])];
                const arrResultados = await Promise.allSettled(arrIds.map((id) => obtenerTableroMonitoreo(id, { signal: ctrl.signal })));
                const mapTableros = new Map();
                arrIds.forEach((id, i) => {
                    if (arrResultados[i].status === "fulfilled") mapTableros.set(id, arrResultados[i].value);
                });

                let intIngresados = 0;
                let intHabilitados = 0;
                let intConIngreso = 0; // habilitados que ya ingresaron (los excepcionales no cuentan para el %)
                arrHoy.forEach((e) => {
                    const m = mapTableros.get(e.idExamen)?.metricas;
                    if (!m) return;
                    intIngresados += m.ingresados ?? 0;
                    intHabilitados += m.habilitados ?? 0;
                    intConIngreso += (m.habilitados ?? 0) - (m.pendientes ?? 0);
                });

                const arrAulas = proximo ? (mapTableros.get(proximo.idExamen)?.aulas || []).map((a) => a.aula) : [];
                if (boolCancelado) return;
                setObjResumen({
                    estado: "ok",
                    ingresados: intIngresados,
                    habilitados: intHabilitados,
                    avance: intHabilitados ? Math.min(100, Math.round((intConIngreso * 100) / intHabilitados)) : 0,
                    hayExamenesHoy: arrHoy.length > 0,
                    hoyFinalizado: boolHoyFinalizado,
                    proximo,
                    ultimo,
                    aulas: arrAulas,
                });
            } catch (err) {
                if (err?.name === "AbortError" || boolCancelado) return;
                setObjResumen((previo) => (previo.estado === "ok" ? previo : { ...previo, estado: "error" }));
            }
        };

        fnCargar();
        const idIntervalo = setInterval(fnCargar, INT_REFRESCO_MS);
        return () => {
            boolCancelado = true;
            ctrl.abort();
            clearInterval(idIntervalo);
        };
    }, []);

    return objResumen;
}

export default function AdminMetricsCards({ usuarios }) {
    const listaSegura = Array.isArray(usuarios) ? usuarios : [];
    const contarPorRol = (rol) => listaSegura.filter((u) => u.rol === rol).length;
    const resumen = useResumenExamenes();
    const boolCargando = resumen.estado === "cargando";
    const boolError = resumen.estado === "error";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Tarjeta Total Usuarios (datos reales de GET /api/admin/usuarios) */}
            <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between">
                {/* Parte Superior: Ícono circular a la izquierda + Título y Número */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-navy flex items-center justify-center shrink-0 shadow-sm">
                        <Users className="w-7 h-7 text-bg-card" />
                    </div>
                    <div>
                        <span className="text-secondary font-bold text-primary-navy">Total Usuarios</span>
                        <div className="text-h1 font-black text-primary-navy tracking-tight leading-none mt-1">
                            {listaSegura.length}
                        </div>
                    </div>
                </div>

                {/* Parte Inferior: Sub-métricas divididas verticalmente */}
                <div className="grid grid-cols-4 divide-x divide-border mt-5 pt-3 border-t border-border">
                    {/* Admins */}
                    <div className="flex items-center gap-1.5 px-1.5 first:pl-0">
                        <ShieldCheck className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{textoInterfaz(contarPorRol("ADMINISTRADOR"))}</span>
                            <span className="text-badge text-text-body/60 font-medium">Admins</span>
                        </div>
                    </div>

                    {/* Docentes */}
                    <div className="flex items-center gap-1.5 px-1.5">
                        <GraduationCap className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{textoInterfaz(contarPorRol("DOCENTE"))}</span>
                            <span className="text-badge text-text-body/60 font-medium">Docentes</span>
                        </div>
                    </div>

                    {/* Estudiantes */}
                    <div className="flex items-center gap-1.5 px-1.5">
                        <UserCheck className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{textoInterfaz(contarPorRol("ESTUDIANTE"))}</span>
                            <span className="text-badge text-text-body/60 font-medium">Estudiantes</span>
                        </div>
                    </div>

                    {/* Ayudantes (en el backend el rol se llama OPERADOR) */}
                    <div className="flex items-center gap-1.5 px-1.5 last:pr-0">
                        <UserCog className="w-4 h-4 text-primary-blue shrink-0" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-secondary font-bold text-text-body">{textoInterfaz(contarPorRol("OPERADOR"))}</span>
                            <span className="text-badge text-text-body/60 font-medium">Ayudantes</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Ya ingresaron: estudiantes que ingresaron a los exámenes de hoy (datos reales del monitoreo) */}
            <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-secondary font-bold text-primary-navy">Ya ingresaron</span>
                        <div className="text-h1 font-black text-primary-navy tracking-tight leading-none mt-1">
                            {boolCargando ? "…" : boolError ? "—" : resumen.ingresados}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
                        <UserCheck className="w-6 h-6" />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="w-full bg-bg-app rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${boolCargando || boolError ? 0 : resumen.avance}%` }} />
                    </div>
                    <span className="text-badge text-text-body/60 mt-1 block">
                        {boolCargando
                            ? "Cargando…"
                            : boolError
                                ? "No se pudo cargar"
                                : resumen.hayExamenesHoy
                                    ? `${resumen.avance}% de ${resumen.habilitados} habilitados hoy${resumen.hoyFinalizado ? " · examen finalizado" : ""}`
                                    : "Sin exámenes hoy"}
                    </span>
                </div>
            </div>

            {/* 3. Próximo examen: el que está en curso, el siguiente, o el último que terminó hoy (datos reales del monitoreo) */}
            <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-secondary font-bold text-primary-navy">{resumen.proximo?.enCurso ? "Examen en curso" : !resumen.proximo && resumen.ultimo ? "Último examen" : "Próximo Examen"}</span>
                        <div className="text-sub font-bold text-primary-navy mt-1">
                            {boolCargando ? "Cargando…" : boolError ? "No disponible" : resumen.proximo ? resumen.proximo.asignatura : resumen.ultimo ? resumen.ultimo.asignatura : "Sin exámenes próximos"}
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary-blue/10 text-primary-blue flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-secondary text-text-body/70 mt-4">
                    <Clock className="w-4 h-4 text-primary-blue shrink-0" />
                    <span>
                        {resumen.proximo
                            ? [
                                `${etiquetaDia(resumen.proximo.fechaExamen)}${resumen.proximo.horaInicio ? `, ${horaCorta(resumen.proximo.horaInicio)}` : ""}`,
                                resumen.aulas.length === 1
                                    ? nombreAula(resumen.aulas[0])
                                    : resumen.aulas.length > 1
                                        ? `${resumen.aulas.length} aulas`
                                        : resumen.proximo.cantidadAulas
                                            ? `${resumen.proximo.cantidadAulas} aula(s)`
                                            : "",
                            ].filter(Boolean).join(" - ")
                            : resumen.ultimo
                                ? `Finalizó hoy, ${horaCorta(resumen.ultimo.horaFin)}`
                                : "—"}
                    </span>
                </div>
            </div>
        </div>
    );
}