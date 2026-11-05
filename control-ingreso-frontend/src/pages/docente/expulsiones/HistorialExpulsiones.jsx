import React, { useState, useEffect } from "react";
import {
  Clock,
  Loader2,
  AlertTriangle,
  Mail,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from "lucide-react";
import { listarHistorialDocente } from "../../../services/expulsionService";
import { formatearFecha, formatearHora } from "../../../components/incidencias/utilidadesIncidencias";

/**
 * HU14 · Historial de Expulsiones.
 * Muestra TODAS las expulsiones de los exámenes del docente autenticado
 * (no pide ID de examen). Permite filtrar por materia y estado, y exportar
 * a CSV.
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
      setHistorial(Array.isArray(lista) ? lista : []);
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
      (e.nombreAsignatura && e.nombreAsignatura.toLowerCase().includes(strFiltroMateria.trim().toLowerCase()));
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
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-[#1A365D] text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[140px]">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
          Historial de Expulsiones
        </h2>
        <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
          Consulte todas las expulsiones registradas en sus exámenes, ordenadas de más reciente a más antigua.
        </p>
      </div>

      {/* Mensaje de feedback */}
      {strMensaje && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
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

      {/* Filtros y exportar */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs p-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-bold text-slate-600 mb-1">Materia</label>
          <input
            type="text"
            placeholder="Filtrar por materia..."
            value={strFiltroMateria}
            onChange={(e) => setStrFiltroMateria(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] text-sm focus:border-[#1A365D] focus:outline-none"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-600 mb-1">Estado</label>
          <select
            value={strFiltroEstado}
            onChange={(e) => setStrFiltroEstado(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] text-sm bg-white focus:border-[#1A365D] focus:outline-none"
          >
            <option value="TODOS">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="AUTORIZADA">Autorizada</option>
            <option value="DENEGADA">Denegada</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-bold text-slate-600 mb-1">Acciones</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cargarHistorial}
              className="flex-1 bg-[#1A365D] text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#2563EB] transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Clock className="w-4 h-4" /> Refrescar
            </button>
            <button
              type="button"
              onClick={fnExportarCSV}
              className="flex-1 bg-white text-[#1A365D] border border-[#CBD5E1] px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#F8FAFC] transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total</div>
          <div className="text-2xl font-black text-[#1A365D]">{historialFiltrado.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Pendientes</div>
          <div className="text-2xl font-black text-[#F59E0B]">
            {historialFiltrado.filter((e) => e.estado === "PENDIENTE").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Autorizadas</div>
          <div className="text-2xl font-black text-[#16A34A]">
            {historialFiltrado.filter((e) => e.estado === "AUTORIZADA").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Denegadas</div>
          <div className="text-2xl font-black text-[#DC2626]">
            {historialFiltrado.filter((e) => e.estado === "DENEGADA").length}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs overflow-hidden">
        {historialFiltrado.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-600">No hay expulsiones registradas</h3>
            <p className="text-slate-500 text-sm">
              No se han encontrado expulsiones con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
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
                      <tr className="hover:bg-slate-50/60 transition align-top">
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#08264A]">
                            {expulsion.nombreEstudiante || "—"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            CI: {expulsion.ciEstudiante || "—"} · SIS:{" "}
                            {expulsion.codSisEstudiante || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {expulsion.nombreAsignatura || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{expulsion.aula || "—"}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {formatearFecha(expulsion.fechaExamen || expulsion.fechaExpulsion)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {expulsion.nombreRegistra || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              expulsion.estado === "AUTORIZADA"
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : expulsion.estado === "DENEGADA"
                                ? "bg-[#FEE2E2] text-[#991B1B]"
                                : "bg-[#FEF3C7] text-[#92400E]"
                            }`}
                          >
                            {expulsion.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setIdExpandido(expandido ? null : expulsion.idExpulsion)}
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
                              <p>
                                <span className="font-bold text-[#1A365D]">Estado:</span>{" "}
                                {expulsion.estado}
                              </p>
                              {expulsion.fechaAutorizacion && expulsion.estado !== "PENDIENTE" && (
                                <p>
                                  <span className="font-bold text-[#1A365D]">Decisión:</span>{" "}
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
        <Clock className="w-3.5 h-3.5" /> Use los filtros de materia y estado para acotar la lista.
      </p>
    </div>
  );
}
