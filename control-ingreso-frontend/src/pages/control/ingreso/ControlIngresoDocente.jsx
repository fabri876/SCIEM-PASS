// Página del DOCENTE (y del ADMINISTRADOR): mismo control de ingreso + lista oficial del aula (solo lectura)
// Sin internet: si el docente se asignó un tramo de apellidos, ve su tramo en la franja y "Mi lista";
// si no, la lista muestra toda el aula con la nómina descargada (antes no cargaba sin internet).
// Sin internet, "Últimos ingresos" muestra los registros guardados en este equipo (igual que el ayudante).
// Rutas: /home/docente/examenes/:idExamen/control-ingreso  (docente)
//        /admin/examenes/:idExamen/control-ingreso         (administrador)
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ListChecks } from "lucide-react";
import Header from "../../../components/layout/Header";
import { useOperador } from "../operadorContexto";
import useControlIngreso from "./useControlIngreso";
import SeccionControlIngreso from "./SeccionControlIngreso";
import EncabezadoControl from "./componentes/EncabezadoControl";
import PanelListaOficial from "./componentes/PanelListaOficial";
import PanelMiLista from "./componentes/PanelMiLista";
import useRangoLocal from "./useRangoLocal";
import useUltimosLocales from "./useUltimosLocales";
import ToastSyncConfirmacion from "../components/ToastSyncConfirmacion";
import { MINUTOS_ANTES_CONTROL_INGRESO, rangoExamen } from "../../docente/utilidadesExamenDocente";
import ModalIncidencia from "../../../components/incidencias/ModalIncidencia";
import ModalIngresoExcepcional from "../../../components/incidencias/ModalIngresoExcepcional";
import { obtenerAulasAsignadas } from "../../../services/incidenciaService";

