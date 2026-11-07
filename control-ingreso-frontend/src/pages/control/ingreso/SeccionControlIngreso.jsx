// Bloque completo del control de ingreso.
// Sin examen elegido → "Mis exámenes". Con examen elegido → verificación.
import "./controlIngreso.css";
import { useEffect, useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { useOperador } from "../operadorContexto";
import { db } from "../../../offline/db.js";
import ListaExamenesHoy from "./componentes/ListaExamenesHoy";
import TarjetaExamen from "./componentes/TarjetaExamen";
import EstacionVerificacion from "./componentes/EstacionVerificacion";
import TarjetaResultado from "./componentes/TarjetaResultado";
import TablaUltimosIngresos from "./componentes/TablaUltimosIngresos";
import ModalIncidencia from "../../../components/incidencias/ModalIncidencia";
import { intentoExamenPendienteRepo } from "../../../offline/intentoExamenPendienteRepo";
import { sincronizarIntentosExamen } from "../../../offline/syncIntentosExamen";
import { obtenerUsuarioActual } from "../../../services/authService";
import { rangoExamen, aperturaControl } from "../../docente/utilidadesExamenDocente";

// Franja de estado debajo del encabezado del examen.
// Con internet: solo "En línea". Sin internet: el tramo de apellidos que registra este ayudante.
function FranjaEstado({ boolSinRed, objFila }) {
  if (!boolSinRed) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#F0F6FC] border border-[#D9E8F7] text-sm font-semibold text-[#124B83]">
        <i className="w-2.5 h-2.5 rounded-full bg-[#1860A3] shrink-0 shadow-[0_0_0_4px_rgba(24,96,163,.18)] animate-pulse" />
        En línea
      </div>
    );
  }
  const numTotal = objFila?.total;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-sm text-[#B91C1C]">
      <i className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] shrink-0 mt-[5px]" />
      <span>
        <b className="font-bold">Sin conexión</b>
        {objFila?.desde && objFila?.hasta ? (
          <> · Registras los apellidos <b className="font-bold">{objFila.desde} – {objFila.hasta}</b>{numTotal ? ` (${numTotal} estudiantes)` : ""}.</>
        ) : (
          <> · Registras a los estudiantes de esta aula.</>
        )}
        {" "}Se sincroniza al volver el internet.
      </span>
    </div>
  );
}

