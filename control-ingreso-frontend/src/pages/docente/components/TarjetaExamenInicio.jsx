import { textoAsignatura } from '../../../utils/textoInterfaz.js';
import { textoInterfaz } from '../../../utils/textoInterfaz.js';
// Tarjeta de un examen de HOY en el Inicio del docente.
// - Hora de inicio en grande a la izquierda.
// - "Registrar ingreso" desde 15 minutos antes del inicio hasta el fin; antes, "Registro desde las HH:MM".
// - Si está en curso: franja azul a la izquierda y barra de ingresos a lo ancho, debajo del botón.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { estadoExamen, puedeControlarIngreso, aperturaControl } from "../utilidadesExamenDocente";

// "Aula 690B" o "Aulas 691A y 691B" (sin repetir la palabra "Aula")
function textoAulas(examen) {
  const list = (examen.ambientes || [])
    .map((a) => String(a.nombreAmbiente || a.nombreAula || "").replace(/^aula\s*/i, "").trim())
    .filter(Boolean);
  if (list.length === 0) {
    const str = String(examen.aulaNombre || "").replace(/^aula\s*/i, "").trim();
    return str && str !== "por definir" ? `Aula ${str}` : "";
  }
  if (list.length === 1) return `Aula ${list[0]}`;
  return `Aulas ${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

const horaCorta = (date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export default function TarjetaExamenInicio({ examen }) {
  const navigate = useNavigate();

  // Se actualiza cada 30 s para que el botón aparezca solo a la hora indicada
  const [dateAhora, setDateAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const boolEnCurso = estadoExamen(examen, dateAhora) === "EN_CURSO";
  const boolControl = puedeControlarIngreso(examen, dateAhora);
  const dateApertura = aperturaControl(examen);
  const numTotal = examen.totalInscritos || 0;
  const numIng = examen.ingresados || 0;
  const numPct = numTotal > 0 ? Math.min(100, Math.round((numIng / numTotal) * 100)) : 0;
  const strDetalle = [examen.tipoExamen, textoAulas(examen)].filter(Boolean);

  return (
    <div
      className={
        "bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 " +
        (boolEnCurso ? "shadow-[inset_4px_0_0_#003770]" : "")
      }
    >
      <div className="flex items-center gap-4 flex-wrap max-md:items-start max-md:gap-2.5">
        <div className="w-16 shrink-0 text-center border-r border-[#E2E8F0] pr-3 max-md:w-[58px] max-md:pr-2">
          <b className="block text-[17px] font-black text-[#08264A] leading-tight">{examen.horaInicio || "--:--"}</b>
          {examen.horaFin && <span className="text-[11px] font-bold text-slate-500">a {examen.horaFin}</span>}
        </div>

        <div className="flex-1 min-w-[180px] max-md:min-w-0 max-md:basis-[calc(100%-70px)]">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="m-0 font-black text-sm text-[#08264A] ">{textoAsignatura(examen.nombreExamen)}</h4>
            {boolEnCurso && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#003770] text-white">● En curso</span>}
          </div>
          {strDetalle.length > 0 && (
            <p className="mt-0.5 text-xs font-bold text-[#64748B]">
              {examen.tipoExamen && <span className="text-[#124B83]">{textoInterfaz(examen.tipoExamen)}</span>}
              {textoInterfaz(examen.tipoExamen && strDetalle.length > 1 ? " · " : "")}
              {textoAulas(examen)}
            </p>
          )}
        </div>

        {boolControl ? (
          <button
            type="button"
            onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/control-ingreso`, { state: { menuOrigen: "inicio", examen } })}
            className="inline-flex items-center justify-center gap-2 bg-[#003770] hover:bg-[#124B83] text-white font-bold text-xs h-9 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap max-md:w-[calc(100%-70px)] max-md:ml-[70px] max-md:h-10"
          >
            Registrar ingreso <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          dateApertura && dateAhora < dateApertura && (
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Registro desde las {horaCorta(dateApertura)}</span>
          )
        )}
      </div>

      {/* Barra de ingresos (solo en curso), a lo ancho hasta debajo del botón */}
      {boolEnCurso && numTotal > 0 && (
        <div className="mt-2.5 ml-20 flex items-center gap-3 max-md:ml-0 max-md:gap-2 max-md:flex-wrap">
          <div className="flex-1 h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
            <div className="h-full rounded-full bg-[#1860A3] transition-all duration-500" style={{ width: `${numPct}%` }} />
          </div>
          <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap max-md:ml-auto">{numIng} / {numTotal} ingresaron</span>
        </div>
      )}
    </div>
  );
}
