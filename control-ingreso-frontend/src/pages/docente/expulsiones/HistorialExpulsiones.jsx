import React, { useState, useEffect } from "react";
import {
  Clock,
  Loader2,
  AlertTriangle,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Search,
} from "lucide-react";
import { listarHistorialDocente } from "../../../services/expulsionService";
import { formatearFecha, formatearHora } from "../../../components/incidencias/utilidadesIncidencias";

/**
 * HU14 · Historial de Expulsiones.
 * Muestra las expulsiones AUTORIZADAS de los exámenes del docente
 * autenticado (el docente registra y autoriza directamente).
 * Permite filtrar por materia y exportar a CSV.
 */
export default function HistorialExpulsiones() {
  const [historial, setHistorial] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strMensaje, setStrMensaje] = useState(null);
  const [strFiltroMateria, setStrFiltroMateria] = useState("");
  const [strFiltroEstado, setStrFiltroEstado] = useState("TODOS");
  const [idExpandido, setIdExpandido] = useState(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setBoolCargando(true);
    setStrMensaje(null);
    try {
      const lista = await listarHistorialDocente(
        strFiltroMateria.trim() || null,
        strFiltroEstado === "TODOS" ? null : strFiltroEstado
      );
      // El docente solo registra expulsiones AUTORIZADAS: se ocultan registros
      // antiguos en estado PENDIENTE o DENEGADA.
      setHistorial(
        (Array.isArray(lista) ? lista : []).filter((e) => e.estado === "AUTORIZADA")
      );
    } catch (err) {
      setStrMensaje({
        tipo: "error",
        texto: err.message || "No se pudo cargar el historial de expulsiones.",
      });
      setHistorial([]);
    } finally {
      setBoolCargando(false);
    }
  }

  const historialFiltrado = historial.filter((e) => {
    const coincideMateria =
      !strFiltroMateria.trim() ||
      (e.nombreAsignatura &&
        e.nombreAsignatura.toLowerCase().includes(strFiltroMateria.trim().toLowerCase()));
    const coincideEstado =
      strFiltroEstado === "TODOS" || e.estado === strFiltroEstado;
    return coincideMateria && coincideEstado;
  });

  const fnExportarCSV = () => {
    if (historialFiltrado.length === 0) {
      setStrMensaje({ tipo: "error", texto: "No hay datos para exportar." });
      return;
    }

    const cabecera =
      "ID Expulsión,Estudiante,C.I.,SIS,Materia,Aula,Fecha,Motivo,Descripción,Estado,Fecha y hora,Registró,Autorizó,Evidencia\n";

    const filas = historialFiltrado.map((e) => {
      const escapar = (v) => {
        if (v == null) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      return [
        escapar(e.idExpulsion),
        escapar(e.nombreEstudiante),
        escapar(e.ciEstudiante),
        escapar(e.codSisEstudiante),
        escapar(e.nombreAsignatura),
        escapar(e.aula),
        escapar(e.fechaExamen),
        escapar(e.motivoExpulsion),
        escapar(e.observacion),
        escapar(e.estado),
        escapar(`${e.fechaExpulsion} ${formatearHora(e.horaExpulsion)}`),
        escapar(e.nombreRegistra),
        escapar(e.nombreAutoriza || ""),
        escapar(e.evidencia || ""),
      ].join(",");
    });

    const csv = cabecera + filas.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `historial_expulsiones_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    setStrMensaje({ tipo: "ok", texto: "Historial exportado a CSV." });
  };

  if (boolCargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A365D]" />
        <p className="mt-3 text-slate-600 text-sm">Cargando historial de expulsiones...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Encabezado compacto */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1A365D] text-white flex items-center justify-center shadow-sm shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-[#08264A]">
              Historial de Expulsiones
            </h2>
            <p className="text-xs text-slate-500">
              Expulsiones autorizadas en sus exámenes, de más reciente a más antigua.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-[#F1F5F9] text-center min-w-[74px]">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
              Total
            </div>
            <div className="text-lg font-black text-[#1A365D] leading-none mt-0.5">
              {historialFiltrado.length}
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#F0FDF4] text-center min-w-[74px]">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#166534]/70">
              Autorizadas
            </div>
            <div className="text-lg font-black text-[#16A34A] leading-none mt-0.5">
              {historialFiltrado.filter((e) => e.estado === "AUTORIZADA").length}
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de feedback */}
      {strMensaje && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
            strMensaje.tipo === "ok"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          {strMensaje.tipo === "ok" ? (
            <FileText className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {strMensaje.texto}
        </div>
      )}

      {/* Barra de filtros */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Materia</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por materia..."
              value={strFiltroMateria}
              onChange={(e) => setStrFiltroMateria(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#CBD5E1] text-sm bg-white focus:border-[#1A365D] focus:outline-none focus:ring-2 focus:ring-[#1A365D]/15 transition"
            />
          </div>
        </div>

        <div className="w-full lg:w-44">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Estado</label>
          <select
            value={strFiltroEstado}
            onChange={(e) => setStrFiltroEstado(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm bg-white focus:border-[#1A365D] focus:outline-none focus:ring-2 focus:ring-[#1A365D]/15 transition"
          >
            <option value="TODOS">Todas</option>
            <option value="AUTORIZADA">Autorizada</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={cargarHistorial}
            className="flex-1 lg:flex-none bg-[#1A365D] text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-[#2563EB] transition flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Clock className="w-4 h-4" /> Refrescar
          </button>
          <button
            type="button"
            onClick={fnExportarCSV}
            className="flex-1 lg:flex-none bg-white text-[#1A365D] border border-[#CBD5E1] px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-white hover:border-[#1A365D]/50 hover:shadow-sm transition flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
        {historialFiltrado.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-600">No hay expulsiones registradas</h3>
            <p className="text-slate-500 text-sm mt-1">
              No se han encontrado expulsiones con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-4 py-3 font-extrabold">Estudiante</th>
                  <th className="px-4 py-3 font-extrabold">Materia</th>
                  <th className="px-4 py-3 font-extrabold">Aula</th>
                  <th className="px-4 py-3 font-extrabold whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-3 font-extrabold">Registró</th>
                  <th className="px-4 py-3 font-extrabold text-center">Estado</th>
                  <th className="px-4 py-3 font-extrabold text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historialFiltrado.map((expulsion) => {
                  const expandido = idExpandido === expulsion.idExpulsion;
                  return (
                    <React.Fragment key={expulsion.idExpulsion}>
                      <tr className="hover:bg-[#F8FAFC] transition align-top">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[#08264A]">
                            {expulsion.nombreEstudiante || "—"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            CI: {expulsion.ciEstudiante || "—"} · SIS:{" "}
                            {expulsion.codSisEstudiante || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">
                          {expulsion.nombreAsignatura || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{expulsion.aula || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                          {formatearFecha(expulsion.fechaExamen || expulsion.fechaExpulsion)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {expulsion.nombreRegistra || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DCFCE7] text-[#166534]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                            {expulsion.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setIdExpandido(expandido ? null : expulsion.idExpulsion)
                            }
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#1A365D] hover:text-[#2563EB] transition"
                          >
                            {expandido ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            {expandido ? "Ocultar" : "Ver"}
                          </button>
                        </td>
                      </tr>

                      {expandido && (
                        <tr className="bg-[#F8FAFC]">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                              <p>
                                <span className="font-bold text-[#1A365D]">Motivo:</span>{" "}
                                {expulsion.motivoExpulsion || "—"}
                              </p>
                              <p>
                                <span className="font-bold text-[#1A365D]">Fecha y hora:</span>{" "}
                                {formatearFecha(expulsion.fechaExpulsion)} ·{" "}
                                {formatearHora(expulsion.horaExpulsion)}
                              </p>
                              <p className="md:col-span-2">
                                <span className="font-bold text-[#1A365D]">Descripción:</span>{" "}
                                {expulsion.observacion || "—"}
                              </p>
                              {expulsion.evidencia && (
                                <p className="md:col-span-2">
                                  <a
                                    href={expulsion.evidencia}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 font-bold text-[#1A365D] hover:text-[#2563EB] underline"
                                  >
                                    <Paperclip className="w-3.5 h-3.5" /> Ver foto de evidencia
                                  </a>
                                </p>
                              )}
                              {expulsion.fechaAutorizacion && (
                                <p>
                                  <span className="font-bold text-[#1A365D]">Autorizada por:</span>{" "}
                                  {expulsion.nombreAutoriza || "—"} ·{" "}
                                  {formatearFecha(expulsion.fechaAutorizacion)} ·{" "}
                                  {formatearHora(expulsion.fechaAutorizacion)}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Use el filtro de materia para acotar la lista.
      </p>
    </div>
  );
}
