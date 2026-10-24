// "Mis exámenes" del estudiante: lista completa con filtros por estado y por asignatura
// (misma línea que "Mis exámenes" del docente). Los finalizados van sin botón.
import { useMemo, useState } from "react";
import { ordenarExamenesEstudiante, partesFecha, textoAula, esHoyEstudiante } from "../utilidadesEstudiante";
import { estadoQr, EtiquetaQr, BotonQr } from "./QrExamen";

const FILTROS = [
    { clave: "TODOS", etiqueta: "Todos" },
    { clave: "EN_CURSO", etiqueta: "En curso" },
    { clave: "PROXIMO", etiqueta: "Próximos" },
    { clave: "FINALIZADO", etiqueta: "Finalizados" },
];

function TarjetaExamenLista({ examen, strEstado, dateAhora, onVerQr }) {
    const boolFinalizado = strEstado === "FINALIZADO";
    const boolEnCurso = strEstado === "EN_CURSO";
    const objFecha = partesFecha(examen.fecha);
    const objEstado = estadoQr(examen);

    const objBadge = boolEnCurso
        ? { strTexto: "● En curso", strClase: "bg-[#003770] text-white" }
        : strEstado === "PROXIMO"
            ? { strTexto: esHoyEstudiante(examen, dateAhora) ? "Hoy" : "Próximo", strClase: "bg-[#E8F1FB] text-[#003770]" }
            : boolFinalizado
                ? { strTexto: "Finalizado", strClase: "bg-[#F1F5F9] text-[#64748B]" }
                : null;

    const strGrupo = examen.grupo ? `Grupo ${String(examen.grupo).replace(/^grupo\s*/i, "")}` : "";
    const strHorario = [examen.horaInicio, examen.horaFin].filter(Boolean).join(" – ");
    const strDetalle = [strGrupo, strHorario, textoAula(examen.aula)].filter(Boolean).join(" · ");

    return (
        <div
            className={
                "border rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap transition max-md:px-4 " +
                (boolFinalizado ? "bg-[#FBFCFE] " : "bg-white ") +
                (boolEnCurso ? "border-[#003770] shadow-[0_4px_14px_rgba(0,55,112,.08)]" : "border-[#CBD5E1]")
            }
        >
            <div className={"w-14 h-14 rounded-[10px] flex flex-col items-center justify-center shrink-0 " + (boolFinalizado || !objFecha ? "bg-[#F1F5F9]" : "bg-[#E8F1FB]")}>
                {objFecha ? (
                    <>
                        <b className={"text-xl leading-none font-black " + (boolFinalizado ? "text-[#64748B]" : "text-[#003770]")}>{objFecha.strDia}</b>
                        <span className={"mt-0.5 text-[10px] font-extrabold " + (boolFinalizado ? "text-[#64748B]" : "text-[#003770]")}>{objFecha.strMes}</span>
                    </>
                ) : (
                    <b className="text-base text-[#94A3B8]">—</b>
                )}
            </div>

            <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="m-0 font-black text-sm text-[#08264A] uppercase">{examen.materia}</h4>
                    {objBadge && <span className={"text-[10px] font-extrabold px-2 py-0.5 rounded-full " + objBadge.strClase}>{objBadge.strTexto}</span>}
                </div>
                <p className="mt-0.5 text-xs font-bold text-[#64748B]">
                    {examen.tipo && <span className="text-[#124B83]">{examen.tipo}</span>}
                    {examen.tipo && strDetalle ? " · " : ""}
                    {strDetalle}
                </p>
                {!boolFinalizado && <div className="mt-1.5"><EtiquetaQr objEstado={objEstado} /></div>}
            </div>

            {!boolFinalizado && (
                <BotonQr examen={examen} objEstado={objEstado} boolPrincipal={boolEnCurso} onVerQr={onVerQr} />
            )}
        </div>
    );
}

export default function SeccionMisExamenesEstudiante({ examenes = [], boolCargando = false, strError = "", dateAhora = new Date(), onVerQr }) {
    const [strFiltro, setStrFiltro] = useState("TODOS");
    const [strAsignatura, setStrAsignatura] = useState("");

    const listAsignaturas = useMemo(
        () => [...new Set(examenes.map((e) => e.materia).filter(Boolean))].sort(),
        [examenes]
    );

    const listVisibles = useMemo(
        () => ordenarExamenesEstudiante(examenes.filter((e) => !strAsignatura || e.materia === strAsignatura), dateAhora)
            .filter(({ strEstado }) => strFiltro === "TODOS" || strEstado === strFiltro),
        [examenes, strAsignatura, strFiltro, dateAhora]
    );

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-black text-[#1A365D]">Mis exámenes</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">Tu QR se habilita desde el día anterior a cada examen.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                {FILTROS.map((f) => (
                    <button
                        key={f.clave}
                        type="button"
                        onClick={() => setStrFiltro(f.clave)}
                        aria-pressed={strFiltro === f.clave}
                        className={`px-4 h-9 rounded-full text-xs font-bold border transition cursor-pointer ${strFiltro === f.clave
                            ? "bg-[#003770] text-white border-[#003770]"
                            : "bg-white text-[#1A365D] border-slate-300 hover:bg-slate-50"}`}
                    >
                        {f.etiqueta}
                    </button>
                ))}
                <select
                    value={strAsignatura}
                    onChange={(e) => setStrAsignatura(e.target.value)}
                    aria-label="Filtrar por asignatura"
                    className="ml-auto h-9 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 px-3 max-w-[260px] cursor-pointer max-md:ml-0 max-md:w-full max-md:max-w-none"
                >
                    <option value="">Todas las asignaturas</option>
                    {listAsignaturas.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>

            {strError && (
                <div role="alert" className="px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strError}</div>
            )}

            <div className="space-y-3">
                {boolCargando ? (
                    <div className="text-center py-10 text-slate-500 text-xs font-semibold animate-pulse bg-white rounded-2xl border border-slate-200">
                        Cargando exámenes…
                    </div>
                ) : listVisibles.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-white rounded-2xl border border-slate-200">
                        {examenes.length === 0 ? "No tienes exámenes inscritos." : "No hay exámenes que coincidan con el filtro."}
                    </div>
                ) : (
                    listVisibles.map(({ e, strEstado }) => (
                        <TarjetaExamenLista key={e.id} examen={e} strEstado={strEstado} dateAhora={dateAhora} onVerQr={onVerQr} />
                    ))
                )}
            </div>
        </div>
    );
}