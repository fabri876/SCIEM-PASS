// Tarjeta de un examen del estudiante: datos del examen + estado de su QR + "Ver mi QR"
import { GraduationCap, Clock, QrCode } from "lucide-react";
import { estadoQrPorFecha } from "../../../services/credencialService";
import { fechaCorta, fechaHora, diasHasta } from "./formato";

function PildoraFecha({ strFecha }) {
  const n = diasHasta(strFecha);
  if (n === 0) return <Pildora strClase="bg-[#F0F6FC] text-[#1860A3]" strPunto="bg-[#267BC2] animate-pulse">Hoy</Pildora>;
  if (n != null && n < 0) return <Pildora strClase="bg-[#F1F5F9] text-[#64748B]" strPunto="bg-[#CBD5E1]">Finalizado</Pildora>;
  return <Pildora strClase="bg-[#F1F5F9] text-[#475569]" strPunto="bg-[#9AA8BA]">Próximo</Pildora>;
}

function Pildora({ strClase, strPunto, children }) {
  return (
    <span className={"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold " + strClase}>
      <i className={"w-[7px] h-[7px] rounded-full " + strPunto} />
      {children}
    </span>
  );
}

function EstadoQr({ objEstado }) {
  if (objEstado.estado === "INHABILITADO") {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#B91C1C]">
        No habilitado
      </span>
    );
  }
  if (objEstado.estado === "DISPONIBLE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D9E8F7] text-[#124B83]">
        <QrCode className="w-3.5 h-3.5" /> QR disponible
      </span>
    );
  }
  if (objEstado.estado === "PENDIENTE") {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569]">
        Disponible desde {fechaHora(objEstado.desde)}
      </span>
    );
  }
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#64748B]">
      QR vencido
    </span>
  );
}

export default function TarjetaExamenEstudiante({ examen, onVerQr }) {
  const objEstado = estadoQrPorFecha(examen.fecha, examen.habilitado !== false);
  const boolPasado = objEstado.estado === "VENCIDO";

  return (
    <article className={"bg-white border border-[#CBD5E1] rounded-xl px-[22px] py-[18px] max-md:p-4 " + (boolPasado ? "opacity-80" : "")}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-start gap-3.5 min-w-0 flex-1 basis-[300px] max-md:basis-full">
          <span className={"w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 text-white " + (boolPasado ? "bg-[#CBD5E1]" : "bg-[#003770]")}>
            <GraduationCap className="w-[22px] h-[22px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="m-0 text-base font-bold text-[#08264A] leading-snug">{examen.tipo} · {examen.materia}</h3>
              <PildoraFecha strFecha={examen.fecha} />
            </div>
            <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#64748B]">
              <span>Aula {examen.aula}{examen.grupo ? ` · Grupo ${examen.grupo}` : ""}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#9AA8BA]" />
                {fechaCorta(examen.fecha)} · {examen.horaInicio}{examen.horaFin ? ` – ${examen.horaFin}` : ""}
              </span>
            </p>
            <div className="mt-2"><EstadoQr objEstado={objEstado} /></div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onVerQr(examen.id)}
          className={
            "min-h-[42px] px-5 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer max-md:w-full inline-flex items-center justify-center gap-2 " +
            (objEstado.estado === "DISPONIBLE"
              ? "bg-[#003770] hover:bg-[#124B83] text-white"
              : "border border-[#CBD5E1] bg-white text-[#003770] hover:border-[#003770]")
          }
        >
          {objEstado.estado === "INHABILITADO" ? "Ver motivo" : <><QrCode className="w-4 h-4" /> Ver mi QR</>}
        </button>
      </div>
    </article>
  );
}
