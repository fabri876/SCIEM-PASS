// Tarjeta de un examen de HOY en el Inicio del estudiante (mismo estilo que el Inicio del docente).
// Hora en grande a la izquierda, datos del examen, estado del QR y "Ver mi QR".
import { estadoExamenEstudiante, textoAula } from "../utilidadesEstudiante";
import { estadoQr, EtiquetaQr, BotonQr } from "./QrExamen";

export default function TarjetaHoyEstudiante({ examen, dateAhora = new Date(), onVerQr }) {
    const boolEnCurso = estadoExamenEstudiante(examen, dateAhora) === "EN_CURSO";
    const objEstado = estadoQr(examen);
    const strGrupo = examen.grupo ? `Grupo ${String(examen.grupo).replace(/^grupo\s*/i, "")}` : "";
    const strDetalle = [textoAula(examen.aula), strGrupo].filter(Boolean).join(" · ");

    return (
        <div className={"bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 " + (boolEnCurso ? "shadow-[inset_4px_0_0_#003770]" : "")}>
            <div className="flex items-center gap-4 flex-wrap">
                <div className="w-16 shrink-0 text-center border-r border-[#E2E8F0] pr-3">
                    <b className="block text-[17px] font-black text-[#08264A] leading-tight">{examen.horaInicio || "--:--"}</b>
                    {examen.horaFin && <span className="text-[11px] font-bold text-slate-500">a {examen.horaFin}</span>}
                </div>

                <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="m-0 font-black text-sm text-[#08264A] uppercase">{examen.materia}</h4>
                        {boolEnCurso && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#003770] text-white">● En curso</span>}
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-[#64748B]">
                        {examen.tipo && <span className="text-[#124B83]">{examen.tipo}</span>}
                        {examen.tipo ? " · " : ""}
                        {strDetalle}
                    </p>
                    <div className="mt-1.5"><EtiquetaQr objEstado={objEstado} /></div>
                </div>

                <BotonQr examen={examen} objEstado={objEstado} boolPrincipal={boolEnCurso} onVerQr={onVerQr} />
            </div>
        </div>
    );
}