export default function ControlIngresoDocente() {
  const { idExamen } = useParams();
  const navigate = useNavigate();
  const objUbicacion = useLocation();
  // El administrador entra desde "Gestión de Exámenes" y ve el examen de cualquier docente
  const boolAdmin = objUbicacion.pathname.startsWith("/admin");
  const strNombreDocente = objUbicacion.state?.nombreDocente || "";
  // Sección del panel desde la que se entró (para que "Volver" regrese ahí)
  const strMenuOrigen = objUbicacion.state?.menuOrigen || "inicio";
  const TEXTO_VOLVER = { inicio: "Inicio", "mis-examenes": "Mis exámenes", "control-ingresos": "Control de Ingresos" };
  const strTextoVolver = boolAdmin ? "Gestión de Exámenes" : (TEXTO_VOLVER[strMenuOrigen] || "Inicio");
  const fnVolver = () => {
    if (boolAdmin) navigate("/admin", { state: { menu: "Gestión de Exámenes" } });
    else navigate("/home/docente", { state: { menu: strMenuOrigen } });
  };
  const objExamenNavegado = objUbicacion.state?.examen || null;
  const objAmbiente = objExamenNavegado?.ambientes?.[0] || null;
  const idAmbiente = objExamenNavegado?.idambiente ?? objAmbiente?.idAmbiente ?? objAmbiente?.idambiente;
  const idAsignatura = objExamenNavegado?.idAsignatura ?? objExamenNavegado?.idasignatura;
  const idControl = idAsignatura && idAmbiente ? `${idAsignatura}-${idExamen}-${idAmbiente}` : (idExamen ? Number(idExamen) : null);
  const objExamenInicial = objExamenNavegado && idControl ? { id: idControl, idasignatura: idAsignatura, idexamen: Number(idExamen), idambiente: idAmbiente, materia: objExamenNavegado.nombreExamen || objExamenNavegado.nombreAsignatura, tipo: objExamenNavegado.tipoExamen || objExamenNavegado.nombreTipoExamen || "Examen", aula: objExamenNavegado.aulaNombre || objExamenNavegado.aula || objAmbiente?.nombreAmbiente || objAmbiente?.nombreAula, edificio: objExamenNavegado.bloque || objAmbiente?.ubicacionAmbiente || objAmbiente?.bloque, fecha: objExamenNavegado.fechaExamen, horaInicio: objExamenNavegado.horaInicio || objAmbiente?.horaInicio, horaFin: objExamenNavegado.horaFin || objAmbiente?.horaFin, contador: { ingresaron: objExamenNavegado.ingresados || 0, pendientes: objExamenNavegado.noLlegan || 0, inhabilitados: objExamenNavegado.inhabilitados || 0, habilitados: objExamenNavegado.totalInscritos || 0 } } : null;
  const ctrl = useControlIngreso(idControl, { examenInicial: objExamenInicial });
  const { estadoRed, fnCambiarRed } = useOperador();
  const [boolListaAbierta, setBoolListaAbierta] = useState(false);
  const [mostrarModalIncidencia, setMostrarModalIncidencia] = useState(false);
  const [aulasIncidencia, setAulasIncidencia] = useState([]);
  const [excepcionFacial, setExcepcionFacial] = useState(null);

  const fnCerrarLista = useCallback(() => setBoolListaAbierta(false), []);

  const examen = ctrl.examenActual;
  const boolEnLinea = estadoRed.net !== "offline";
  const boolSinRed = !boolEnLinea || Boolean(ctrl.boolOffline);
  const idExamenLocal = examen?.idexamen ?? Number(idExamen);
  // Tramo del docente guardado en el equipo (solo se usa sin internet)
  const objRangoDocente = useRangoLocal(idExamenLocal, examen?.idambiente ?? idAmbiente, boolSinRed);
  // Historial sin internet: registros guardados en este equipo
  const listUltimosLocales = useUltimosLocales(idExamenLocal, boolSinRed, ctrl.numVersion, estadoRed.pend);

  // El registro se habilita desde MINUTOS_ANTES_CONTROL_INGRESO antes del inicio.
  // Antes de eso se ve la pantalla, pero no se puede registrar.
  const { inicio, fin: dateFinExamen } = rangoExamen(examen ? { fechaExamen: examen.fecha, horaInicio: examen.horaInicio, horaFin: examen.horaFin } : null);
  const dateApertura = inicio ? new Date(inicio.getTime() - MINUTOS_ANTES_CONTROL_INGRESO * 60000) : null;
  const [dateAhora, setDateAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const boolAunNoEmpieza = Boolean(dateApertura) && dateAhora < dateApertura;
  const strHoraApertura = dateApertura
    ? `${String(dateApertura.getHours()).padStart(2, "0")}:${String(dateApertura.getMinutes()).padStart(2, "0")}`
    : "";
  const boolExamenActivo = Boolean(examen) && !boolAunNoEmpieza && !(dateFinExamen && dateAhora > dateFinExamen);

  // Dentro del control de ingreso la incidencia pertenece sí o sí a este
  // examen/aula: no se ofrece elegir entre otros exámenes asignados.
  const idAmbienteIncidencia = examen?.idambiente ?? idAmbiente;
  const aulaIncidenciaActual = idAmbienteIncidencia
    ? {
      idAmbiente: Number(idAmbienteIncidencia),
      idAsignatura: examen?.idasignatura ?? idAsignatura,
      idExamen: Number(examen?.idexamen ?? idExamen),
      aula: examen?.aula || objExamenInicial?.aula || "Aula asignada",
      asignatura: examen?.materia || objExamenInicial?.materia || "Examen",
      fechaExamen: examen?.fecha || objExamenInicial?.fecha || null,
      horaInicio: examen?.horaInicio || objExamenInicial?.horaInicio || null,
      horaFin: examen?.horaFin || objExamenInicial?.horaFin || null,
    }
    : null;

  return (
    // Mismo layout que HomeControl: header fijo arriba y contenido con pt-[115px]
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-nunito pb-16">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <Header />
      </div>
      <main className="max-w-[1200px] w-full mx-auto pt-[115px] px-4 sm:px-6 space-y-6">

        {/* Segmented control Online/Offline (idéntico a operador) */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs">
            <button
              type="button"
              onClick={() => fnCambiarRed("online")}
              aria-pressed={boolEnLinea}
              className={
                "px-4 h-9 rounded-xl text-xs font-extrabold transition-colors cursor-pointer " +
                (boolEnLinea ? "bg-[#003770] text-white shadow-xs" : "text-[#64748B] hover:bg-[#F1F5F9]")
              }
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => fnCambiarRed("offline")}
              aria-pressed={!boolEnLinea}
              className={
                "px-4 h-9 rounded-xl text-xs font-extrabold transition-colors cursor-pointer " +
                (!boolEnLinea ? "bg-[#B91C1C] text-white shadow-xs" : "text-[#64748B] hover:bg-[#F1F5F9]")
              }
            >
              Offline
            </button>
          </div>
          <p className="text-xs font-bold text-[#64748B]">
            Estado actual:{" "}
            <span className={boolEnLinea ? "text-[#1860A3]" : "text-[#B91C1C]"}>
              {boolEnLinea ? "Con red" : "Sin red"}
            </span>
          </p>
        </div>

        {/* Volver + avisos de conexión (offline, almacenamiento, sincronización) */}
        <EncabezadoControl
          onVolver={fnVolver}
          strTextoVolver={strTextoVolver}
          net={estadoRed.net}
          pend={estadoRed.pend}
          enviados={estadoRed.enviados}
          spacePrc={estadoRed.spacePrc}
        />

        <div>
          <SeccionControlIngreso
            ctrl={boolSinRed ? { ...ctrl, listUltimos: listUltimosLocales } : ctrl}
            strRol="docente"
            boolPermitirVolver={false}
            objFilaSinRed={boolSinRed ? objRangoDocente : null}
            onExcepcional={(detalle) => setExcepcionFacial(detalle)}
            listAvisos={[
              boolAdmin && strNombreDocente ? `Docente: ${strNombreDocente}` : null,
              boolAunNoEmpieza ? `Registro desde las ${strHoraApertura}` : null,
            ]}
            nodoAcciones={
              <div className="flex items-center gap-2 max-md:w-full max-md:flex-col">
                <button
                  type="button"
                  onClick={() => setBoolListaAbierta(true)}
                  className="min-h-10 px-4 rounded-lg bg-white text-[#003770] text-[14px] font-bold inline-flex items-center justify-center gap-2 hover:bg-[#F0F6FC] cursor-pointer max-md:w-full"
                >
                  <ListChecks className="w-4 h-4" /> {boolSinRed && objRangoDocente ? "Mi lista" : "Lista oficial del aula"}
                </button>
                {boolExamenActivo && (
                  <button
                    type="button"
                    onClick={() => setMostrarModalIncidencia(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition max-md:w-full justify-center"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Registrar incidencia
                  </button>
                )}
              </div>
            }
          />
        </div>
      </main>

      {ctrl.boolCargandoExamenes && (
        <div className="max-w-[1200px] mx-auto px-4 py-8 text-center text-slate-500">
          Cargando examen…
        </div>
      )}
      {ctrl.strError && (
        <div className="max-w-[1200px] mx-auto px-4 py-4 bg-[#FEF2F2] text-[#B91C1C] rounded-xl">
          Error: {ctrl.strError}
        </div>
      )}

      {boolSinRed ? (
        <PanelMiLista
          boolAbierto={boolListaAbierta}
          onCerrar={fnCerrarLista}
          examen={{ ...(examen || {}), idexamen: idExamenLocal, idambiente: examen?.idambiente ?? idAmbiente, fila: objRangoDocente }}
          boolSinRed
          numVersion={ctrl.numVersion}
          numPendientes={estadoRed.pend}
          strUltimoRegistrado={ctrl.strUltimoRegistrado}
          strNominaDescargadaEn={ctrl.objNomina?.descargadaEn}
          strTituloLista="Lista oficial del aula"
        />
      ) : (
        <PanelListaOficial
          boolAbierto={boolListaAbierta}
          onCerrar={fnCerrarLista}
          idExamen={Number(idExamen)}
          numVersion={ctrl.numVersion}
          strUltimoRegistrado={ctrl.strUltimoRegistrado}
          boolFinalizado={Boolean(dateFinExamen) && new Date() > dateFinExamen}
        />
      )}
      <ToastSyncConfirmacion />
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
        observacionSugerida={excepcionFacial?.motivo === "FALLO_FACIAL" ? "Se agotaron tres intentos de verificación facial." : "El estudiante no cuenta con enrolamiento facial activo."}
        onExito={(respuesta) => ctrl.fnFinalizarExcepcional(respuesta)}
      />
      <ModalIncidencia
        boolAbierto={mostrarModalIncidencia}
        onCerrar={() => setMostrarModalIncidencia(false)}
        aulasDisponibles={aulaIncidenciaActual ? [aulaIncidenciaActual] : []}
        aulaPreseleccionada={aulaIncidenciaActual}
        boolAulaFija
        boolExamenActivo={boolExamenActivo}
      />
    </div>
  );
}
