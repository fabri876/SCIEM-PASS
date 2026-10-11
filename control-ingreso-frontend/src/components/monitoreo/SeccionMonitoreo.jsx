import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { RefreshCw, WifiOff, CheckCircle2, ShieldAlert } from "lucide-react";
import {
  obtenerExamenesMonitoreo,
  obtenerTableroMonitoreo,
  reubicarYAutorizar,
} from "../../services/monitoreoService";
import usePolling from "../../hooks/usePolling";
import useExtrasExamen from "../../hooks/useExtrasExamen";
import { formatearFecha } from "../incidencias/utilidadesIncidencias";
import { horaConSegundos, horaCorta, horaLocalActual, normalizarTablero } from "./utilidadesMonitoreo";
import TarjetasMetricas from "./TarjetasMetricas";
import TarjetaAula from "./TarjetaAula";
import PanelAulasCruzadas from "./PanelAulasCruzadas";
import ModalReubicacion from "./ModalReubicacion";
import CurvaLlegada from "./CurvaLlegada";
import ActividadReciente from "./ActividadReciente";
import DetalleAulaMonitoreo from "./DetalleAulaMonitoreo";

const INTERVALO_MS = 15000; // CA-04

/**
 * HU10 · Dashboard de monitoreo de asistencia y control de aulas.
 * Compartido por Admin y Docente (igual que SeccionIncidencias de la HU06).
 *   rol "DOCENTE"       → sus exámenes asignados; puede usar Reubicación Express.
 *   rol "ADMINISTRADOR" → todos los exámenes; solo consulta.
 */
