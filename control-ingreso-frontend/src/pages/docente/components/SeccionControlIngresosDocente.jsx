import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Clock, ScanLine, Users, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { obtenerAsignacionIngreso } from "../../../services/asignacionOperadoresService";

const ESTADOS = {
  EN_CURSO: { texto: "En curso", clase: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
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

export default function SeccionControlIngresosDocente({ examenes = [], boolCargando = false, onAsignarOperadores }) {
  const navigate = useNavigate();
  const listExamenes = (examenes || []).filter((ex) => ex.esExamenReal !== false);
  const numDisponibles = listExamenes.length;

  const [objNomina, setObjNomina] = useState({});

  const fnDescargar = (id) => {
    setObjNomina((prev) => ({ ...prev, [id]: "descargando" }));
    setTimeout(() => {
      setObjNomina((prev) => ({ ...prev, [id]: "listo" }));
    }, 1600);
  };

  // Asignación de operadores de cada examen: { [idExamen]: { cargada, responsables } }
  const [objAsignaciones, setObjAsignaciones] = useState({});
  const strIdsExamenes = listExamenes.map((ex) => ex.idExamen).join(",");
  useEffect(() => {
    let cancel = false;
    Promise.all(
      listExamenes.map((ex) =>
        obtenerAsignacionIngreso(ex.idExamen)
          .then((a) => [ex.idExamen, { cargada: true, responsables: a ? (a.responsables || []).length : 0, hay: Boolean(a) }])
          .catch(() => [ex.idExamen, { cargada: true, responsables: 0, hay: false }])
      )
    ).then((pares) => { if (!cancel) setObjAsignaciones(Object.fromEntries(pares)); });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strIdsExamenes]);

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
              const objAsig = objAsignaciones[examen.idExamen];
              const boolBloqueada = estado === "EN_CURSO" || estado === "FINALIZADO";
              const boolHayAsignacion = Boolean(objAsig?.hay);
              const strEstadoNomi = objNomina[examen.idExamen] || "ninguna";
              const boolDescargando = strEstadoNomi === "descargando";
              const boolListo = strEstadoNomi === "listo";

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
                        <p className="text-sm text-slate-600 font-medium mt-2 flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          {boolHayAsignacion ? (
                            <span><b>{objAsig.responsables} {objAsig.responsables === 1 ? "responsable asignado" : "responsables asignados"}</b></span>
                          ) : boolBloqueada ? (
                            <span>Sin operadores asignados · el docente atendió el ingreso</span>
                          ) : (
                            <span><b className="text-[#B91C1C]">Sin operadores asignados</b> · si no asignas, tú registras los ingresos</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 self-start lg:self-center lg:min-w-48">
                      {onAsignarOperadores && (
                        <button
                          type="button"
                          onClick={() => onAsignarOperadores(examen.idExamen)}
                          className={`font-bold text-sm py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap ${
                            boolHayAsignacion || boolBloqueada
                              ? "bg-white border border-slate-300 hover:bg-slate-50 text-[#003770]"
                              : "bg-[#003770] hover:bg-[#002a55] text-white"
                          }`}
                        >
                          {boolBloqueada ? "Ver operadores" : boolHayAsignacion ? "Editar operadores" : "Asignar operadores"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/control-ingreso`)}
                        className={`font-bold text-sm py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap ${
                          onAsignarOperadores && !boolHayAsignacion && !boolBloqueada
                            ? "bg-white border border-slate-300 hover:bg-slate-50 text-[#003770]"
                            : "bg-[#003770] hover:bg-[#002a55] text-white"
                        }`}
                      >
                        Control de ingreso →
                      </button>
                      <button
                        type="button"
                        onClick={() => fnDescargar(examen.idExamen)}
                        disabled={boolDescargando || boolListo}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#267BC2] hover:bg-[#124B83] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        {boolDescargando ? "Descargando…" : boolListo ? "Nómina descargada" : "Descargar nómina"}
                      </button>
                    </div>
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
