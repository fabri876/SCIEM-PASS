import { useOperador } from "../operadorContexto";

export default function SelectorExamen() {
  const { estadoRed, listaAsignados, fnCambiarExamen } = useOperador();
  return (
    <div className="flex flex-wrap gap-2" aria-label="Exámenes asignados">
      {listaAsignados.map((e) => {
        const activo = estadoRed.examen === e.id;
        const etiqueta = e.estado === "listo" ? "✓ local" : e.estado === "descargando" ? "…" : "sin nómina";
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => fnCambiarExamen(e.id)}
            className={
              "text-[11px] font-extrabold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer " +
              (activo
                ? "bg-[#003770] text-white border-[#003770]"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
            }
          >
            {e.nombre.split(" · ")[0]} · {etiqueta}
          </button>
        );
      })}
    </div>
  );
}