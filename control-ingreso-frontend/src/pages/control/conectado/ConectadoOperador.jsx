import { textoInterfaz } from '../../../utils/textoInterfaz.js';
// Inicio del ayudante.
// Sin examen elegido: banner (igual al de los otros paneles), "Mis exámenes de hoy" (con el conmutador
// Online/Offline de Yuri en su encabezado), calendario y próximo examen.
// Con examen elegido: pantalla de registro de ingreso (verificación, resultado y últimos ingresos)
// y el botón de lista: con internet "Lista oficial del examen" (todo el examen, igual que el docente);
// sin internet "Mi lista" (solo su aula y su rango).
// En la pantalla de registro se oculta el menú lateral y, sin internet, "Mis últimos ingresos"
// muestra los registros guardados en este equipo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { obtenerUsuarioActual } from "../../../services/authService";
import { useOperador } from "../operadorContexto";
import useControlIngreso from "../ingreso/useControlIngreso";
import useUltimosLocales from "../ingreso/useUltimosLocales";
import { useLayoutAyudante } from "../layoutAyudanteContexto";
import SeccionControlIngreso from "../ingreso/SeccionControlIngreso";
import EncabezadoControl from "../ingreso/componentes/EncabezadoControl";
import PanelMiLista from "../ingreso/componentes/PanelMiLista";
import PanelListaOficial from "../ingreso/componentes/PanelListaOficial";
import TarjetaHoyAyudante from "../inicio/TarjetaHoyAyudante";
import CalendarioExamenes from "../../credencial/componentes/CalendarioExamenes";
import ProximoExamenDocente from "../../docente/components/ProximoExamenDocente";
import { estadoAyudante, esHoyAyudante, ordenarExamenes, textoAula } from "../utilidadesAyudante";
import ModalIngresoExcepcional from "../../../components/incidencias/ModalIngresoExcepcional";

