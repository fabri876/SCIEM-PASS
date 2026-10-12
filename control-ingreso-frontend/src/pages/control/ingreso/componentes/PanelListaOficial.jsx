// Lista oficial del aula (panel lateral). Sin onRegistrar es solo lectura (vista del administrador)
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { obtenerListaOficial } from "../../../../services/ingresoService";

export default function PanelListaOficial({ boolAbierto, onCerrar, idExamen, numVersion, onRegistrar, strUltimoRegistrado }) {
  const [strBuscar, setStrBuscar] = useState("");
  const [listFilas, setListFilas] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);

  // Cargar (con pequeña espera al escribir) y recargar cuando hay ingresos nuevos
  useEffect(() => {
    if (!boolAbierto || idExamen == null) return undefined;
    let boolVivo = true;
    const t = setTimeout(() => {
      setBoolCargando(true);
      obtenerListaOficial(idExamen, strBuscar)
        .then((list) => boolVivo && setListFilas(list))
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(8,38,74,.45)]" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="ci-t-lista" className="ci-deslizar h-full w-[min(540px,100vw)] bg-white overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-[22px] pt-[22px]">
          <div>
            <h2 id="ci-t-lista" className="m-0 text-[19px] font-bold text-[#08264A]">Lista oficial del aula</h2>
            <p className="mt-1 text-[13px] text-[#64748B]">Busca por apellido y registra el ingreso desde la lista</p>
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
            className="w-full mb-3.5 px-3.5 py-[11px] rounded-lg border-[1.5px] border-[#CBD5E1] text-[15px] text-[#08264A] outline-none focus:border-[#1860A3] focus:shadow-[0_0_0_4px_#D9E8F7]"
          />

          <ul className="m-0 p-0 list-none border border-[#CBD5E1] rounded-xl overflow-hidden">
            <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 px-[18px] py-2.5 bg-[#F1F5F9] text-[11px] font-semibold uppercase tracking-[.4px] text-[#64748B]">
              <span>Estudiante</span><span>Estado</span>
            </li>

            {!boolCargando && listFilas.length === 0 && (
              <li className="text-center text-sm text-[#64748B] px-[18px] py-7 border-t border-[#CBD5E1]">Sin coincidencias en la lista oficial.</li>
            )}

            {listFilas.map((f) => (
              <li
                key={f.ci}
                className={"grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] " + (f.ci === strUltimoRegistrado ? "bg-[#F0F6FC]" : "")}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#08264A]">{f.apellidos}, {f.nombres}</div>
                  <div className="mt-px text-xs text-[#64748B]">SIS {f.sis} · C.I. {f.ci}</div>
                </div>
                {f.estado === "INHABILITADO" && (
                  <span className="justify-self-end px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#B91C1C]">Inhabilitado</span>
                )}
                {f.estado === "INGRESO" && (
                  <span className="justify-self-end px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D9E8F7] text-[#124B83] whitespace-nowrap">
                    Ingresó <span className="font-mono">{f.horaIngreso}</span>
                  </span>
                )}
                {f.estado === "PENDIENTE" && (onRegistrar ? (
                  <button
                    type="button"
                    onClick={() => onRegistrar(f.ci)}
                    className="justify-self-end min-h-9 px-3 rounded-lg bg-[#003770] hover:bg-[#124B83] text-white text-[13px] font-semibold cursor-pointer"
                  >
                    Registrar ingreso
                  </button>
                ) : (
                  <span className="justify-self-end px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569]">Pendiente</span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
