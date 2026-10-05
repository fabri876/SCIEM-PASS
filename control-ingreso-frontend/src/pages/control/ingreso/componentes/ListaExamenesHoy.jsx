// "Mis exámenes de hoy": una tarjeta por examen asignado, con su estado y avance
import { GraduationCap, Clock } from "lucide-react";

const ESTADOS = {
  EN_CURSO: { strTexto: "En curso", strClase: "bg-[#F0F6FC] text-[#1860A3]", strPunto: "bg-[#267BC2] animate-pulse" },
  PROXIMO: { strTexto: "Próximo", strClase: "bg-[#F1F5F9] text-[#475569]", strPunto: "bg-[#9AA8BA]" },
  FINALIZADO: { strTexto: "Finalizado", strClase: "bg-[#F1F5F9] text-[#64748B]", strPunto: "bg-[#CBD5E1]" },
};

// En curso primero, luego próximos, al final los finalizados
const ORDEN = { EN_CURSO: 0, PROXIMO: 1, FINALIZADO: 2 };

function TarjetaExamenHoy({ examen, onElegir }) {
  const c = examen.contador || {};
  const numIng = c.ingresaron ?? 0;
  const numHab = c.habilitados ?? 0;
  const numPct = numHab ? Math.min(100, (numIng / numHab) * 100) : 0;
  const objEstado = ESTADOS[examen.estado] || ESTADOS.PROXIMO;
  const boolFinalizado = examen.estado === "FINALIZADO";

  return (
    <article className={"flex flex-col bg-white border border-[#CBD5E1] rounded-xl p-5 max-md:p-4 " + (boolFinalizado ? "opacity-80" : "")}>
      <div className="flex items-center justify-between gap-3">
        <span className={"w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 " + (boolFinalizado ? "bg-[#CBD5E1] text-white" : "bg-[#003770] text-white")}>
          <GraduationCap className="w-5 h-5" />
        </span>
        <span className={"inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold " + objEstado.strClase}>
          <i className={"w-[7px] h-[7px] rounded-full " + objEstado.strPunto} />
          {objEstado.strTexto}
        </span>
      </div>

      <h3 className="mt-3.5 mb-0 text-base font-bold text-[#08264A] leading-snug">{examen.tipo} · {examen.materia}</h3>
      <p className="mt-0.5 text-[13px] text-[#64748B]">
        Aula {examen.aula}{examen.edificio ? ` · ${examen.edificio}` : ""}
      </p>

      <div className="mt-2.5 flex items-center gap-1.5 text-[13px] text-[#475569]">
        <Clock className="w-4 h-4 text-[#9AA8BA]" />
        {examen.horaInicio} – {examen.horaFin}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <span className="flex flex-col px-2.5 py-2 rounded-lg bg-[#F0F6FC] text-[#1860A3] text-[11px] font-medium">
          <b className="text-[17px] font-bold leading-tight">{numIng}</b>Ingresaron
        </span>
        <span className="flex flex-col px-2.5 py-2 rounded-lg bg-[#F1F5F9] text-[#475569] text-[11px] font-medium">
          <b className="text-[17px] font-bold leading-tight">{c.pendientes ?? 0}</b>Faltantes
        </span>
        <span className="flex flex-col px-2.5 py-2 rounded-lg bg-[#FEF2F2] text-[#B91C1C] text-[11px] font-medium">
          <b className="text-[17px] font-bold leading-tight">{c.inhabilitados ?? 0}</b>Inhabilitados
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-[#64748B]">
        <span className="flex-1 h-[7px] bg-[#F1F5F9] rounded-full overflow-hidden">
          <i className="block h-full bg-[#003770] rounded-full transition-[width] duration-500" style={{ width: numPct + "%" }} />
        </span>
        <b className="text-[13px] font-bold text-[#08264A] whitespace-nowrap">{numIng} / {numHab}</b>
      </div>

      <div className="mt-5 pt-4 border-t border-[#CBD5E1] flex justify-end">
        <button
          type="button"
          onClick={() => onElegir(examen.id)}
          className={
            "min-h-[42px] px-5 rounded-lg text-sm font-semibold cursor-pointer max-md:w-full " +
            (boolFinalizado
              ? "border border-[#CBD5E1] bg-white text-[#003770] hover:border-[#003770]"
              : "bg-[#003770] hover:bg-[#124B83] text-white")
          }
        >
          {boolFinalizado ? "Ver ingresos" : "Registrar ingreso"}
        </button>
      </div>
    </article>
  );
}

export default function ListaExamenesHoy({ listExamenes, boolCargando, onElegir }) {
  const listOrdenada = [...listExamenes].sort(
    (a, b) => (ORDEN[a.estado] ?? 1) - (ORDEN[b.estado] ?? 1) || a.horaInicio.localeCompare(b.horaInicio)
  );

  return (
    <section aria-labelledby="ci-t-hoy">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="ci-t-hoy" className="m-0 text-base font-bold text-[#08264A]">Mis exámenes de hoy</h2>
        {!boolCargando && <span className="text-[13px] text-[#64748B]">{listExamenes.length} asignados</span>}
      </div>

      {boolCargando && (
        <div className="bg-white border border-[#CBD5E1] rounded-xl px-5 py-6 text-sm text-[#64748B]">Cargando exámenes…</div>
      )}

      {!boolCargando && listExamenes.length === 0 && (
        <div className="bg-white border border-dashed border-[#CBD5E1] rounded-xl px-5 py-8 text-center">
          <p className="m-0 text-[15px] font-semibold text-[#08264A]">No tienes exámenes asignados hoy</p>
          <p className="mt-1 text-[13px] text-[#64748B]">Cuando te asignen el control de un examen, aparecerá aquí.</p>
        </div>
      )}

      {listOrdenada.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listOrdenada.map((ex) => (
            <TarjetaExamenHoy key={ex.id} examen={ex} onElegir={onElegir} />
          ))}
        </div>
      )}
    </section>
  );
}