// nodoAcciones: botones dentro del encabezado azul (por ejemplo "Lista oficial del aula")
// listAvisos: chips extra en el encabezado (por ejemplo "Registro desde las 19:15")
// objFilaSinRed: tramo de apellidos guardado en el equipo (por ejemplo, el docente que también controla el ingreso)
export default function SeccionControlIngreso({ ctrl, strRol = "operador", boolPermitirVolver = true, nodoAcciones = null, listAvisos = [], objFilaSinRed = null }) {
  const { fnMostrarToast, fnDoForzar, setConfigurandoPin, estadoRed } = useOperador();

  // Hora actual (cada 30 s): el registro solo se permite desde 15 min antes del inicio hasta el fin,
  // con o sin internet, para el ayudante, el docente y el administrador
  const [dateAhora, setDateAhora] = useState(() => new Date());
  const [mostrarIncidenciaHU09, setMostrarIncidenciaHU09] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const {
    listExamenes, boolCargandoExamenes, sinRespaldoOffline, examenActual, idExamen, objContador, listUltimos, objResultado, objNomina,
    boolValidando, strError, strUltimoRegistrado, fnValidar, fnCerrarResultado, fnElegirExamen, fnVolverALista, fnDescargarNomina,
  } = ctrl;

  const fnResetearNomina = async () => {
    const exId = Number(examenActual?.idexamen);
    if (!Number.isInteger(exId) || exId <= 0) {
      fnMostrarToast("No hay un examen válido seleccionado.");
      return;
    }
    if (!window.confirm("¿Resetear la nómina local y las marcas pendientes de este examen? Se borrarán los registros offline no sincronizados.")) return;
    try {
      await db.transaction('rw', db.nominas, db.asistencias_pendientes, async () => {
        await db.nominas.where('examenId').equals(exId).delete();
        await db.asistencias_pendientes.where('examenId').equals(exId).delete();
      });
      fnMostrarToast("Nómina local y marcas pendientes eliminadas. Puedes volver a descargar.");
    } catch (err) {
      fnMostrarToast("Error al resetear: " + (err?.message || ""));
    }
  };

  if (idExamen == null) {
    return (
      <div className="text-[#08264A]">
        {strError && (
          <div role="alert" className="mb-3 px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strError}</div>
        )}
        <ListaExamenesHoy
          listExamenes={listExamenes}
          boolCargando={boolCargandoExamenes}
          sinRespaldoOffline={sinRespaldoOffline}
          onElegir={fnElegirExamen}
          boolSinRed={ctrl.boolOffline}
        />
      </div>
    );
  }

  const objRangoHorario = { fechaExamen: examenActual?.fecha, horaInicio: examenActual?.horaInicio, horaFin: examenActual?.horaFin };
  const { fin: dateFin } = rangoExamen(objRangoHorario);
  const dateApertura = aperturaControl(objRangoHorario);
  const boolFinalizado = examenActual?.estado === "FINALIZADO" || (Boolean(dateFin) && dateAhora > dateFin);
  const boolAunNoAbre = !boolFinalizado && Boolean(dateApertura) && dateAhora < dateApertura;
  const strHoraApertura = dateApertura
    ? `${String(dateApertura.getHours()).padStart(2, "0")}:${String(dateApertura.getMinutes()).padStart(2, "0")}`
    : "";
  const boolOperador = strRol === "operador";
  // El tramo de apellidos solo aplica al ayudante y solo sin internet (motor offline).
  // El docente puede registrar a cualquiera de su aula.
  const fnValidarRol = boolOperador
    ? fnValidar
    : (strValor, strMetodo, objOpciones = {}) => fnValidar(strValor, strMetodo, { ...objOpciones, ignorarFila: true });

  return (
    <div className="flex flex-col gap-7 max-md:gap-[22px] text-[#08264A]">
      <div className="flex flex-col gap-2.5">
        {boolPermitirVolver && (
          <button
            type="button"
            onClick={fnVolverALista}
            className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1860A3] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        )}
        <TarjetaExamen
          examen={examenActual}
          objContador={objContador}
          listAvisos={listAvisos}
          strEstadoVivo={boolFinalizado ? "finalizado" : (estadoRed?.net === "offline" || ctrl.boolOffline) ? null : "vivo"}
        >
          {nodoAcciones}
        </TarjetaExamen>
        <FranjaEstado
          boolSinRed={estadoRed?.net === "offline" || Boolean(ctrl.boolOffline)}
          objFila={objContador?.fila || examenActual?.fila || objFilaSinRed || null}
        />
      </div>

      {objNomina && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-[#F0F6FC] border border-[#D9E8F7] text-xs font-bold">
          <span className="mr-2">Nómina local:</span>
          {objNomina.descargando ? (
            <>
              <span>Descargando…</span>
              <span className="text-[#003770]">{objNomina.porcentaje ?? 0}%</span>
            </>
          ) : objNomina.estado === "lista" ? (
            <>
              <span>Descargada</span>
              {objNomina.descargadaEn ? (
                <span className="text-[#166534]">({objNomina.total ?? 0} estudiantes · {new Date(objNomina.descargadaEn).toLocaleString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              ) : (
                <span className="text-[#166534]">({objNomina.total ?? 0} estudiantes)</span>
              )}
              <button
                type="button"
                onClick={fnResetearNomina}
                className="ml-3 px-3 py-1 rounded-xl text-[11px] font-bold bg-[#B91C1C] text-white hover:bg-[#991B1B] transition-colors cursor-pointer"
              >
                Resetear nómina local
              </button>
              <button
                type="button"
                onClick={() => {
                  fnDoForzar();
                }}
                className="ml-2 px-3 py-1 rounded-xl text-[11px] font-bold bg-[#08264A] text-white hover:bg-[#0a3d62] transition-colors cursor-pointer"
              >
                Forzar sincronización
              </button>
              <button
                type="button"
                onClick={() => setConfigurandoPin(true)}
                className="ml-2 px-3 py-1 rounded-xl text-[11px] font-bold bg-[#08264A] text-white hover:bg-[#0a3d62] transition-colors cursor-pointer"
              >
                Configurar PIN
              </button>
            </>
          ) : (
            <>
              <span>Sin descargar</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fnDescargarNomina();
                  } catch (err) {
                    fnMostrarToast("Error al descargar la nómina: " + (err?.message || "intenta nuevamente con conexión a internet."));
                  }
                }}
                className="px-3 py-1 rounded-xl text-[11px] font-bold bg-[#003770] text-white hover:bg-[#124B83] transition-colors cursor-pointer"
              >
                Descargar nómina
              </button>
              <button
                type="button"
                onClick={() => {
                  fnDoForzar();
                }}
                className="px-3 py-1 rounded-xl text-[11px] font-bold bg-[#08264A] text-white hover:bg-[#0a3d62] transition-colors cursor-pointer ml-2"
              >
                Forzar sincronización
              </button>
              <button
                type="button"
                onClick={() => setConfigurandoPin(true)}
                className="ml-2 px-3 py-1 rounded-xl text-[11px] font-bold bg-[#08264A] text-white hover:bg-[#0a3d62] transition-colors cursor-pointer"
              >
                Configurar PIN
              </button>
            </>
          )}
        </div>
      )}

      <section aria-labelledby="ci-t-verificacion">
        {/* El título "Verificación de ingreso" está dentro de la tarjeta de verificación */}
        {boolFinalizado ? (
          <>
            <h2 id="ci-t-verificacion" className="m-0 mb-3 text-lg font-bold text-[#08264A]">Verificación de ingreso</h2>
            <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-sm text-[#475569]">
              <Info className="w-[18px] h-[18px] shrink-0 mt-px" />
              Este examen ya finalizó. Ya no se pueden registrar ingresos, pero puedes revisar los registrados.
            </div>
          </>
        ) : boolAunNoAbre ? (
          <>
            <h2 id="ci-t-verificacion" className="m-0 mb-3 text-lg font-bold text-[#08264A]">Verificación de ingreso</h2>
            <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-sm text-[#475569]">
              <Info className="w-[18px] h-[18px] shrink-0 mt-px" />
              El registro de ingreso se habilita a las {strHoraApertura} (15 minutos antes del inicio del examen).
            </div>
          </>
        ) : (
          <>
            <EstacionVerificacion onValidar={fnValidarRol} boolValidando={boolValidando} idExamen={idExamen} />
            {strError && (
              <div role="alert" className="mt-3 px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strError}</div>
            )}
            <TarjetaResultado objResultado={objResultado} onCerrar={fnCerrarResultado} strRol={strRol}
              onRegistrarIncidencia={() => setMostrarIncidenciaHU09(true)} />
          </>
        )}
      </section>

      <TablaUltimosIngresos
        listUltimos={listUltimos}
        strUltimoRegistrado={strUltimoRegistrado}
        strRol={strRol}
        numRegistrados={objContador?.ingresaron ?? null}
        boolSinRed={estadoRed?.net === "offline" || Boolean(ctrl.boolOffline)}
      />
      {(ctrl.objIntentosPendientes?.pendientes > 0 || ctrl.objIntentosPendientes?.revision > 0) && (
        <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ctrl.objIntentosPendientes.pendientes > 0 && <p>{ctrl.objIntentosPendientes.pendientes} intento(s) de examen incorrecto pendientes de sincronización.</p>}
          {ctrl.objIntentosPendientes.revision > 0 && <p>{ctrl.objIntentosPendientes.revision} intento(s) requieren revisión; no se confirmó su registro en auditoría. Contacta al administrador.</p>}
          {ctrl.objIntentosPendientes.revisiones?.map((item) => (
            <div key={item.clientUuid} className="mt-2 flex flex-wrap items-center gap-3">
              <span>SIS {item.estudianteSis} · {new Date(item.fechaCreacion).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}</span>
              <button type="button" className="rounded border border-amber-700 px-2 py-1 font-semibold"
                onClick={async () => {
                  try {
                    await intentoExamenPendienteRepo.reintentarRevision(item.clientUuid, obtenerUsuarioActual()?.idUsuario);
                    await sincronizarIntentosExamen();
                  } catch { fnMostrarToast("No se pudo reintentar; el intento permanece guardado en el dispositivo."); }
                }}>Reintentar sincronización</button>
            </div>
          ))}
        </div>
      )}
      <ModalIncidencia boolAbierto={mostrarIncidenciaHU09} onCerrar={() => setMostrarIncidenciaHU09(false)}
        aulasDisponibles={examenActual?.idambiente ? [{
          idAmbiente: examenActual.idambiente, idAsignatura: examenActual.idasignatura,
          idExamen: examenActual.idexamen, aula: examenActual.aula,
          asignatura: examenActual.materia, fechaExamen: examenActual.fecha,
        }] : []}
        aulaPreseleccionada={examenActual?.idambiente ? {
          idAmbiente: examenActual.idambiente, idAsignatura: examenActual.idasignatura,
          idExamen: examenActual.idexamen, aula: examenActual.aula,
          asignatura: examenActual.materia, fechaExamen: examenActual.fecha,
        } : null}
        estudianteInicial={objResultado?.estudiante ? {
          nombreCompleto: [objResultado.estudiante.nombres, objResultado.estudiante.apellidos].filter(Boolean).join(" "),
          ci: objResultado.estudiante.ci, codSis: objResultado.estudiante.sis, estado: "DESCONOCIDO",
        } : null}
      />
    </div>
  );
}
