// Tarjeta resumida del examen para el Inicio del docente.
// Muestra un solo botón: "Control de ingreso" cuando ya corresponde (desde 1 hora
// antes del inicio hasta el fin del examen) y "Ver detalle" en cualquier otro momento.
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { estadoExamen, esHoy } from "../utilidadesExamenDocente";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function partesFecha(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { dia: "--", mes: "" };
  return { dia: String(Number(m[3])), mes: MESES[Number(m[2]) - 1] };
}

export default function TarjetaExamenInicio({ examen, onVerDetalle }) {
  const navigate = useNavigate();
  const ahora = new Date();
  const strEstado = estadoExamen(examen, ahora);
  const boolIngreso = examen.esExamenReal !== false;
  const boolDestacado = strEstado === "EN_CURSO" || esHoy(examen, ahora);
  const { dia, mes } = partesFecha(examen.fechaExamen);
  const strEtiqueta = strEstado === "EN_CURSO" ? "EN CURSO" : esHoy(examen, ahora) ? "HOY" : "PRÓXIMO";
  const numTotal = examen.totalInscritos || 0;
  const numPct = numTotal > 0 ? Math.round((examen.ingresados / numTotal) * 100) : 0;
  const strMeta = [
    examen.horario,
    examen.aulaNombre && examen.aulaNombre !== "Aula por definir" ? `Aula ${examen.aulaNombre}` : null,
    examen.tipoExamen,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-5 border-t border-slate-100 first:border-t-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-14 h-16 rounded-2xl shrink-0 flex flex-col items-center justify-center ${boolDestacado ? "bg-[#1A365D] text-white" : "bg-[#EFF6FF] text-[#1A365D] border border-[#BFDBFE]"}`}>
          <b className="text-xl leading-none font-black">{dia}</b>
          <span className="text-[11px] tracking-wider mt-1 font-semibold">{mes}</span>
        </div>
        <div className="min-w-0">
          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mb-1 ${boolDestacado ? "bg-[#1A365D] text-white" : "bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"}`}>
            {strEtiqueta}
          </span>
          <h4 className="font-black text-[15px] text-[#1A365D] uppercase tracking-tight leading-snug">{examen.nombreExamen}</h4>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">{strMeta}</p>
          {numTotal > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <div className="w-40 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-[#003770]" style={{ width: `${numPct}%` }} />
              </div>
              <span className="text-[11px] font-bold text-slate-600">{examen.ingresados} / {numTotal} ingresaron</span>
            </div>
          )}
        </div>
      </div>

      {boolIngreso ? (
        <button
          type="button"
          onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/control-ingreso`, { state: { menuOrigen: "inicio", examen } })}
          className="inline-flex items-center justify-center gap-2 bg-[#1A365D] hover:bg-[#132743] text-white font-bold text-xs h-10 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-center"
        >
          Control de ingreso <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onVerDetalle(examen.idExamen)}
          className="inline-flex items-center justify-center bg-white border border-[#CBD5E1] text-slate-600 hover:bg-slate-50 font-bold text-xs h-10 px-4 rounded-xl transition cursor-pointer whitespace-nowrap self-start sm:self-center"
        >
          Ver detalle
        </button>
      )}
    </div>
  );
}
