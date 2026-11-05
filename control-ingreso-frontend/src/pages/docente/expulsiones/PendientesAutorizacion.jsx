import React, { useState, useEffect } from "react";
import {
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from "lucide-react";
import {
  listarPendientesDocente,
  autorizarExpulsion,
  denegarExpulsion,
} from "../../../services/expulsionService";
import { formatearFecha, formatearHora } from "../../../components/incidencias/utilidadesIncidencias";

/**
 * HU14 · Pendientes de Autorización.
 * Muestra en una tabla TODAS las expulsiones pendientes de los exámenes del
 * docente autenticado (no pide ID de examen). Cada fila trae al operador que
 * la registró, el estudiante, materia, aula y fecha, y permite autorizar o
 * denegar.
 */
export default function PendientesAutorizacion() {
  const [pendientes, setPendientes] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strProcesando, setStrProcesando] = useState(""); // "accion-idExpulsion"
  const [strMensaje, setStrMensaje] = useState(null); // { tipo: "ok" | "error", texto }
  const [idExpandido, setIdExpandido] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setBoolCargando(true);
    try {
      const lista = await listarPendientesDocente();
      setPendientes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setStrMensaje({
        tipo: "error",
        texto: err.message || "No se pudieron cargar las expulsiones pendientes.",
      });
      setPendientes([]);
    } finally {
      setBoolCargando(false);
    }
  }

  async function fnDecidir(expulsion, accion) {
    const esAutorizar = accion === "autorizar";
    const verbo = esAutorizar ? "autorizar" : "denegar";
    if (
      !window.confirm(
        `¿Está seguro que desea ${verbo} la expulsión de ${expulsion.nombreEstudiante}?`
      )
    ) {
      return;
    }

    setStrProcesando(`${accion}-${expulsion.idExpulsion}`);
    setStrMensaje(null);

    try {
      if (esAutorizar) {
        await autorizarExpulsion(expulsion.idExamen, expulsion.idExpulsion);
      } else {
        await denegarExpulsion(expulsion.idExamen, expulsion.idExpulsion);
      }
      setStrMensaje({
        tipo: "ok",
        texto: `Expulsión de ${expulsion.nombreEstudiante} ${
          esAutorizar ? "autorizada" : "denegada"
        } correctamente.`,
      });
      await cargarDatos();
    } catch (err) {
      setStrMensaje({
        tipo: "error",
        texto: err.message || "No se pudo procesar la expulsión.",
      });
    } finally {
      setStrProcesando("");
    }
  }

  if (boolCargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A365D]" />
        <p className="mt-3 text-slate-600 text-sm">Cargando expulsiones pendientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-[#1A365D] text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[140px]">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
          Pendientes de Autorización
        </h2>
        <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
          Expulsiones registradas por el Personal de Control en sus exámenes. Autorícelas para
          bloquear el reingreso del estudiante o deniéguelas para dejarlas sin efecto.
        </p>
      </div>

      {/* Contador */}
      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          Tiene <strong>{pendientes.length}</strong> expulsión(es) pendiente(s) de decisión.
        </span>
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
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {strMensaje.texto}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs overflow-hidden">
        {pendientes.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-600">No hay expulsiones pendientes</h3>
            <p className="text-slate-500 text-sm">
              Todos los registros de expulsión han sido autorizados o denegados.
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
                  <th className="px-4 py-3 font-extrabold text-center">Descripción</th>
                  <th className="px-4 py-3 font-extrabold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendientes.map((expulsion) => {
                  const expandido = idExpandido === expulsion.idExpulsion;
                  const procesando = strProcesando.endsWith(`-${expulsion.idExpulsion}`);
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
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => fnDecidir(expulsion, "autorizar")}
                              disabled={procesando}
                              className="bg-[#1A365D] text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#2563EB] transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                            >
                              {procesando && strProcesando.startsWith("autorizar") ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Autorizar
                            </button>
                            <button
                              type="button"
                              onClick={() => fnDecidir(expulsion, "denegar")}
                              disabled={procesando}
                              className="bg-white text-[#B91C1C] border border-[#FCA5A5] px-4 py-2 rounded-lg font-bold text-xs hover:bg-rose-50 transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                            >
                              {procesando && strProcesando.startsWith("denegar") ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              Denegar
                            </button>
                          </div>
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
                                <span className="font-bold text-[#1A365D]">Hora de expulsión:</span>{" "}
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
        <Clock className="w-3.5 h-3.5" /> Las decisiones son definitivas: una expulsión autorizada
        no se puede revocar.
      </p>
    </div>
  );
}