export default function SeccionMonitoreo({ rol = "DOCENTE" }) {
  const [examenes, setExamenes] = useState([]);
  const [boolCargandoExamenes, setBoolCargandoExamenes] = useState(true);
  const [idExamen, setIdExamen] = useState(null);

  const [tablero, setTablero] = useState(null);
  const [boolCargandoTablero, setBoolCargandoTablero] = useState(false);
  const [strError, setStrError] = useState("");
  const [boolSinPermiso, setBoolSinPermiso] = useState(false);
  const [boolSinConexion, setBoolSinConexion] = useState(false);
  const [strHoraDatos, setStrHoraDatos] = useState("");
  const [intSegundos, setIntSegundos] = useState(0);
  const [boolActualizando, setBoolActualizando] = useState(false);

  const [alertaAReubicar, setAlertaAReubicar] = useState(null);
  const [boolReubicando, setBoolReubicando] = useState(false);
  const [strErrorReubicar, setStrErrorReubicar] = useState("");
  const [strExito, setStrExito] = useState("");

  const [aulaDetalle, setAulaDetalle] = useState(null); // aula abierta (detalle) o null

  const refExamen = useRef(null);
  const refAbort = useRef(null);
  const refTemporizadorExito = useRef(null);

  // 1. Exámenes del selector (el de hoy / en curso primero). Una sola vez.
  useEffect(() => {
    const ctrl = new AbortController();
    obtenerExamenesMonitoreo({ signal: ctrl.signal })
      .then((lista) => {

        const arr = Array.isArray(lista) ? lista : [];
        setExamenes(arr);
        const enCurso = arr.find((e) => e.enCurso) || arr[0];
        setIdExamen(enCurso?.idExamen ?? null);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        if (err?.status === 403) setBoolSinPermiso(true);
        setStrError(err.message || "No se pudieron cargar los exámenes.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setBoolCargandoExamenes(false);
      });
    return () => ctrl.abort();
  }, []);

  // 2. Tablero. Conserva los últimos datos si una actualización falla (CA-05).
  const fnActualizar = useCallback(async () => {
    const id = refExamen.current;
    if (!id) return;
    refAbort.current?.abort();
    const ctrl = new AbortController();
    refAbort.current = ctrl;
    setBoolActualizando(true);
    try {
      const datos = normalizarTablero(await obtenerTableroMonitoreo(id, { signal: ctrl.signal }));
      if (refExamen.current !== id) return; // cambió de examen mientras cargaba
      setTablero(datos);
      setStrHoraDatos(horaConSegundos(datos.actualizado) !== "--:--:--" ? horaConSegundos(datos.actualizado) : horaLocalActual());
      setBoolSinConexion(false);
      setBoolSinPermiso(false);
      setStrError("");
      setIntSegundos(0);
    } catch (err) {
      if (err?.name === "AbortError" || refExamen.current !== id) return;
      if (err?.status === 403) {
        setBoolSinPermiso(true);
        setTablero(null);
      } else {
        setBoolSinConexion(true);
      }
      setStrError(err.message || "No se pudo actualizar el dashboard.");
    } finally {
      if (refExamen.current === id) {
        setBoolCargandoTablero(false);
        setBoolActualizando(false);
      }
    }
  }, []);

  // Al cambiar de examen: limpiar y consultar de inmediato.
  useEffect(() => {
    refExamen.current = idExamen;
    refAbort.current?.abort();
    setTablero(null);
    setStrError("");
    setBoolSinConexion(false);
    setBoolSinPermiso(false);
    setBoolCargandoTablero(Boolean(idExamen));
  }, [idExamen]);

  // 3. Polling cada 15 s, en pausa con la pestaña oculta (CA-04).
  // Con el detalle de un aula abierto, el dashboard no consulta (el detalle tiene su propio ciclo).
  usePolling(fnActualizar, INTERVALO_MS, { boolActivo: Boolean(idExamen) && !aulaDetalle, clave: idExamen });

  const examenActual = useMemo(() => examenes.find((e) => e.idExamen === idExamen), [examenes, idExamen]);

  // Incidencias, cierres de aula y curva de llegada (cada fuente falla por separado)
  const extras = useExtrasExamen(examenActual, Boolean(idExamen) && !aulaDetalle);

  // Cambiar de examen cierra el detalle
  useEffect(() => {
    setAulaDetalle(null);
  }, [idExamen]);

  // "Actualizado hace X s"
  useEffect(() => {
    const reloj = setInterval(() => setIntSegundos((s) => s + 1), 1000);
    return () => clearInterval(reloj);
  }, []);

  useEffect(
    () => () => {
      refAbort.current?.abort();
      clearTimeout(refTemporizadorExito.current);
    },
    []
  );

  // 4. Reubicación Express (solo docente)
  const fnAbrirReubicacion = useCallback((alerta) => {
    setStrErrorReubicar("");
    setAlertaAReubicar(alerta);
  }, []);
  const fnCerrarReubicacion = useCallback(() => setAlertaAReubicar(null), []);

  const fnConfirmarReubicacion = async () => {
    if (!alertaAReubicar || boolReubicando || rol !== "DOCENTE") return;
    setBoolReubicando(true);
    setStrErrorReubicar("");
    try {
      const res = await reubicarYAutorizar(alertaAReubicar.idIntento);

      setAlertaAReubicar(null);
      setStrExito(res?.mensaje || `${alertaAReubicar.estudiante} fue reubicado y su ingreso quedó registrado.`);
      clearTimeout(refTemporizadorExito.current);
      refTemporizadorExito.current = setTimeout(() => setStrExito(""), 6000);
      fnActualizar();

    } catch (err) {
      // El backend no guardó nada: la asignación original se mantiene.
      setStrErrorReubicar(
        err?.status === 409
          ? `${err.message} Se actualizaron los datos del dashboard.`
          : err.message || "No se pudo completar la reubicación. Se mantiene la asignación original."
      );
      if (err?.status === 409 || err?.status === 403) fnActualizar(); // cupo agotado / ya procesado por otro
    } finally {
      setBoolReubicando(false);
    }
  };

  const boolSinExamenes = !boolCargandoExamenes && examenes.length === 0 && !strError;

  if (aulaDetalle && examenActual) {
    return (
      <DetalleAulaMonitoreo
        examen={examenActual}
        aula={aulaDetalle}
        boolCerradoInicial={Boolean(extras.cierres[aulaDetalle.idAmbiente]?.cerrado)}
        onVolver={() => setAulaDetalle(null)}
        onCambioIngreso={extras.aplicarCierre}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Barra superior: examen, estado de la actualización */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-[#003770]">Monitoreo de asistencia</h3>
          <p className="text-xs text-slate-500 font-semibold">
            {rol === "DOCENTE" ? "Tus exámenes asignados" : "Todos los exámenes"} · se actualiza solo cada 15 segundos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tablero && (
            <span
              role="status"
              className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full border ${boolSinConexion ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
            >
              {boolSinConexion ? <WifiOff className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              {boolSinConexion ? `Sin conexión, mostrando datos de las ${strHoraDatos}` : `Actualizado hace ${intSegundos} s`}
            </span>
          )}
          <select
            value={idExamen ?? ""}
            onChange={(e) => setIdExamen(Number(e.target.value))}
            disabled={examenes.length === 0}
            aria-label="Examen a monitorear"
            className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-full disabled:opacity-60"
          >
            {examenes.length === 0 && <option value="">{boolCargandoExamenes ? "Cargando..." : "Sin exámenes"}</option>}
            {examenes.map((ex) => (
              <option key={ex.idExamen} value={ex.idExamen}>
                {ex.asignatura} · {formatearFecha(ex.fechaExamen)}
                {ex.horaInicio ? ` · ${horaCorta(ex.horaInicio)}–${horaCorta(ex.horaFin)}` : ""}
                {ex.enCurso ? " · EN CURSO" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fnActualizar}
            disabled={!idExamen || boolActualizando}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 p-2 rounded-xl transition cursor-pointer disabled:opacity-45"
            title="Actualizar ahora"
            aria-label="Actualizar ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${boolActualizando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Estados: error / sin permiso / vacío / cargando / éxito */}
      {boolSinPermiso ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{strError || "No tienes permiso para monitorear este examen."} El intento quedó registrado en auditoría.</span>
        </div>
      ) : (
        strError &&
        !tablero && (
          <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 flex-wrap">
            <span>✕ {strError}</span>
            {idExamen && (
              <button type="button" onClick={fnActualizar} className="underline cursor-pointer">Reintentar</button>
            )}
          </div>
        )
      )}
      {strExito && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{strExito}</span>
        </div>
      )}
      {boolSinExamenes && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-xs font-bold">
          {rol === "DOCENTE" ? "No tienes exámenes asignados para monitorear." : "No hay exámenes registrados para monitorear."}
        </div>
      )}
      {boolCargandoExamenes && (
        <div className="text-center py-10 text-slate-400 text-xs font-semibold animate-pulse">Cargando exámenes...</div>
      )}
      {boolCargandoTablero && !tablero && !strError && (
        <div className="text-center py-10 text-slate-400 text-xs font-semibold animate-pulse">Cargando el dashboard del examen...</div>
      )}

      {tablero && (
        <>
          <TarjetasMetricas metricas={tablero.metricas} intAulas={tablero.aulas.length} intAlertasAulaCruzada={tablero.alertas.length} incidencias={extras.incidencias} />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-7 min-w-0">
              <CurvaLlegada estado={extras.llegadas.estado} datos={extras.llegadas.datos} strHoraInicio={examenActual?.horaInicio} boolEnCurso={Boolean(examenActual?.enCurso)} />
            </div>
            <div className="xl:col-span-5 min-w-0">
              <ActividadReciente incidencias={extras.incidencias} alertas={tablero.alertas} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <section className="xl:col-span-7 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3 min-w-0" aria-label="Ocupación por aula">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-black text-[#003770]">Aulas del examen</h4>
                <div className="flex gap-3 text-[10px] font-bold text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />&lt; 70 %</span>
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-500 inline-block" />70–89 %</span>
                  <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-rose-500 inline-block" />≥ 90 %</span>
                </div>
              </div>
              {tablero.aulas.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-6 text-center">El examen no tiene aulas asignadas.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tablero.aulas.map((aula) => (
                    <TarjetaAula
                      key={aula.idAmbiente}
                      aula={aula}
                      incidencias={extras.incidencias ? extras.incidencias.porAula[aula.idAmbiente] || null : undefined}
                      boolCerrada={Boolean(extras.cierres[aula.idAmbiente]?.cerrado)}
                      onAbrir={setAulaDetalle}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="xl:col-span-5 min-w-0">
              <PanelAulasCruzadas alertas={tablero.alertas} rol={rol} onReubicar={fnAbrirReubicacion} />
            </div>
          </div>

          {examenActual && (
            <p className="text-[11px] text-slate-400 font-semibold text-right">
              {examenActual.asignatura} · {formatearFecha(examenActual.fechaExamen)} · datos de las {strHoraDatos}
            </p>
          )}
        </>
      )}


      {alertaAReubicar && (
        <ModalReubicacion
          alerta={alertaAReubicar}
          boolGuardando={boolReubicando}
          strError={strErrorReubicar}
          onConfirmar={fnConfirmarReubicacion}
          onCancelar={fnCerrarReubicacion}
        />
      )}
    </div>
  );
}
