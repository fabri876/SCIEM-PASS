import { BookOpen, CalendarDays, Clock, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ESTADOS = {
  EN_CURSO: { texto: "En curso", clase: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PROXIMO: { texto: "Próximo", clase: "bg-slate-100 text-slate-600 border-slate-200" },
  FINALIZADO: { texto: "Finalizado", clase: "bg-slate-100 text-slate-500 border-slate-200" },
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function parsearFecha(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) return fecha;
  const m = String(fecha).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function parsearHora(hora) {
  const m = String(hora || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { h: Number(m[1]), min: Number(m[2]) };
}

function estadoExamen(examen) {
  if (examen.estado === "EN_CURSO" || examen.estado === "PROXIMO" || examen.estado === "FINALIZADO") {
    return examen.estado;
  }
  const d = parsearFecha(examen.fechaExamen);
  const inicio = parsearHora(examen.horaInicio);
  const fin = parsearHora(examen.horaFin);
  if (!d) return "PROXIMO";

  const ahora = new Date();
  const tInicio = new Date(d);
  if (inicio) tInicio.setHours(inicio.h, inicio.min, 0, 0);
  else tInicio.setHours(0, 0, 0, 0);

  const tFin = new Date(d);
  if (fin) tFin.setHours(fin.h, fin.min, 0, 0);
  else tFin.setHours(23, 59, 59, 999);

  if (ahora > tFin) return "FINALIZADO";
  if (ahora >= tInicio && ahora <= tFin) return "EN_CURSO";
  return "PROXIMO";
}

function formatearFechaLarga(fecha) {
  const d = parsearFecha(fecha);
  if (!d) return "Fecha por definir";
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function horaCorta(hora) {
  if (!hora) return "--:--";
  return String(hora).substring(0, 5);
}

export default function SeccionControlIngresosDocente({ examenes = [], boolCargando = false }) {
  const navigate = useNavigate();
  const listExamenes = (examenes || []).filter((ex) => ex.esExamenReal !== false);
  const numDisponibles = listExamenes.length;

  return (
    <div className="space-y-6">
      <div
        className="w-full text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex items-center gap-5 min-h-[130px]"
        style={{ backgroundImage: "linear-gradient(to right, #1A365D, #2563EB, #DC2626)" }}
      >
        <span className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
          <ScanLine className="w-7 h-7" />
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
            Control de ingreso
          </h1>
          <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
            Selecciona el examen para gestionar el ingreso de los estudiantes.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-base font-black text-[#1A365D] flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Exámenes próximos
          </h3>
          <span className="text-[11px] font-extrabold text-[#1A365D] bg-slate-100 px-3 py-1 rounded-full">
            {numDisponibles} {numDisponibles === 1 ? "examen disponible" : "exámenes disponibles"}
          </span>
        </div>

        {boolCargando ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold animate-pulse">
            Cargando exámenes del docente...
          </div>
        ) : listExamenes.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-[#F8FAFC] rounded-2xl border border-slate-200">
            No tienes exámenes registrados para controlar ingresos.
          </div>
        ) : (
          <div className="space-y-4">
            {listExamenes.map((examen) => {
              const estado = estadoExamen(examen);
              const estilo = ESTADOS[estado] || ESTADOS.PROXIMO;
              const total = examen.totalInscritos || 0;
              const ingresados = examen.ingresados || 0;
              const porcentaje = total > 0 ? Math.round((ingresados / total) * 100) : 0;
              const aula = examen.aulaNombre || examen.aula || "Aula por definir";
              const bloque = examen.bloque ? ` · ${examen.bloque}` : "";

              return (
                <article
                  key={examen.idExamen}
                  className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#1A365D] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-sm text-[#1A365D] uppercase tracking-tight">
                            {examen.nombreExamen}
                          </h4>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${estilo.clase}`}>
                            {estilo.texto}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          {aula}{bloque}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            {formatearFechaLarga(examen.fechaExamen)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {horaCorta(examen.horaInicio)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/control-ingreso`)}
                      className="bg-[#1A365D] hover:bg-[#132743] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer self-start lg:self-center whitespace-nowrap"
                    >
                      Control de ingreso →
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span>Progreso de ingreso de estudiantes</span>
                      <span className="font-mono text-[#1A365D]">
                        {ingresados} / {total} ({porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
