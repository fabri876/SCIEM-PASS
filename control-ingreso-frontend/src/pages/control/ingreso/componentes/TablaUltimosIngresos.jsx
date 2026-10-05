// Tabla "Últimos ingresos" (se actualiza sola cada pocos segundos)

const FILA = "grid grid-cols-[130px_minmax(0,1fr)_110px_90px] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0 " +
  "max-md:grid-cols-[72px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-1 max-md:px-3.5";

const PILDORA = "inline-flex items-center gap-[5px] px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap justify-self-start";

export default function TablaUltimosIngresos({ listUltimos = [], strUltimoRegistrado }) {
  return (
    <section aria-labelledby="ci-t-ultimos" className="bg-white border border-[#CBD5E1] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#CBD5E1]">
        <h2 id="ci-t-ultimos" className="m-0 text-[15px] font-bold text-[#08264A]">Últimos ingresos</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1860A3]">
          <i className="w-[7px] h-[7px] rounded-full bg-[#267BC2] animate-pulse" /> En vivo
        </span>
      </div>

      <ul className="m-0 p-0 list-none">
        <li className={FILA + " !py-2.5 bg-[#F1F5F9] text-[11px] font-semibold uppercase tracking-[.4px] text-[#64748B]"}>
          <span>Hora de ingreso</span>
          <span>Estudiante</span>
          <span className="max-md:hidden">Método</span>
          <span className="max-md:hidden">Estado</span>
        </li>

        {listUltimos.length === 0 && (
          <li className="block text-center text-sm text-[#64748B] px-[18px] py-7 border-t border-[#CBD5E1]">
            Todavía no se registraron ingresos en este examen.
          </li>
        )}

        {listUltimos.map((r) => {
          const e = r.estudiante;
          const boolNuevo = strUltimoRegistrado && e.ci === strUltimoRegistrado;
          return (
            <li key={e.ci + r.hora} className={FILA + (boolNuevo ? " bg-[#F0F6FC]" : "")}>
              <span className="font-mono text-[13px] font-semibold text-[#003770]">{r.hora}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#08264A]">{e.nombres} {e.apellidos}</div>
                <div className="mt-px text-xs text-[#64748B]">SIS {e.sis} · C.I. {e.ci} · {e.carrera}</div>
              </div>
              <span className={PILDORA + " bg-[#F1F5F9] text-[#475569] max-md:col-start-2"}>{r.metodo}</span>
              <span className={PILDORA + " bg-[#D9E8F7] text-[#124B83] max-md:col-start-2"}>Válido</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
