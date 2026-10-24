// Tarjeta de un examen de HOY en el Inicio del ayudante (mismo diseño que el Inicio del docente).
// - Hora de inicio en grande a la izquierda.
// - "Registrar ingreso" desde 15 minutos antes del inicio hasta el fin; antes, "Registro desde las HH:MM".
// - En curso: franja azul a la izquierda y barra de ingresos a lo ancho.
// - Abajo: "Modo sin conexión" de Yuri (HU07), sin cambios.
import { ArrowRight } from "lucide-react";
import PildoraFila from "../ingreso/componentes/PildoraFila";
import { FilaNominaSinConexion } from "../ingreso/componentes/ListaExamenesHoy";
import { estadoAyudante, puedeRegistrar, aperturaRegistro, horaCorta, textoAula, textoGrupo } from "../utilidadesAyudante";

export default function TarjetaHoyAyudante({ examen, dateAhora, onElegir, boolSinRed }) {
  const boolEnCurso = estadoAyudante(examen, dateAhora) === "EN_CURSO";
  const boolRegistro = puedeRegistrar(examen, dateAhora);
  const dateApertura = aperturaRegistro(examen);
  const c = examen.contador || {};
  const numIng = c.ingresaron ?? 0;
  const numHab = c.habilitados ?? 0;
  const numPct = numHab > 0 ? Math.min(100, Math.round((numIng / numHab) * 100)) : 0;
  const strDetalle = [textoAula(examen.aula), textoGrupo(examen.grupo)].filter(Boolean).join(" · ");

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
            {examen.tipo && strDetalle ? " · " : ""}
            {strDetalle}
          </p>
        </div>

        {boolRegistro ? (
          <button
            type="button"
            onClick={() => onElegir(examen.id)}
            className="inline-flex items-center justify-center gap-2 bg-[#003770] hover:bg-[#124B83] text-white font-bold text-xs h-9 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
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
      {boolEnCurso && numHab > 0 && (
        <div className="mt-2.5 ml-20 flex items-center gap-3 max-md:ml-0">
          <div className="flex-1 h-1.5 rounded-full bg-[#EEF2F7] overflow-hidden">
            <div className="h-full rounded-full bg-[#1860A3] transition-all duration-500" style={{ width: `${numPct}%` }} />
          </div>
          <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">{numIng} / {numHab} ingresaron</span>
        </div>
      )}

      {/* Tramo de apellidos (sin internet) y "Modo sin conexión" de Yuri */}
      <div className="mt-3 ml-20 pt-2.5 border-t border-dashed border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 max-md:ml-0">
        {examen.fila ? <PildoraFila objFila={examen.fila} /> : <span />}
        <FilaNominaSinConexion examen={examen} boolSinRed={boolSinRed} />
      </div>
    </div>
  );
}
