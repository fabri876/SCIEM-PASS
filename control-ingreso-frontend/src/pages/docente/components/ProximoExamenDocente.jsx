// Tarjeta "Próximo examen" del Inicio del docente (el examen más cercano que aún no terminó).
import { cuentaRegresiva, fechaCorta } from "../../credencial/componentes/formato";

export default function ProximoExamenDocente({ examen, onVerDetalle }) {
  const strFecha = examen ? String(examen.fechaExamen || "").slice(0, 10) : "";
  const strFalta = examen ? cuentaRegresiva(strFecha, examen.horaInicio, examen.horaFin) : "";

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-black text-xs text-[#1A365D] uppercase tracking-wider">Próximo Examen</h4>
        {strFalta && (
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] uppercase">
            {strFalta}
          </span>
        )}
      </div>

      {!examen ? (
        <p className="text-xs text-slate-500 font-semibold">No tienes exámenes próximos.</p>
      ) : (
        <>
          <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
            <p className="font-extrabold text-sm text-[#1A365D]">{examen.nombreExamen}</p>
            <p className="text-[11px] text-slate-600 mt-1">
              {fechaCorta(strFecha)} · {examen.horario}
            </p>
            {examen.aulaNombre && examen.aulaNombre !== "Aula por definir" && (
              <p className="text-[11px] text-slate-600 mt-0.5">
                Aula {String(examen.aulaNombre).replace(/^aula\s*/i, "")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onVerDetalle(examen.idExamen)}
            className="w-full mt-3 h-10 rounded-xl border border-[#1A365D] text-[#1A365D] hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
          >
            Ver detalle
          </button>
        </>
      )}
    </div>
  );
}
