// Historial en vivo de los últimos ingresos (se actualiza solo cada pocos segundos)
// Ayudante: "Mis últimos ingresos", sin la columna "Registró" (todos son suyos).
// Docente / administrador: "Últimos ingresos", con quién registró cada ingreso y el total del aula.
// boolSinRed: "Sin conexión" en vez de "En vivo" y los registros de este equipo (ayudante y docente).
import { obtenerUsuarioActual } from "../../../../services/authService";
import { textoNombre } from "../../../../components/common/textoNombre";

// Columnas de la tabla con CSS propio (no dependen de clases de Tailwind):
// escritorio 4 columnas (3 para el ayudante) · celular: hora + estudiante, y método/registró debajo
const CSS_COLUMNAS = `
.ci-hist-fila { display: grid; grid-template-columns: 110px minmax(0, 1fr) 120px minmax(0, 230px); column-gap: 16px; row-gap: 4px; align-items: center; }
.ci-hist-fila.ci-sin-registro { grid-template-columns: 110px minmax(0, 1fr) 120px; }
@media (max-width: 767px) {
  .ci-hist-fila, .ci-hist-fila.ci-sin-registro { grid-template-columns: 84px minmax(0, 1fr); }
}`;
const FILA_BASE = "ci-hist-fila px-5 max-md:px-4 ";

// Quién registró: el modo sin conexión guarda el id del usuario (por ejemplo "888"), no su nombre.
// Si es el id del usuario actual se muestra su nombre; otro número suelto no dice nada, así que se muestra "—".
function textoRegistro(valor) {
  const str = String(valor ?? "").trim();
  if (!str) return "";
  if (/^\d+$/.test(str)) {
    const usuario = obtenerUsuarioActual();
    const strYo = String(usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id ?? "");
    const strNombre = `${usuario?.nombre || ""} ${usuario?.apellido || ""}`.trim();
    return str === strYo ? (textoNombre(strNombre) || "Tú") : "";
  }
  return nombreNormal(str);
}

// Nombres siempre con mayúscula inicial ("caceres rengel fabricio" → "Caceres Rengel Fabricio")
const nombreNormal = textoNombre;

export default function TablaUltimosIngresos({ listUltimos = [], strUltimoRegistrado, strRol = "operador", boolMostrarRegistro, numRegistrados = null, boolSinRed = false }) {
  const boolRegistro = boolMostrarRegistro ?? strRol !== "operador";
  const FILA = FILA_BASE + (boolRegistro ? "" : "ci-sin-registro ");
  const strTitulo = strRol === "operador" ? "Mis últimos ingresos" : "Últimos ingresos";
  const boolMostrarTotal = strRol !== "operador" && numRegistrados != null;

  return (
    <section aria-labelledby="ci-t-ultimos" className="bg-white border border-[#CBD5E1] rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(8,38,74,.05)]">
      <style>{CSS_COLUMNAS}</style>
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#003770] text-white max-md:px-4">
        <h2 id="ci-t-ultimos" className="m-0 text-[15px] font-bold">
          {strTitulo}
          {boolMostrarTotal && <span className="ml-2 text-xs font-semibold text-white/80">· {numRegistrados} registrados</span>}
        </h2>
        {boolSinRed ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-extrabold">
            <i className="w-2 h-2 rounded-full bg-[#CBD5E1]" /> Sin conexión
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-extrabold">
            <i className="w-2 h-2 rounded-full bg-[#7DD3FC] shadow-[0_0_0_4px_rgba(125,211,252,.25)] animate-pulse" /> En vivo
          </span>
        )}
      </div>

      <ul className="m-0 p-0 list-none">
        {/* Títulos de columnas */}
        <li className={FILA + "py-2.5 bg-[#E8F1FB] text-[11px] font-extrabold uppercase tracking-[.5px] text-[#124B83]"}>
          <span>Hora</span>
          <span>Estudiante</span>
          <span className="max-md:hidden">Método</span>
          {boolRegistro && <span className="max-md:hidden">Registró</span>}
        </li>

        {listUltimos.length === 0 && (
          <li className="block text-center text-sm text-[#64748B] px-5 py-7 border-t border-[#E2E8F0]">
            {strRol === "operador" ? "Todavía no registraste ingresos en este examen." : "Todavía no se registraron ingresos en este examen."}
          </li>
        )}

        {listUltimos.map((r, i) => {
          const e = r.estudiante;
          const boolNuevo = i === 0 || (strUltimoRegistrado && e.ci === strUltimoRegistrado);
          const strDatos = [e.sis && `SIS ${e.sis}`, e.ci && `C.I. ${e.ci}`].filter(Boolean).join(" · ");
          return (
            <li
              key={(e.ci || e.sis) + r.hora}
              className={
                FILA + "py-3 border-t border-[#E2E8F0] " +
                (boolNuevo ? "bg-[#F0F6FC] shadow-[inset_4px_0_0_#003770]" : i % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white")
              }
            >
              <span className="font-mono text-[13px] font-bold text-[#003770]">{r.hora}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#08264A] truncate">
                  {nombreNormal(`${e.nombres} ${e.apellidos || ""}`)}
                  {r.sinSincronizar && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E]">sin sincronizar</span>
                  )}
                </div>
                {strDatos && <div className="text-xs text-[#64748B]">{strDatos}</div>}
              </div>
              <span className="text-[13px] text-[#334155] max-md:col-start-2 max-md:text-xs">
                <span className="md:hidden text-[#64748B]">Método: </span>{r.metodo}
              </span>
              {boolRegistro && (
                <span className="min-w-0 truncate text-[13px] text-[#334155] max-md:col-start-2 max-md:text-xs" title={textoRegistro(r.registradoPor) || ""}>
                  <span className="md:hidden text-[#64748B]">Registró: </span>{textoRegistro(r.registradoPor) || "—"}
                </span>
              )}
            </li>
          );
        })}

      </ul>
    </section>
  );
}