function fechaDeHoy() {
  const str = new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function ConectadoOperador() {
  const objUbicacion = useLocation();
  const navigate = useNavigate();
  // "Registrar ingreso" desde "Mis exámenes" llega con el examen ya elegido
  const ctrl = useControlIngreso(objUbicacion.state?.idExamen ?? null);
  const { estadoRed } = useOperador();
  const strNombre = (obtenerUsuarioActual()?.nombre || "").split(" ")[0];
  const [boolMiListaAbierta, setBoolMiListaAbierta] = useState(false);
  const [excepcionFacial, setExcepcionFacial] = useState(null);
  const fnCerrarMiLista = useCallback(() => setBoolMiListaAbierta(false), []);
  const boolSinRed = estadoRed.net === "offline" || Boolean(ctrl.boolOffline);
  const listUltimosLocales = useUltimosLocales(ctrl.examenActual?.idexamen, ctrl.idExamen != null && boolSinRed, ctrl.numVersion, estadoRed.pend);

  // Pantalla de registro: sin menú lateral (pantalla completa)
  const { setBoolPantallaCompleta } = useLayoutAyudante();
  const boolEnRegistro = ctrl.idExamen != null;
  useEffect(() => {
    setBoolPantallaCompleta(boolEnRegistro);
    return () => setBoolPantallaCompleta(false);
  }, [boolEnRegistro, setBoolPantallaCompleta]);

  // Hora actual: cada 30 s, para que el botón "Registrar ingreso" aparezca solo a la hora indicada
  const [dateAhora, setDateAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const listOrdenados = useMemo(() => ordenarExamenes(ctrl.listExamenes, dateAhora), [ctrl.listExamenes, dateAhora]);
  // Inicio: solo los exámenes de HOY en curso o por empezar
  const listHoy = listOrdenados.filter(({ e, strEstado }) => strEstado !== "FINALIZADO" && esHoyAyudante(e, dateAhora)).map(({ e }) => e);
  const objProximo = listOrdenados.find(({ e, strEstado }) => strEstado === "PROXIMO" && !esHoyAyudante(e, dateAhora))?.e || null;
  const listCalendario = (ctrl.listExamenes || [])
    .filter((e) => e.fecha)
    .map((e) => ({
      id: e.id,
      fecha: String(e.fecha).slice(0, 10),
      materia: e.materia,
      horaInicio: e.horaInicio,
      horaFin: e.horaFin,
      // El calendario ya antepone "Aula"
      aula: String(e.aula || "").replace(/^aula\s*/i, "").trim(),
    }));

  const fnIrAMisExamenes = () => navigate("/control/examenes");

  // ---- Pantalla de registro de un examen ----
  if (ctrl.idExamen != null) {
    return (
      <div className="space-y-5">
        <EncabezadoControl
          net={estadoRed.net}
          pend={estadoRed.pend}
          enviados={estadoRed.enviados}
          spacePrc={estadoRed.spacePrc}
        />
        <SeccionControlIngreso
          ctrl={boolSinRed ? { ...ctrl, listUltimos: listUltimosLocales } : ctrl}
          strRol="operador"
          onExcepcional={(detalle) => setExcepcionFacial(detalle)}
          nodoAcciones={
            <button
              type="button"
              onClick={() => setBoolMiListaAbierta(true)}
              className="min-h-10 px-4 rounded-lg bg-white text-[#003770] text-[14px] font-bold inline-flex items-center justify-center gap-2 hover:bg-[#F0F6FC] cursor-pointer max-md:w-full"
            >
              <ListChecks className="w-4 h-4" /> {boolSinRed ? "Mi lista" : "Lista oficial del examen"}
            </button>
          }
        />
        {boolSinRed ? (
          <PanelMiLista
            boolAbierto={boolMiListaAbierta}
            onCerrar={fnCerrarMiLista}
            examen={ctrl.examenActual}
            boolSinRed={boolSinRed}
            numVersion={ctrl.numVersion}
            numPendientes={estadoRed.pend}
            strUltimoRegistrado={ctrl.strUltimoRegistrado}
            strNominaDescargadaEn={ctrl.objNomina?.descargadaEn}
          />
        ) : (
          <PanelListaOficial
            boolAbierto={boolMiListaAbierta}
            onCerrar={fnCerrarMiLista}
            idExamen={ctrl.examenActual?.idexamen ?? null}
            numVersion={ctrl.numVersion}
            strUltimoRegistrado={ctrl.strUltimoRegistrado}
          />
        )}
        <ModalIngresoExcepcional
          boolAbierto={Boolean(excepcionFacial)}
          onCerrar={() => {
            setExcepcionFacial(null);
            ctrl.fnLimpiarIdentificacion();
          }}
          aulasDisponibles={ctrl.examenActual?.idambiente ? [{
            idAmbiente: ctrl.examenActual.idambiente,
            idAsignatura: ctrl.examenActual.idasignatura,
            idExamen: ctrl.examenActual.idexamen,
            aula: ctrl.examenActual.aula || "Aula asignada"
          }] : []}
          idAmbienteBloqueado={excepcionFacial?.idAmbiente}
          estudiantePreseleccionado={excepcionFacial?.estudiante}
          motivoPreseleccionado={excepcionFacial?.motivo}
          // El operador solo autoriza motivos faciales.
          boolSoloFacial
          observacionSugerida={excepcionFacial?.motivo === "FALLO_FACIAL" ? "Se agotaron tres intentos de verificación facial." : "El estudiante no cuenta con enrolamiento facial activo."}
          onExito={(respuesta) => ctrl.fnFinalizarExcepcional(respuesta)}
        />
      </div>
    );
  }

  // ---- Inicio ----
  return (
    <div className="space-y-6">
      {/* Banner de bienvenida: igual al de los paneles de docente y estudiante */}
      <div
        className="w-full text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[130px]"
        style={{ backgroundImage: "linear-gradient(to right, #1A365D, #2563EB, #DC2626)" }}
      >
        <span className="text-xs font-bold tracking-wider opacity-90 mb-1">
          ¡Hola{textoInterfaz(strNombre ? `, ${strNombre}` : "")}!
        </span>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Te damos la bienvenida a SCIEM-PASS</h1>
        <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
          Aquí registras el ingreso de los estudiantes a los exámenes que tienes asignados.
        </p>
      </div>

      {/* Avisos de conexión de Yuri (sin red, almacenamiento, sincronización) */}
      <EncabezadoControl
        net={estadoRed.net}
        pend={estadoRed.pend}
        enviados={estadoRed.enviados}
        spacePrc={estadoRed.spacePrc}
      />

      {ctrl.strError && (
        <div role="alert" className="px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{textoInterfaz(ctrl.strError)}</div>
      )}

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* MIS EXÁMENES DE HOY */}
        <div className="w-full xl:flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden">
            {/* Encabezado: título a la izquierda y el conmutador Online/Offline de Yuri a la derecha */}
            <div className="px-5 pt-4 pb-3 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-black text-[#08264A]">Mis exámenes de hoy</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">{fechaDeHoy()}</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {ctrl.boolCargandoExamenes && listHoy.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-semibold animate-pulse">Cargando exámenes…</div>
              ) : listHoy.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-semibold">No tienes exámenes hoy.</div>
              ) : (
                listHoy.map((examen) => (
                  <TarjetaHoyAyudante
                    key={examen.id}
                    examen={examen}
                    dateAhora={dateAhora}
                    onElegir={ctrl.fnElegirExamen}
                    boolSinRed={ctrl.boolOffline}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="w-full xl:w-64 shrink-0 space-y-6">
          <CalendarioExamenes listExamenes={listCalendario} onVerQr={fnIrAMisExamenes} />
          <ProximoExamenDocente
            examen={objProximo ? {
              idExamen: objProximo.id,
              nombreExamen: objProximo.materia,
              fechaExamen: objProximo.fecha,
              horaInicio: objProximo.horaInicio,
              horaFin: objProximo.horaFin,
              horario: [objProximo.horaInicio, objProximo.horaFin].filter(Boolean).join(" – "),
              aulaNombre: textoAula(objProximo.aula).replace(/^Aula\s*/, ""),
              estado: estadoAyudante(objProximo, dateAhora),
            } : null}
            onVerDetalle={fnIrAMisExamenes}
          />
        </div>
      </div>
    </div>
  );
}