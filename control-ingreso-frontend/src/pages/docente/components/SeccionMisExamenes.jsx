// Sección "Mis Exámenes": lista completa del docente, con filtros y las acciones de cada examen
// (control de ingreso, habilitaciones y nómina). La tarjeta de cada examen la define HomeDocente.
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { estadoExamen, esHoy, marcaTiempo } from "../utilidadesExamenDocente";

const FILTROS = [
  { clave: "TODOS", etiqueta: "Todos" },
  { clave: "HOY", etiqueta: "Hoy" },
  { clave: "PROXIMOS", etiqueta: "Próximos" },
  { clave: "FINALIZADOS", etiqueta: "Finalizados" },
];

export default function SeccionMisExamenes({
  examenes = [],
  boolCargando = false,
  TarjetaExamen,
  onRegistrar,
  idResaltado = null,
}) {
  const [strFiltro, setStrFiltro] = useState("TODOS");
  const [strAsignatura, setStrAsignatura] = useState("");

  const listAsignaturas = useMemo(
    () => [...new Set(examenes.map((e) => e.nombreExamen).filter(Boolean))].sort(),
    [examenes]
  );

  const listVisibles = useMemo(() => {
    const ahora = new Date();
    const orden = { EN_CURSO: 0, PROXIMO: 0, SIN_FECHA: 1, FINALIZADO: 2 };
    return examenes
      .filter((e) => (strAsignatura ? e.nombreExamen === strAsignatura : true))
      .filter((e) => {
        const est = estadoExamen(e, ahora);
        if (strFiltro === "HOY") return esHoy(e, ahora);
        if (strFiltro === "PROXIMOS") return est === "PROXIMO" || est === "EN_CURSO";
        if (strFiltro === "FINALIZADOS") return est === "FINALIZADO";
        return true;
      })
      .sort((a, b) => {
        const ea = estadoExamen(a, ahora);
        const eb = estadoExamen(b, ahora);
        if (orden[ea] !== orden[eb]) return orden[ea] - orden[eb];
        return ea === "FINALIZADO" ? marcaTiempo(b) - marcaTiempo(a) : marcaTiempo(a) - marcaTiempo(b);
      });
  }, [examenes, strFiltro, strAsignatura]);

  useEffect(() => {
    if (!idResaltado) return;
    const el = document.getElementById(`examen-${idResaltado}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [idResaltado, listVisibles.length]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#1A365D]">Mis exámenes</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Todos tus exámenes por asignatura, con sus acciones de gestión.
          </p>
        </div>
        <button
          type="button"
          onClick={onRegistrar}
          className="inline-flex items-center gap-2 bg-[#1A365D] hover:bg-[#132743] text-white font-bold text-xs h-10 px-4 rounded-xl transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Registrar examen
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            type="button"
            onClick={() => setStrFiltro(f.clave)}
            className={`px-4 h-9 rounded-full text-xs font-bold border transition cursor-pointer ${strFiltro === f.clave
              ? "bg-[#1A365D] text-white border-[#1A365D]"
              : "bg-white text-[#1A365D] border-slate-300 hover:bg-slate-50"}`}
          >
            {f.etiqueta}
          </button>
        ))}
        <select
          value={strAsignatura}
          onChange={(e) => setStrAsignatura(e.target.value)}
          aria-label="Filtrar por asignatura"
          className="ml-auto h-9 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 px-3 max-w-[260px]"
        >
          <option value="">Asignatura: todas</option>
          {listAsignaturas.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {boolCargando ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold animate-pulse bg-white rounded-3xl border border-slate-200">
            Cargando exámenes del docente...
          </div>
        ) : listVisibles.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-white rounded-3xl border border-slate-200">
            {examenes.length === 0
              ? "No tienes exámenes ni asignaturas asignadas en el sistema."
              : "No hay exámenes que coincidan con el filtro."}
          </div>
        ) : (
          listVisibles.map((examen) => (
            <TarjetaExamen key={examen.idExamen} examen={examen} boolResaltado={String(examen.idExamen) === String(idResaltado)} />
          ))
        )}
      </div>
    </div>
  );
}
