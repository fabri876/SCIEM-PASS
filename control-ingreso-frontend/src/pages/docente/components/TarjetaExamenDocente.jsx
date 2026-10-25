// Tarjeta de un examen en "Mis exámenes" del docente.
// - "Registrar ingreso": desde 15 minutos antes del inicio hasta que termina el examen.
// - "Habilitaciones": solo antes de que empiece el examen (después ya no se pueden editar).
// - Finalizado: sin botones.
import { useNavigate } from "react-router-dom";
import { estadoExamen, esHoy, puedeControlarIngreso, aperturaControl } from "../utilidadesExamenDocente";
import { textoGrupoExamen } from "../../../components/examenes/textoGrupoExamen";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function partesFecha(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? { strDia: String(Number(m[3])), strMes: MESES[Number(m[2]) - 1] } : null;
}

// "Aula 690B" o "Aulas 691A y 691B"
function textoAulas(examen) {
  const list = (examen.ambientes || [])
    .map((a) => String(a.nombreAmbiente || a.nombreAula || "").replace(/^aula\s*/i, "").trim())
    .filter(Boolean);
  if (list.length === 0) return examen.aulaNombre && examen.aulaNombre !== "Aula por definir" ? examen.aulaNombre : "Aula por definir";
  if (list.length === 1) return `Aula ${list[0]}`;
  return `Aulas ${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

const horaCorta = (date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const BOTON_PRINCIPAL = "bg-[#003770] hover:bg-[#124B83] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap";
const BOTON_SECUNDARIO = "bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#1A365D] font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap";

export default function TarjetaExamenDocente({ examen, boolResaltado = false, dateAhora = new Date() }) {
  const navigate = useNavigate();
  const boolReal = examen.esExamenReal !== false;
  const strEstado = boolReal ? estadoExamen(examen, dateAhora) : "SIN_FECHA";
  const boolHoy = esHoy(examen, dateAhora);
  const boolControl = boolReal && puedeControlarIngreso(examen, dateAhora);
  const boolHabilitaciones = boolReal && strEstado === "PROXIMO";
  const dateApertura = aperturaControl(examen);
  const boolAvisoApertura = boolReal && boolHoy && strEstado === "PROXIMO" && dateApertura && dateAhora < dateApertura;
  const objFecha = partesFecha(examen.fechaExamen);
  const boolFinalizado = strEstado === "FINALIZADO";
  const boolEnCurso = strEstado === "EN_CURSO";

  const objBadge = boolEnCurso
    ? { strTexto: "● En curso", strClase: "bg-[#003770] text-white" }
    : strEstado === "PROXIMO"
      ? { strTexto: boolHoy ? "Hoy" : "Próximo", strClase: "bg-[#E8F1FB] text-[#003770]" }
      : boolFinalizado
        ? { strTexto: "Finalizado", strClase: "bg-[#F1F5F9] text-[#64748B]" }
        : null;

  const strGrupo = textoGrupoExamen(examen.grupo);
  const strDetalle = [strGrupo, examen.horario, textoAulas(examen)].filter(Boolean).join(" · ");

  return (
    <div
      id={`examen-${examen.idExamen}`}
      className={
        "border rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap transition max-md:px-4 " +
        (boolFinalizado ? "bg-[#FBFCFE] " : "bg-white ") +
        (boolResaltado || boolEnCurso ? "border-[#003770] shadow-[0_4px_14px_rgba(0,55,112,.08)]" : "border-[#CBD5E1]")
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
          <h4 className="m-0 font-black text-sm text-[#08264A]">{examen.nombreExamen}</h4>
          {objBadge && <span className={"text-[10px] font-extrabold px-2 py-0.5 rounded-full " + objBadge.strClase}>{objBadge.strTexto}</span>}
        </div>
        <p className="mt-0.5 text-xs font-bold text-[#64748B]">
          {examen.tipoExamen && <span className="text-[#124B83]">{examen.tipoExamen}</span>}
          {examen.tipoExamen && strDetalle ? " · " : ""}
          {strDetalle}
        </p>
        {boolAvisoApertura && (
          <p className="mt-1 text-[11px] font-semibold text-[#64748B]">El registro de ingreso se habilita a las {horaCorta(dateApertura)}</p>
        )}
      </div>

      {(boolControl || boolHabilitaciones) && (
        <div className="flex items-center gap-2 flex-wrap max-md:w-full">
          {boolControl && (
            <button
              type="button"
              onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/control-ingreso`, { state: { menuOrigen: "mis-examenes", examen } })}
              className={BOTON_PRINCIPAL}
            >
              Registrar ingreso
            </button>
          )}
          {boolHabilitaciones && (
            <button
              type="button"
              onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/habilitaciones`)}
              className={BOTON_SECUNDARIO}
            >
              Habilitaciones
            </button>
          )}
        </div>
      )}
    </div>
  );
}
