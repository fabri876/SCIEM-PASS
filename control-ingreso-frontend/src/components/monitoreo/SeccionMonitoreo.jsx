import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Ban,
  AlertOctagon,
  MapPin,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  X,
  WifiOff,
} from "lucide-react";
import {
  obtenerExamenesMonitoreo,
  obtenerTableroMonitoreo,
  reubicarYAutorizar,
} from "../../services/monitoreoService";
import { formatearFecha, formatearHora } from "../incidencias/utilidadesIncidencias";

const INTERVALO_MS = 15000;

const ESTILO_NIVEL = {
  FUERA_DE_LIMITE: { etiqueta: "Aula Fuera de Límite", pill: "bg-rose-600 text-white", barra: "bg-rose-500", borde: "border-rose-300 ring-2 ring-rose-100" },
  ALTA: { etiqueta: "Ocupación alta", pill: "bg-amber-100 text-amber-800", barra: "bg-amber-500", borde: "border-slate-200" },
  DISPONIBLE: { etiqueta: "Con cupos", pill: "bg-emerald-100 text-emerald-800", barra: "bg-emerald-500", borde: "border-slate-200" },
};

function horaSegundos(strFechaHora) {
  if (!strFechaHora) return "--:--:--";
  const partes = String(strFechaHora).split("T");
  return (partes.length > 1 ? partes[1] : partes[0]).substring(0, 8);
}

