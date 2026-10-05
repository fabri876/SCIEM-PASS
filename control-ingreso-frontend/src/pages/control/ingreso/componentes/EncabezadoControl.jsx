// Título de la página (saludo / "Control de ingreso") + acciones a la derecha
import { ArrowLeft } from "lucide-react";

function fechaDeHoy() {
  const str = new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function EncabezadoControl({ strTitulo, strDetalle = "Control de ingreso", boolMostrarRed = false, onVolver, children }) {
  return (
    <div>
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 mb-2.5 text-[13px] font-medium text-[#1860A3] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Mis exámenes de hoy
        </button>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="m-0 text-[22px] max-md:text-xl font-bold text-[#08264A]">{strTitulo}</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">{fechaDeHoy()} · {strDetalle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 max-md:w-full">
          {boolMostrarRed && (
            <span className="inline-flex items-center gap-[7px] px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F0F6FC] text-[#1860A3]">
              <i className="w-[7px] h-[7px] rounded-full bg-[#267BC2]" /> En línea
            </span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
