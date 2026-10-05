// Página del DOCENTE: mismo control de ingreso + lista oficial del aula
// Ruta: /home/docente/examenes/:idExamen/control-ingreso  (mismo estilo que .../habilitaciones)
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ListChecks } from "lucide-react";
import Header from "../../../components/layout/Header";
import useControlIngreso from "./useControlIngreso";
import SeccionControlIngreso from "./SeccionControlIngreso";
import EncabezadoControl from "./componentes/EncabezadoControl";
import PanelListaOficial from "./componentes/PanelListaOficial";

export default function ControlIngresoDocente() {
  const { idExamen } = useParams();
  const navigate = useNavigate();
  const ctrl = useControlIngreso(idExamen ? Number(idExamen) : null);
  const [boolListaAbierta, setBoolListaAbierta] = useState(false);

  const fnCerrarLista = useCallback(() => setBoolListaAbierta(false), []);
  const fnRegistrarDesdeLista = useCallback((strCi) => ctrl.fnValidar(strCi, "LISTA"), [ctrl]);

  const examen = ctrl.examenActual;

  return (
    // Mismo layout que HomeControl: header fijo arriba y contenido con pt-[115px]
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-nunito pb-16">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <Header />
      </div>
      <main className="max-w-[1200px] w-full mx-auto pt-[115px] px-4 sm:px-6 space-y-6">
        <EncabezadoControl
          strTitulo="Control de ingreso"
          strDetalle={examen ? `${examen.tipo} · ${examen.materia}` : "Control de ingreso"}
          boolMostrarRed
          onVolver={() => navigate("/home/docente")}
        >
          <button
            type="button"
            onClick={() => setBoolListaAbierta(true)}
            className="min-h-10 px-4 rounded-lg border border-[#CBD5E1] bg-white text-[#003770] text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:border-[#003770] cursor-pointer max-md:w-full"
          >
            <ListChecks className="w-4 h-4" /> Lista oficial del aula
          </button>
        </EncabezadoControl>

        <SeccionControlIngreso ctrl={ctrl} strRol="docente" boolPermitirVolver={false} />
      </main>

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