function Kpi({ Icono, titulo, valor, detalle, tono = "navy", children }) {
  const colores = {
    navy: "text-[#003770]",
    verde: "text-emerald-700",
    ambar: "text-amber-700",
    rojo: "text-rose-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
        <Icono className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{titulo}</span>
      </div>
      <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${colores[tono]}`}>{valor}</span>
      {children}
      {detalle && <span className="text-[11px] font-semibold text-slate-500">{detalle}</span>}
    </div>
  );
}

/**
 * HU10 · Dashboard de monitoreo de asistencia y control de aulas.
 * rol: "DOCENTE" (exámenes asignados, puede reubicar) o "ADMINISTRADOR" (todos, solo ve).
 */
export default function SeccionMonitoreo({ rol = "DOCENTE" }) {
  const [examenes, setExamenes] = useState([]);
  const [idExamen, setIdExamen] = useState(null);
  const [tablero, setTablero] = useState(null);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [boolSinConexion, setBoolSinConexion] = useState(false);
  const [intSegundos, setIntSegundos] = useState(0);

  const [alertaAReubicar, setAlertaAReubicar] = useState(null);
  const [boolReubicando, setBoolReubicando] = useState(false);
  const [strErrorReubicar, setStrErrorReubicar] = useState("");
  const [strExito, setStrExito] = useState("");

  const idExamenRef = useRef(null);
  useEffect(() => {
    idExamenRef.current = idExamen;
  }, [idExamen]);

  // 1. Exámenes del selector (hoy primero)
  useEffect(() => {
    let cancelado = false;
    obtenerExamenesMonitoreo()
      .then((lista) => {
        if (cancelado) return;
        const arr = Array.isArray(lista) ? lista : [];
        setExamenes(arr);
        setIdExamen(arr[0]?.idExamen ?? null);
        if (arr.length === 0) setBoolCargando(false);
      })
      .catch((err) => {
        if (!cancelado) {
          setStrError(err.message || "No se pudieron cargar tus exámenes.");
          setBoolCargando(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // 2. Tablero: carga inmediata y luego cada 15 s (se pausa con la pestaña oculta)
  const fnActualizar = useCallback(async () => {
    const id = idExamenRef.current;
    if (!id) return;
    try {
      const datos = await obtenerTableroMonitoreo(id);
      if (idExamenRef.current !== id) return; // cambió de examen mientras cargaba
      setTablero(datos);
      setBoolSinConexion(false);
      setStrError("");
      setIntSegundos(0);
    } catch (err) {
      // Se conservan los últimos datos y se avisa
      setBoolSinConexion(true);
      setStrError(err.message || "No se pudo actualizar el dashboard.");
    } finally {
      setBoolCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!idExamen) return undefined;
    setBoolCargando(true);
    setTablero(null);
    fnActualizar();

    const intervalo = setInterval(() => {
      if (!document.hidden) fnActualizar();
    }, INTERVALO_MS);
    const alVolver = () => {
      if (!document.hidden) fnActualizar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [idExamen, fnActualizar]);

  // "Actualizado hace X s"
  useEffect(() => {
    const reloj = setInterval(() => setIntSegundos((s) => s + 1), 1000);
    return () => clearInterval(reloj);
  }, []);

  const fnConfirmarReubicacion = async () => {
    if (!alertaAReubicar || boolReubicando) return;
    setBoolReubicando(true);
    setStrErrorReubicar("");
    try {
      const res = await reubicarYAutorizar(alertaAReubicar.idIntento);
      setStrExito(res?.mensaje || "Reubicación registrada.");
      setAlertaAReubicar(null);
      fnActualizar();
      setTimeout(() => setStrExito(""), 6000);
    } catch (err) {
      // La asignación original se mantiene: el backend no guardó nada
      setStrErrorReubicar(err.message || "No se pudo completar la reubicación. Se mantiene la asignación original.");
      fnActualizar();
    } finally {
      setBoolReubicando(false);
    }
  };

  const m = tablero?.metricas;
  const examenActual = examenes.find((e) => e.idExamen === idExamen);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* Barra superior: examen y estado de actualización */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-[#003770]">Monitoreo de asistencia</h3>
          <p className="text-xs text-slate-500 font-semibold">
            {rol === "DOCENTE" ? "Tus exámenes asignados" : "Todos los exámenes"} · se actualiza solo cada 15 segundos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tablero && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full border ${
              boolSinConexion ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}>
              {boolSinConexion ? <WifiOff className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              {boolSinConexion
                ? `Sin conexión · datos de las ${horaSegundos(tablero.actualizado)}`
                : `Actualizado hace ${intSegundos} s`}
            </span>
          )}
          <select
            value={idExamen ?? ""}
            onChange={(e) => setIdExamen(Number(e.target.value))}
            disabled={examenes.length === 0}
            className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-full"
          >
            {examenes.length === 0 && <option value="">Sin exámenes</option>}
            {examenes.map((ex) => (
              <option key={ex.idExamen} value={ex.idExamen}>
                {ex.asignatura} · {formatearFecha(ex.fechaExamen)}
                {ex.horaInicio ? ` · ${ex.horaInicio.substring(0, 5)}–${(ex.horaFin || "").substring(0, 5)}` : ""}
                {ex.enCurso ? " · EN CURSO" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={fnActualizar}
            disabled={!idExamen}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 p-2 rounded-xl transition cursor-pointer disabled:opacity-45"
            title="Actualizar ahora"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {strError && !tablero && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-bold">✕ {strError}</div>
      )}
      {strExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{strExito}</span>
        </div>
      )}
      {!boolCargando && examenes.length === 0 && !strError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-xs font-bold">
          No tienes exámenes asignados para monitorear.
        </div>
      )}
      {boolCargando && !tablero && examenes.length > 0 && (
        <div className="text-center py-10 text-slate-400 text-xs font-semibold animate-pulse">Cargando el dashboard del examen...</div>
      )}

      {tablero && m && (
        <>
          {/* Métricas generales */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi Icono={Users} titulo="Habilitados" valor={m.habilitados} detalle={`${tablero.aulas.length} aula(s)`} />
            <Kpi Icono={UserCheck} titulo="Ingresados" valor={m.ingresados} tono="verde"
              detalle={m.excepcionales > 0 ? `incluye ${m.excepcionales} excepcional(es)` : "registrados en el examen"} />
            <Kpi Icono={Clock} titulo="Pendientes" valor={m.pendientes} tono="ambar" detalle="habilitados que no ingresaron" />
            <Kpi Icono={TrendingUp} titulo="Avance" valor={`${m.porcentajeAvance}%`}>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, m.porcentajeAvance)}%` }} />
              </div>
            </Kpi>
            <Kpi Icono={Ban} titulo="Duplicados Bloqueados" valor={m.duplicadosBloqueados} tono={m.duplicadosBloqueados > 0 ? "rojo" : "navy"} />
            <Kpi Icono={AlertOctagon} titulo="Aulas Fuera de Límite" valor={m.aulasFueraDeLimite} tono={m.aulasFueraDeLimite > 0 ? "rojo" : "navy"} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

            {/* Aulas: la más ocupada primero */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-black text-[#003770]">Ocupación por aula</h4>
                <div className="flex gap-3 text-[10px] font-bold text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Con cupos</span>
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-500 inline-block" />70 % o más</span>
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Fuera de límite</span>
                </div>
              </div>
              {tablero.aulas.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-6 text-center">El examen no tiene aulas asignadas.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tablero.aulas.map((aula) => {
                    const estilo = aula.capacidad == null
                      ? { etiqueta: "Sin capacidad registrada", pill: "bg-slate-100 text-slate-600", barra: "bg-slate-400", borde: "border-slate-200" }
                      : ESTILO_NIVEL[aula.nivel] || ESTILO_NIVEL.DISPONIBLE;
                    return (
                      <div key={aula.idAmbiente} className={`border rounded-2xl p-3.5 space-y-2 ${estilo.borde}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-[#003770] text-sm truncate">{aula.aula}</p>
                            {aula.ubicacion && <p className="text-[10.5px] text-slate-500 font-semibold truncate">{aula.ubicacion}</p>}
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 text-center ${estilo.pill}`}>{estilo.etiqueta}</span>
                        </div>
                        <p className="text-xl font-black text-slate-800 tabular-nums">
                          {aula.ingresados}
                          <span className="text-xs font-bold text-slate-500">
                            {aula.capacidad != null ? ` / ${aula.capacidad} · ${aula.porcentajeOcupacion}%` : " ingresados"}
                          </span>
                        </p>
                        {aula.capacidad != null && (
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${estilo.barra}`}
                              style={{ width: `${Math.min(100, aula.porcentajeOcupacion)}%` }} />
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-1 text-[10.5px] font-bold text-slate-600 pt-1 border-t border-dashed border-slate-200">
                          <span>Asignados <b className="block text-slate-800 tabular-nums">{aula.asignados}</b></span>
                          <span>Pendientes <b className="block text-amber-700 tabular-nums">{aula.pendientes}</b></span>
                          <span>Cupos <b className="block text-slate-800 tabular-nums">{aula.disponibles ?? "—"}</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Estudiantes en un aula diferente */}
            <div className="xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-black text-[#003770]">Estudiantes en un aula diferente</h4>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${tablero.alertas.length ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                  {tablero.alertas.length}
                </span>
              </div>
              {tablero.alertas.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-6 text-center">Ningún estudiante se presentó en un aula que no es la suya.</p>
              ) : (
                <div className="space-y-2.5">
                  {tablero.alertas.map((alerta) => (
                    <div key={alerta.idIntento} className="border border-rose-200 bg-rose-50/40 rounded-2xl p-3.5 space-y-2 text-xs break-words">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-slate-800">{alerta.estudiante}</p>
                          <p className="text-[11px] font-bold text-slate-500">SIS {alerta.codSis}{alerta.ci ? ` · CI ${alerta.ci}` : ""} · {formatearHora(alerta.hora)}</p>
                        </div>
                        <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white text-center shrink-0">INGRESO A UN AMBIENTE DIFERENTE</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11.5px] font-bold">
                        <span className="flex items-center gap-1 text-rose-700"><MapPin className="w-3.5 h-3.5" />Está en {alerta.aulaActual}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-emerald-800">
                          Debe dirigirse al {alerta.aulaAsignada}{alerta.ubicacionAsignada ? ` (${alerta.ubicacionAsignada})` : ""}
                        </span>
                      </div>
                      {rol === "DOCENTE" && alerta.puedeReubicar ? (
                        <button
                          onClick={() => {
                            setStrErrorReubicar("");
                            setAlertaAReubicar(alerta);
                          }}
                          className="w-full sm:w-auto bg-[#1A365D] hover:bg-[#132743] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Reubicar y Autorizar en {alerta.aulaActual}
                          {alerta.cuposAulaActual != null ? ` · ${alerta.cuposAulaActual} cupo(s)` : ""}
                        </button>
                      ) : (
                        <p className="text-[11px] font-bold text-slate-500">{alerta.motivoNoReubicable}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirmación de la reubicación express */}
      {alertaAReubicar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-black text-[#003770]">¿Reubicar y autorizar el ingreso?</h3>
              <button onClick={() => setAlertaAReubicar(null)} disabled={boolReubicando}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 font-semibold">
              <b className="text-slate-800">{alertaAReubicar.estudiante}</b> (SIS {alertaAReubicar.codSis}) pasará del{" "}
              <b className="text-slate-800">{alertaAReubicar.aulaAsignada}</b> al{" "}
              <b className="text-slate-800">{alertaAReubicar.aulaActual}</b>, y se registrará su ingreso ahora.
            </p>
            <p className="text-[11px] text-blue-900 font-bold bg-blue-50 border border-blue-200 rounded-xl p-2.5">
              Quedará en el historial de auditoría con tu usuario, la fecha y hora oficiales y tu IP.
            </p>
            {strErrorReubicar && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">✕ {strErrorReubicar}</div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setAlertaAReubicar(null)} disabled={boolReubicando}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                Cancelar
              </button>
              <button onClick={fnConfirmarReubicacion} disabled={boolReubicando}
                className="flex-[1.5] bg-[#1A365D] hover:bg-[#132743] disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
                {boolReubicando && <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                Confirmar reubicación
              </button>
            </div>
          </div>
        </div>
      )}

      {examenActual && tablero && (
        <p className="text-[11px] text-slate-400 font-semibold text-right">
          {examenActual.asignatura} · {formatearFecha(examenActual.fechaExamen)} · datos de las {horaSegundos(tablero.actualizado)}
        </p>
      )}
    </div>
  );
}
