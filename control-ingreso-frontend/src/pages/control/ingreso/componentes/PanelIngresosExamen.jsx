import ReporteLista from '../../../../components/common/ReporteLista.jsx';
import { textoInterfaz } from '../../../../utils/textoInterfaz.js';
// "Ver ingresos" de un examen (panel lateral, solo lectura): todos los estudiantes con su estado.
// - Ingresó: la hora va en la etiqueta ("Ingresó 09:41") y debajo quién lo registró.
// - Inhabilitado: motivo.
// - No ingresó.
// Usa la misma lista oficial del backend (ya trae hora, quién registró, estado, motivo y aula).
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { obtenerListaOficial } from "../../../../services/ingresoService";
import { textoNombre, nombreEstudiante } from "../../../../components/common/textoNombre";

const ESTADOS = {
  INGRESO: { strTexto: "Ingresó", strClase: "bg-[#D9E8F7] text-[#124B83]" },
  PENDIENTE: { strTexto: "No ingresó", strClase: "bg-[#F1F5F9] text-[#475569]" },
  INHABILITADO: { strTexto: "Inhabilitado", strClase: "bg-[#FEE2E2] text-[#B91C1C]" },
  // Ingresó y fue expulsado del examen: no está en el aula, pero sí entró.
  RETIRADO: { strTexto: "Expulsado", strClase: "bg-[#E2E8F0] text-[#475569]" },
};

const FILTROS = [
  { strId: "TODOS", strTexto: "Todos" },
  { strId: "INGRESO", strTexto: "Ingresaron" },
  { strId: "RETIRADO", strTexto: "Expulsados" },
  { strId: "PENDIENTE", strTexto: "No ingresaron" },
  { strId: "INHABILITADO", strTexto: "Inhabilitados" },
];

function estadoDe(f) {
  const str = String(f.estado || "").toUpperCase();
  if (str === "INGRESO") return "INGRESO";
  if (str === "INHABILITADO") return "INHABILITADO";
  if (str === "RETIRADO") return "RETIRADO";
  return "PENDIENTE";
}

const hhmm = (v) => (v ? String(v).slice(0, 5) : "");

// Nombres siempre con mayúscula inicial ("caceres rengel fabricio" → "Caceres Rengel Fabricio")
const nombreNormal = textoNombre;

