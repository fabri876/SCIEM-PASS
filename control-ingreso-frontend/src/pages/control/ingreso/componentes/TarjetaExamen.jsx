// Examen asignado: nombre, aula, horario, chips y barra de ingresos
import { GraduationCap } from "lucide-react";

const ESTILO_CHIP = {
  azul: "bg-[#F0F6FC] text-[#1860A3]",
  gris: "bg-[#F1F5F9] text-[#475569]",
  rojo: "bg-[#FEF2F2] text-[#B91C1C]",
};

function Chip({ strTono, numValor, strEtiqueta }) {
  return (
    <span
      className={
        "inline-flex items-baseline gap-[7px] px-3.5 py-2 rounded-lg text-xs font-medium " +
        "max-md:flex-col max-md:items-start max-md:gap-0 max-md:px-2.5 max-md:text-[11px] " +
        ESTILO_CHIP[strTono]
      }
    >
      <b className="text-[17px] font-bold">{numValor}</b>
      {strEtiqueta}
    </span>
  );
}

export default function TarjetaExamen({ examen, objContador }) {
  if (!examen) {
    return (
      <section className="bg-white border border-[#CBD5E1] rounded-xl px-[22px] py-5 text-sm text-[#64748B]">
        Cargando examen asignado…
      </section>
    );
  }

  const numIng = objContador?.ingresaron ?? 0;
  const numHab = objContador?.habilitados ?? 0;
  const numPend = objContador?.pendientes ?? 0;
  const numInh = objContador?.inhabilitados ?? 0;
  const numPct = numHab ? Math.min(100, (numIng / numHab) * 100) : 0;

  return (
    <section aria-label="Examen asignado" className="bg-white border border-[#CBD5E1] rounded-xl px-[22px] py-5 max-md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="w-[42px] h-[42px] rounded-[10px] bg-[#003770] text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-[22px] h-[22px]" />
          </span>
          <div className="min-w-0">
            {/* TODO FRONTEND: Si el ayudante está gestionando más de 1 grupo, al seleccionar "Registrar Ingreso" debería aparecer un modal para que elija a qué grupo específico está controlando el ingreso.
            por el momento esta mostrando el primer grupo de la BD[0]*/}
            <b className="block text-base font-bold text-[#08264A]">
              {examen.tipo} · {examen.materia}
              {examen.grupo && ` · Grupo ${String(examen.grupo).split(",")[0]}`}
            </b>
            <span className="text-[13px] text-[#64748B]">
              Aula {examen.aula}{examen.edificio ? ` · ${examen.edificio}` : ""} · {examen.horaInicio} – {examen.horaFin}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full md:flex md:flex-wrap md:w-auto md:gap-2.5">
          <Chip strTono="azul" numValor={numIng} strEtiqueta="Ingresaron" />
          <Chip strTono="gris" numValor={numPend} strEtiqueta="Faltantes" />
          <Chip strTono="rojo" numValor={numInh} strEtiqueta="Inhabilitados" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 text-xs text-[#64748B]">
        <span>Ingresos registrados</span>
        <span className="order-2 basis-full md:order-none md:basis-auto md:flex-1 h-[7px] bg-[#F1F5F9] rounded-full overflow-hidden">
          <i className="block h-full bg-[#003770] rounded-full transition-[width] duration-500" style={{ width: numPct + "%" }} />
        </span>
        <b className="ml-auto md:ml-0 text-[13px] text-[#08264A] font-bold whitespace-nowrap">
          {numIng} / {numHab} habilitados
        </b>
      </div>
    </section>
  );
}
