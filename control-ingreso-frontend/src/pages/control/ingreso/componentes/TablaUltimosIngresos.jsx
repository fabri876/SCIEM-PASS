// Tabla de últimos ingresos (se actualiza sola cada pocos segundos)
// Operador: "Mis últimos ingresos", sin la columna "Registró" (todos son suyos).
// Con boolMostrarRegistro (docente) se muestra quién registró cada ingreso.

const FILA_BASE = "grid gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0 " +
  "max-md:grid-cols-[72px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-1 max-md:px-3.5 ";
const COLUMNAS_CON_REGISTRO = "grid-cols-[120px_minmax(0,1fr)_100px_minmax(0,180px)]";
const COLUMNAS_SIN_REGISTRO = "grid-cols-[120px_minmax(0,1fr)_100px]";

const PILDORA = "inline-flex items-center gap-[5px] px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap justify-self-start";

export default function TablaUltimosIngresos({ listUltimos = [], strUltimoRegistrado, strRol = "operador", boolMostrarRegistro }) {
  const boolRegistro = boolMostrarRegistro ?? strRol !== "operador";
  const FILA = FILA_BASE + (boolRegistro ? COLUMNAS_CON_REGISTRO : COLUMNAS_SIN_REGISTRO);
  const strTitulo = strRol === "operador" ? "Mis últimos ingresos" : "Últimos ingresos";
  return (
    <section aria-labelledby="ci-t-ultimos" className="bg-white border border-[#CBD5E1] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[#CBD5E1]">
        <h2 id="ci-t-ultimos" className="m-0 text-[15px] font-bold text-[#08264A]">{strTitulo}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1860A3]">
          <i className="w-[7px] h-[7px] rounded-full bg-[#267BC2] animate-pulse" /> En vivo
        </span>
      </div>

      <ul className="m-0 p-0 list-none">
        <li className={FILA + " !py-2.5 bg-[#F1F5F9] text-[11px] font-semibold uppercase tracking-[.4px] text-[#64748B]"}>
          <span>Hora de ingreso</span>
          <span>Estudiante</span>
          <span className="max-md:hidden">Método</span>
          {boolRegistro && <span className="max-md:hidden">Registró</span>}
        </li>

        {listUltimos.length === 0 && (
          <li className="block text-center text-sm text-[#64748B] px-[18px] py-7 border-t border-[#CBD5E1]">
            {strRol === "operador" ? "Todavía no registraste ingresos en este examen." : "Todavía no se registraron ingresos en este examen."}
          </li>
        )}

        {listUltimos.map((r) => {
          const e = r.estudiante;
          const boolNuevo = strUltimoRegistrado && e.ci === strUltimoRegistrado;
          const strDatos = [e.sis && `SIS ${e.sis}`, e.ci && `C.I. ${e.ci}`, e.carrera].filter(Boolean).join(" · ");
          return (
            <li key={(e.ci || e.sis) + r.hora} className={FILA + (boolNuevo ? " bg-[#F0F6FC]" : "")}>
              <span className="font-mono text-[13px] font-semibold text-[#003770]">{r.hora}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#08264A]">{e.nombres} {e.apellidos}</div>
                <div className="mt-px text-xs text-[#64748B]">{strDatos}</div>
              </div>
              <span className={PILDORA + " bg-[#F1F5F9] text-[#475569] max-md:col-start-2"}>{r.metodo}</span>
              {boolRegistro && (
                <span className="min-w-0 truncate text-[13px] text-[#475569] max-md:col-start-2 max-md:text-xs" title={r.registradoPor || ""}>
                  <span className="md:hidden text-[#64748B]">Registró: </span>{r.registradoPor || "—"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