export default function PanelIngresosExamen({ boolAbierto, onCerrar, idExamen, strSubtitulo = "", numVersion = 0 }) {
  const [strBuscar, setStrBuscar] = useState("");
  const [strFiltro, setStrFiltro] = useState("TODOS");
  const [listFilas, setListFilas] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    if (!boolAbierto || idExamen == null) return undefined;
    let boolVivo = true;
    setBoolCargando(true);
    setStrError("");
    obtenerListaOficial(idExamen, "")
      .then((list) => boolVivo && setListFilas(Array.isArray(list) ? list : []))
      .catch(() => boolVivo && setStrError("No se pudo cargar la lista. Revisa tu conexión e intenta de nuevo."))
      .finally(() => boolVivo && setBoolCargando(false));
    return () => { boolVivo = false; };
  }, [boolAbierto, idExamen, numVersion]);

  // Al abrir otro examen se limpian la búsqueda y el filtro
  useEffect(() => {
    if (boolAbierto) { setStrBuscar(""); setStrFiltro("TODOS"); }
  }, [boolAbierto, idExamen]);

  // Cerrar con Esc
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const fnTecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, onCerrar]);

  if (!boolAbierto) return null;

  const listOrdenada = [...listFilas].sort((a, b) => nombreEstudiante(a).localeCompare(nombreEstudiante(b), "es"));
  const strTermino = strBuscar.trim().toLowerCase();
  const listBuscadas = strTermino
    ? listOrdenada.filter((f) => `${f.apellidos || ""} ${f.nombres || ""} ${f.sis || ""} ${f.ci || ""}`.toLowerCase().includes(strTermino))
    : listOrdenada;

  const objConteo = {
    TODOS: listBuscadas.length,
    INGRESO: listBuscadas.filter((f) => estadoDe(f) === "INGRESO").length,
    PENDIENTE: listBuscadas.filter((f) => estadoDe(f) === "PENDIENTE").length,
    INHABILITADO: listBuscadas.filter((f) => estadoDe(f) === "INHABILITADO").length,
    RETIRADO: listBuscadas.filter((f) => estadoDe(f) === "RETIRADO").length,
  };
  const listVisibles = strFiltro === "TODOS" ? listBuscadas : listBuscadas.filter((f) => estadoDe(f) === strFiltro);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(8,38,74,.45)]" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="ci-t-ingresos" className="ci-deslizar h-full w-[min(560px,100vw)] bg-white overflow-y-auto flex flex-col">
        <div className="flex items-start justify-between gap-3 px-[22px] pt-[22px]">
          <div className="min-w-0">
            <h2 id="ci-t-ingresos" className="m-0 text-[19px] font-bold text-[#08264A]">Ingresos del examen</h2>
            {strSubtitulo && <p className="mt-1 text-[13px] text-[#64748B]">{strSubtitulo}</p>}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-[#003770] hover:bg-[#F1F5F9] cursor-pointer">
            <X className="w-[22px] h-[22px]" />
          </button>
        </div>

        <div className="px-[22px] pt-4 pb-6 flex-1">
          <label htmlFor="ci-buscar-ingresos" className="sr-only">Buscar estudiante</label>
          <input
            id="ci-buscar-ingresos"
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
                  {textoInterfaz(f.strTexto)} ({objConteo[f.strId]})
                </button>
              );
            })}
          </div>

          {strError && (
            <div role="alert" className="mb-3 px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{textoInterfaz(strError)}</div>
          )}

          <ul className="m-0 p-0 list-none border border-[#CBD5E1] rounded-xl overflow-hidden">
            {boolCargando && listFilas.length === 0 && (
              <li className="text-center text-sm text-[#64748B] px-[18px] py-7">Cargando lista…</li>
            )}
            {!boolCargando && listVisibles.length === 0 && (
              <li className="text-center text-sm text-[#64748B] px-[18px] py-7">
                {textoInterfaz(listBuscadas.length === 0 ? "Sin coincidencias en la lista." : "No hay estudiantes con este estado.")}
              </li>
            )}
            <ReporteLista titulo="Ingresos del examen" contenido={() => <>{listVisibles.map((f) => {
              const strEstado = estadoDe(f);
              const objEstado = ESTADOS[strEstado];
              const strAula = f.aulaAsignada ? `Aula ${String(f.aulaAsignada).replace(/^aula\s*/i, "")}` : "";
              const strMotivo = f.observacion || f.observacionHabilitacion || "";
              return (
                <li key={f.sis || f.ci} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#08264A]">{nombreEstudiante(f)}</div>
                    <div className="mt-px text-xs text-[#64748B]">
                      {[f.sis && `SIS ${f.sis}`, f.ci && `C.I. ${f.ci}`, strAula].filter(Boolean).join(" · ")}
                    </div>
                    {strEstado === "INGRESO" && f.marcadoPor && (
                      <div className="mt-1 text-xs text-[#334155]">Registrado por {nombreNormal(f.marcadoPor)}</div>
                    )}
                    {strEstado === "INHABILITADO" && (
                      <div className="mt-1 text-xs text-[#B91C1C]">Motivo: {textoInterfaz(strMotivo || "sin motivo especificado")}</div>
                    )}
                  </div>
                  <span className={"justify-self-end px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap " + objEstado.strClase}>
                    {textoInterfaz(objEstado.strTexto)}{textoInterfaz(strEstado === "INGRESO" && hhmm(f.horaIngreso) ? ` ${hhmm(f.horaIngreso)}` : "")}
                  </span>
                </li>
              );
            })}</>} as="li" />
{listVisibles.map((f) => {
              const strEstado = estadoDe(f);
              const objEstado = ESTADOS[strEstado];
              const strAula = f.aulaAsignada ? `Aula ${String(f.aulaAsignada).replace(/^aula\s*/i, "")}` : "";
              const strMotivo = f.observacion || f.observacionHabilitacion || "";
              return (
                <li key={f.sis || f.ci} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#08264A]">{nombreEstudiante(f)}</div>
                    <div className="mt-px text-xs text-[#64748B]">
                      {[f.sis && `SIS ${f.sis}`, f.ci && `C.I. ${f.ci}`, strAula].filter(Boolean).join(" · ")}
                    </div>
                    {strEstado === "INGRESO" && f.marcadoPor && (
                      <div className="mt-1 text-xs text-[#334155]">Registrado por {nombreNormal(f.marcadoPor)}</div>
                    )}
                    {strEstado === "INHABILITADO" && (
                      <div className="mt-1 text-xs text-[#B91C1C]">Motivo: {textoInterfaz(strMotivo || "sin motivo especificado")}</div>
                    )}
                  </div>
                  <span className={"justify-self-end px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap " + objEstado.strClase}>
                    {textoInterfaz(objEstado.strTexto)}{textoInterfaz(strEstado === "INGRESO" && hhmm(f.horaIngreso) ? ` ${hhmm(f.horaIngreso)}` : "")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-[22px] py-3 border-t border-[#E2E8F0] text-xs text-[#64748B]">Solo lectura</div>
      </aside>
    </div>
  );
}
