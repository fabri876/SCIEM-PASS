// Bloque completo del control de ingreso.
// Sin examen elegido → "Mis exámenes". Con examen elegido → verificación.
import "./controlIngreso.css";
import { ArrowLeft, Info } from "lucide-react";
import ListaExamenesHoy from "./componentes/ListaExamenesHoy";
import TarjetaExamen from "./componentes/TarjetaExamen";
import EstacionVerificacion from "./componentes/EstacionVerificacion";
import TarjetaResultado from "./componentes/TarjetaResultado";
import TablaUltimosIngresos from "./componentes/TablaUltimosIngresos";

export default function SeccionControlIngreso({ ctrl, strRol = "operador", boolPermitirVolver = true, objModoSinConexion = {} }) {
  const {
    listExamenes, boolCargandoExamenes, examenActual, idExamen, objContador, listUltimos, objResultado,
    boolValidando, strError, strUltimoRegistrado, fnValidar, fnCerrarResultado, fnElegirExamen, fnVolverALista,
  } = ctrl;

  if (idExamen == null) {
    return (
      <div className="text-[#08264A]">
        {strError && (
          <div role="alert" className="mb-3 px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strError}</div>
        )}
        <ListaExamenesHoy
          listExamenes={listExamenes}
          boolCargando={boolCargandoExamenes}
          onElegir={fnElegirExamen}
          fnObtenerNomina={objModoSinConexion.fnObtenerNomina}
          fnDescargarNomina={objModoSinConexion.fnDescargarNomina}
          boolSinRed={objModoSinConexion.boolSinRed}
        />
      </div>
    );
  }

  const boolFinalizado = examenActual?.estado === "FINALIZADO";
  const boolOperador = strRol === "operador";
  // Las filas por apellido solo aplican al operador: el docente puede registrar a cualquiera
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
            <ArrowLeft className="w-4 h-4" /> Mis exámenes
          </button>
        )}
        <TarjetaExamen examen={examenActual} objContador={objContador} boolMostrarFila={boolOperador} />
      </div>

      <section aria-labelledby="ci-t-verificacion">
        <h2 id="ci-t-verificacion" className="m-0 mb-3 text-base font-bold text-[#08264A]">Verificación de ingreso</h2>
        {boolFinalizado ? (
          <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-sm text-[#475569]">
            <Info className="w-[18px] h-[18px] shrink-0 mt-px" />
            Este examen ya finalizó. Ya no se pueden registrar ingresos, pero puedes revisar los registrados.
          </div>
        ) : (
          <>
            <EstacionVerificacion onValidar={fnValidarRol} boolValidando={boolValidando} idExamen={idExamen} />
            {strError && (
              <div role="alert" className="mt-3 px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strError}</div>
            )}
            <TarjetaResultado objResultado={objResultado} onCerrar={fnCerrarResultado} strRol={strRol} />
          </>
        )}
      </section>

      <TablaUltimosIngresos listUltimos={listUltimos} strUltimoRegistrado={strUltimoRegistrado} strRol={strRol} />
    </div>
  );
}
