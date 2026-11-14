// Sección "Mis exámenes": lista completa del docente con filtros por estado y por asignatura.
// Orden: primero en curso, luego los próximos (el más cercano primero) y al final los finalizados (el más reciente primero).
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { estadoExamen, marcaTiempo } from "../utilidadesExamenDocente";
import TarjetaExamenDocente from "./TarjetaExamenDocente";

const FILTROS = [
  { clave: "TODOS", etiqueta: "Todos" },
  { clave: "EN_CURSO", etiqueta: "En curso" },
  { clave: "PROXIMO", etiqueta: "Próximos" },
  { clave: "FINALIZADO", etiqueta: "Finalizados" },
  { clave: "CANCELADO", etiqueta: "Cancelados" },
];

const ORDEN_ESTADO = { EN_CURSO: 0, PROXIMO: 1, SIN_FECHA: 2, FINALIZADO: 3, CANCELADO: 4 };

export default function SeccionMisExamenes({
  examenes = [],
  boolCargando = false,
  TarjetaExamen = TarjetaExamenDocente,
  onRegistrar,
  idResaltado = null,
  onCambio,
}) {
  const [strFiltro, setStrFiltro] = useState("TODOS");
  const [strAsignatura, setStrAsignatura] = useState("");
  // Hora actual: se actualiza cada 30 s para que los botones aparezcan y desaparezcan solos
  const [dateAhora, setDateAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const listAsignaturas = useMemo(
    () => [...new Set(examenes.map((e) => e.nombreExamen).filter(Boolean))].sort(),
    [examenes]
  );

  const listVisibles = useMemo(() => examenes
    .filter((e) => (strAsignatura ? e.nombreExamen === strAsignatura : true))
    .map((e) => ({ examen: e, strEstado: e.esExamenReal === false ? "SIN_FECHA" : estadoExamen(e, dateAhora) }))
    .filter(({ strEstado }) => strFiltro === "TODOS" || strEstado === strFiltro)
    .sort((a, b) => {
      if (ORDEN_ESTADO[a.strEstado] !== ORDEN_ESTADO[b.strEstado]) return ORDEN_ESTADO[a.strEstado] - ORDEN_ESTADO[b.strEstado];
      // Finalizados y cancelados: el más reciente primero · los demás: el más cercano primero
      return a.strEstado === "FINALIZADO" || a.strEstado === "CANCELADO"
        ? marcaTiempo(b.examen) - marcaTiempo(a.examen)
        : marcaTiempo(a.examen) - marcaTiempo(b.examen);
    })
    .map(({ examen }) => examen), [examenes, strAsignatura, strFiltro, dateAhora]);

  useEffect(() => {
    if (!idResaltado) return;
    const el = document.getElementById(`examen-${idResaltado}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [idResaltado, listVisibles.length]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-[#1A365D]">Mis exámenes</h1>
        <button
          type="button"
          onClick={onRegistrar}
          className="inline-flex items-center gap-2 bg-[#003770] hover:bg-[#124B83] text-white font-bold text-xs h-10 px-4 rounded-xl transition shadow-xs cursor-pointer"
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

      <div className="space-y-3">
        {boolCargando ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold animate-pulse bg-white rounded-2xl border border-slate-200">
            Cargando exámenes del docente...
          </div>
        ) : listVisibles.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-white rounded-2xl border border-slate-200">
            {examenes.length === 0
              ? "No tienes exámenes ni asignaturas asignadas en el sistema."
              : "No hay exámenes que coincidan con el filtro."}
          </div>
        ) : (
          listVisibles.map((examen) => (
            <TarjetaExamen
              key={examen.idExamen}
              examen={examen}
              dateAhora={dateAhora}
              boolResaltado={String(examen.idExamen) === String(idResaltado)}
              onCambio={onCambio}
            />
          ))
        )}
      </div>
    </div>
  );
}