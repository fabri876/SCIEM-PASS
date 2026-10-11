// Página del DOCENTE: mismo control de ingreso + lista oficial del aula
// Ruta: /home/docente/examenes/:idExamen/control-ingreso  (mismo estilo que .../habilitaciones)
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, ListChecks } from "lucide-react";
import Header from "../../../components/layout/Header";
import { useOperador } from "../operadorContexto";
import useControlIngreso from "./useControlIngreso";
import SeccionControlIngreso from "./SeccionControlIngreso";
import EncabezadoControl from "./componentes/EncabezadoControl";
import PanelListaOficial from "./componentes/PanelListaOficial";
import { MINUTOS_ANTES_CONTROL_INGRESO, rangoExamen } from "../../docente/utilidadesExamenDocente";

export default function ControlIngresoDocente() {
  const { idExamen } = useParams();
  const navigate = useNavigate();
  const ctrl = useControlIngreso(idExamen ? Number(idExamen) : null);
  const { estadoRed, fnCambiarRed } = useOperador();
  const [boolListaAbierta, setBoolListaAbierta] = useState(false);

  const fnCerrarLista = useCallback(() => setBoolListaAbierta(false), []);
  const fnRegistrarDesdeLista = useCallback((strCi) => ctrl.fnValidar(strCi, "LISTA"), [ctrl]);

  const examen = ctrl.examenActual;
  const boolEnLinea = estadoRed.net !== "offline";

  // El registro se habilita desde MINUTOS_ANTES_CONTROL_INGRESO antes del inicio.
  // Antes de eso se ve la pantalla, pero no se puede registrar.
  const { inicio } = rangoExamen(examen ? { fechaExamen: examen.fecha, horaInicio: examen.horaInicio, horaFin: examen.horaFin } : null);
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
  const refBloque = useRef(null);
  useEffect(() => {
    // "inert" desactiva el clic y el teclado dentro del bloque
    if (refBloque.current) refBloque.current.toggleAttribute("inert", boolAunNoEmpieza);
  }, [boolAunNoEmpieza, examen]);

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

        <EncabezadoControl
          strTitulo="Control de ingreso"
          strDetalle={examen ? `${examen.tipo} · ${examen.materia}` : "Control de ingreso"}
          boolMostrarRed
          onVolver={() => navigate("/home/docente")}
          net={estadoRed.net}
          pend={estadoRed.pend}
        >
          <button
            type="button"
            onClick={() => setBoolListaAbierta(true)}
            className="min-h-10 px-4 rounded-lg border border-[#CBD5E1] bg-white text-[#003770] text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:border-[#003770] cursor-pointer max-md:w-full"
          >
            <ListChecks className="w-4 h-4" /> Lista oficial del aula
          </button>
        </EncabezadoControl>

        {boolAunNoEmpieza && (
          <div role="status" className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[15px] text-slate-700">
            <Clock className="w-5 h-5 text-[#003770] shrink-0" />
            <span>
              <b className="text-[#003770]">El examen aún no ha empezado.</b> El registro de ingresos se habilita desde las {strHoraApertura}.
            </span>
          </div>
        )}

        <div ref={refBloque} aria-disabled={boolAunNoEmpieza} className={boolAunNoEmpieza ? "opacity-50 select-none" : ""}>
          <SeccionControlIngreso ctrl={ctrl} strRol="docente" boolPermitirVolver={false} />
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

      <PanelListaOficial
        boolAbierto={boolListaAbierta}
        onCerrar={fnCerrarLista}
        idExamen={ctrl.idExamen}
        numVersion={ctrl.numVersion}
        onRegistrar={fnRegistrarDesdeLista}
        strUltimoRegistrado={ctrl.strUltimoRegistrado}
      />
    </div>
  );
}
