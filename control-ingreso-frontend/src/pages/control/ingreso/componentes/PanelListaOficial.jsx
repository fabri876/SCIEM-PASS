// Lista oficial del aula (panel lateral). Solo muestra el estado de ingreso de cada estudiante.
// Se usa en el control del docente y en la vista del administrador.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { obtenerListaOficial } from "../../../../services/ingresoService";

// Estados que devuelve el backend → etiqueta que se muestra
const ESTADOS = {
  INGRESO: { strTexto: "Ingreso registrado", strClase: "bg-[#D9E8F7] text-[#124B83]" },
  PENDIENTE: { strTexto: "Sin registrar", strClase: "bg-[#F1F5F9] text-[#475569]" },
  INHABILITADO: { strTexto: "Inhabilitado", strClase: "bg-[#FEE2E2] text-[#B91C1C]" },
};

const FILTROS = [
  { strId: "TODOS", strTexto: "Todos" },
  { strId: "PENDIENTE", strTexto: "Sin registrar" },
  { strId: "INGRESO", strTexto: "Ingreso registrado" },
  { strId: "INHABILITADO", strTexto: "Inhabilitados" },
];

export default function PanelListaOficial({ boolAbierto, onCerrar, idExamen, numVersion, strUltimoRegistrado }) {
  const [strBuscar, setStrBuscar] = useState("");
  const [strFiltro, setStrFiltro] = useState("TODOS");
  const [listFilas, setListFilas] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);

  // Cargar (con pequeña espera al escribir) y recargar cuando hay ingresos nuevos
  useEffect(() => {
    if (!boolAbierto || idExamen == null) return undefined;
    let boolVivo = true;
    const t = setTimeout(() => {
      setBoolCargando(true);
      obtenerListaOficial(idExamen, strBuscar)
        .then((list) => boolVivo && setListFilas(Array.isArray(list) ? list : []))
        .finally(() => boolVivo && setBoolCargando(false));
    }, 250);
    return () => { boolVivo = false; clearTimeout(t); };
  }, [boolAbierto, idExamen, strBuscar, numVersion]);

  // Cerrar con Esc
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const fnTecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, onCerrar]);

  if (!boolAbierto) return null;

  const objConteo = {
    TODOS: listFilas.length,
    PENDIENTE: listFilas.filter((f) => f.estado === "PENDIENTE").length,
    INGRESO: listFilas.filter((f) => f.estado === "INGRESO").length,
    INHABILITADO: listFilas.filter((f) => f.estado === "INHABILITADO").length,
  };
  const listVisibles = strFiltro === "TODOS" ? listFilas : listFilas.filter((f) => f.estado === strFiltro);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(8,38,74,.45)]" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="ci-t-lista" className="ci-deslizar h-full w-[min(540px,100vw)] bg-white overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-[22px] pt-[22px]">
          <div>
            <h2 id="ci-t-lista" className="m-0 text-[19px] font-bold text-[#08264A]">Lista oficial del aula</h2>
            <p className="mt-1 text-[13px] text-[#64748B]">Estado de ingreso de los estudiantes del aula</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-[#003770] hover:bg-[#F1F5F9] cursor-pointer">
            <X className="w-[22px] h-[22px]" />
          </button>
        </div>

        <div className="px-[22px] pt-4 pb-6">
          <label htmlFor="ci-buscar" className="sr-only">Buscar en la lista oficial</label>
          <input
            id="ci-buscar"
            value={strBuscar}
            onChange={(e) => setStrBuscar(e.target.value)}
            placeholder="Buscar por apellido, C.I. o SIS"
            className="w-full mb-3 px-3.5 py-[11px] rounded-lg border-[1.5px] border-[#CBD5E1] text-[15px] text-[#08264A] outline-none focus:border-[#1860A3] focus:shadow-[0_0_0_4px_#D9E8F7]"
          />

          <div role="tablist" aria-label="Filtrar por estado" className="flex flex-wrap gap-2 mb-3.5">
            {FILTROS.map((f) => {
              const boolActivo = strFiltro === f.strId;
              return (
                <button
                  key={f.strId}
                  type="button"
                  role="tab"
                  aria-selected={boolActivo}
                  onClick={() => setStrFiltro(f.strId)}
                  className={
                    "px-3 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer transition-colors " +
                    (boolActivo ? "bg-[#003770] text-white" : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]")
                  }
                >
                  {f.strTexto} ({objConteo[f.strId]})
                </button>
              );
            })}
          </div>

          <ul className="m-0 p-0 list-none border border-[#CBD5E1] rounded-xl overflow-hidden">
            {boolCargando && listFilas.length === 0 && (
              <li className="text-center text-sm text-[#64748B] px-[18px] py-7">Cargando lista…</li>
            )}

            {!boolCargando && listVisibles.length === 0 && (
              <li className="text-center text-sm text-[#64748B] px-[18px] py-7">
                {listFilas.length === 0 ? "Sin coincidencias en la lista oficial." : "No hay estudiantes con este estado."}
              </li>
            )}

            {listVisibles.map((f) => {
              const objEstado = ESTADOS[f.estado] || ESTADOS.PENDIENTE;
              return (
                <li
                  key={f.ci}
                  className={"grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0 " + (f.ci === strUltimoRegistrado ? "bg-[#F0F6FC]" : "")}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#08264A]">{f.apellidos} {f.nombres}</div>
                    <div className="mt-px text-xs text-[#64748B]">SIS {f.sis} · C.I. {f.ci}</div>
                  </div>
                  <span className={"justify-self-end px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap " + objEstado.strClase}>
                    {objEstado.strTexto}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
