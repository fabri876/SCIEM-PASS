import ReporteLista from '../../../../components/common/ReporteLista.jsx';
import { textoInterfaz } from '../../../../utils/textoInterfaz.js';
// Lista oficial del aula (panel lateral, HU11): estado de ingreso de cada estudiante en tiempo real.
// Se usa en el control del docente y en la vista del administrador.
// - Se actualiza sola cada 10 s mientras está abierta (y apenas hay un ingreso nuevo).
// - "En vivo · actualizado hace X s"; al terminar el examen deja de actualizarse ("Examen finalizado").
// - Quien acaba de ingresar se resalta unos segundos con la etiqueta "NUEVO".
// - Solo lectura: no se modifica nada desde aquí.
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { obtenerListaOficial } from "../../../../services/ingresoService";
import { nombreEstudiante } from "../../../../components/common/textoNombre";

const INTERVALO_MS = 10000;
const DURACION_NUEVO_MS = 8000;

// Estados que devuelve el backend → etiqueta que se muestra
const ESTADOS = {
  INGRESO: { strTexto: "Ingresó", strClase: "bg-[#D9E8F7] text-[#124B83]" },
  PENDIENTE: { strTexto: "Ausente", strClase: "bg-[#F1F5F9] text-[#475569]" },
  INHABILITADO: { strTexto: "Inhabilitado", strClase: "bg-[#FEE2E2] text-[#B91C1C]" },
  // Ingresó y fue expulsado del examen: no está en el aula, pero sí entró.
  RETIRADO: { strTexto: "Expulsado", strClase: "bg-[#E2E8F0] text-[#475569]" },
};

const FILTROS = [
  { strId: "TODOS", strTexto: "Todos" },
  { strId: "PENDIENTE", strTexto: "Ausentes" },
  { strId: "INGRESO", strTexto: "Ingresaron" },
  { strId: "RETIRADO", strTexto: "Expulsados" },
  { strId: "INHABILITADO", strTexto: "Inhabilitados" },
];

function estadoDe(f) {
  const str = String(f.estado || "").toUpperCase();
  if (str === "INGRESO") return "INGRESO";
  if (str === "INHABILITADO") return "INHABILITADO";
  if (str === "RETIRADO") return "RETIRADO";
  return "PENDIENTE";
}

const claveDe = (f) => String(f.ci ?? f.sis ?? `${f.apellidos} ${f.nombres}`);
const hhmm = (v) => (v ? String(v).slice(0, 5) : "");

function textoHace(numSegundos) {
  if (numSegundos < 60) return `hace ${numSegundos} s`;
  return `hace ${Math.floor(numSegundos / 60)} min`;
}

export default function PanelListaOficial({ boolAbierto, onCerrar, idExamen, numVersion, strUltimoRegistrado, boolFinalizado = false }) {
  const [strBuscar, setStrBuscar] = useState("");
  const [strFiltro, setStrFiltro] = useState("TODOS");
  const [listFilas, setListFilas] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);
  const [strError, setStrError] = useState("");
  const [dateActualizado, setDateActualizado] = useState(null);
  const [dateAhora, setDateAhora] = useState(() => new Date());
  const [objNuevos, setObjNuevos] = useState({}); // clave → hora en que se marcó como nuevo
  const refEstados = useRef(null); // estados de la última carga (para detectar ingresos nuevos)

  // Al abrir: filtro "Todos", buscador vacío y sin datos viejos
  useEffect(() => {
    if (!boolAbierto) return;
    setStrBuscar("");
    setStrFiltro("TODOS");
    setStrError("");
    setObjNuevos({});
    refEstados.current = null;
  }, [boolAbierto, idExamen]);

  // Carga inicial, recarga cada 10 s (mientras el examen no terminó) y cuando hay un ingreso nuevo
  useEffect(() => {
    if (!boolAbierto || idExamen == null) return undefined;
    let boolVivo = true;

    const fnCargar = () => {
      setBoolCargando(true);
      obtenerListaOficial(idExamen, "")
        .then((list) => {
          if (!boolVivo) return;
          const listDatos = Array.isArray(list) ? list : [];
          // Ingresos nuevos desde la carga anterior (no se marcan en la primera carga)
          const objAntes = refEstados.current;
          const objAhora = {};
          const listNuevos = [];
          for (const f of listDatos) {
            const strClave = claveDe(f);
            objAhora[strClave] = estadoDe(f);
            if (objAntes && objAhora[strClave] === "INGRESO" && objAntes[strClave] !== "INGRESO") listNuevos.push(strClave);
          }
          refEstados.current = objAhora;
          if (listNuevos.length) {
            const numAhora = Date.now();
            setObjNuevos((o) => ({ ...o, ...Object.fromEntries(listNuevos.map((k) => [k, numAhora])) }));
          }
          setListFilas(listDatos);
          setStrError("");
          setDateActualizado(new Date());
        })
        .catch(() => {
          if (boolVivo) setStrError("No se pudo cargar la lista. Revisa tu conexión e intenta de nuevo.");
        })
        .finally(() => boolVivo && setBoolCargando(false));
    };

    fnCargar();
    const t = boolFinalizado ? null : setInterval(fnCargar, INTERVALO_MS);
    return () => { boolVivo = false; if (t) clearInterval(t); };
  }, [boolAbierto, idExamen, numVersion, boolFinalizado]);

  // Reloj para "actualizado hace X s" y para quitar la marca "NUEVO"
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const t = setInterval(() => setDateAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, [boolAbierto]);

  useEffect(() => {
    const numAhora = dateAhora.getTime();
    const listVencidos = Object.entries(objNuevos).filter(([, numDesde]) => numAhora - numDesde > DURACION_NUEVO_MS);
    if (listVencidos.length) {
      setObjNuevos((o) => {
        const objCopia = { ...o };
        for (const [k] of listVencidos) delete objCopia[k];
        return objCopia;
      });
    }
  }, [dateAhora, objNuevos]);

  // Cerrar con Esc
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const fnTecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, onCerrar]);

  const listOrdenadas = useMemo(
    () => [...listFilas].sort((a, b) => nombreEstudiante(a).localeCompare(nombreEstudiante(b), "es")),
    [listFilas]
  );

  if (!boolAbierto) return null;

  const strTermino = strBuscar.trim().toLowerCase();
  const listBuscadas = strTermino
    ? listOrdenadas.filter((f) => `${f.apellidos || ""} ${f.nombres || ""} ${f.ci || ""} ${f.sis || ""}`.toLowerCase().includes(strTermino))
    : listOrdenadas;

  const objConteo = {
    TODOS: listBuscadas.length,
    PENDIENTE: listBuscadas.filter((f) => estadoDe(f) === "PENDIENTE").length,
    INGRESO: listBuscadas.filter((f) => estadoDe(f) === "INGRESO").length,
    INHABILITADO: listBuscadas.filter((f) => estadoDe(f) === "INHABILITADO").length,
    RETIRADO: listBuscadas.filter((f) => estadoDe(f) === "RETIRADO").length,
  };
  const listVisibles = strFiltro === "TODOS" ? listBuscadas : listBuscadas.filter((f) => estadoDe(f) === strFiltro);
  const numSegundos = dateActualizado ? Math.max(0, Math.round((dateAhora - dateActualizado) / 1000)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(8,38,74,.45)]" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="ci-t-lista" className="ci-deslizar h-full w-[min(540px,100vw)] bg-white overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-[22px] pt-[22px]">
          <div>
            <h2 id="ci-t-lista" className="m-0 text-[19px] font-bold text-[#08264A]">Lista oficial del aula</h2>
            <p className="mt-1 text-[13px] text-[#64748B]">Estudiantes que ingresaron y que faltan, en tiempo real</p>
            {/* Mismo indicador que "Últimos ingresos" */}
            {boolFinalizado ? (
              <span className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F1F5F9] text-[#475569] text-xs font-extrabold">
                <i className="w-2 h-2 rounded-full bg-[#94A3B8]" /> Examen finalizado
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003770] text-white text-xs font-extrabold">
                <i className="w-2 h-2 rounded-full bg-[#7DD3FC] shadow-[0_0_0_4px_rgba(125,211,252,.25)] animate-pulse" />
                En vivo{dateActualizado ? ` · actualizado ${textoHace(numSegundos)}` : ""}
              </span>
            )}
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
                  {textoInterfaz(f.strTexto)} ({objConteo[f.strId]})
                </button>
              );
            })}
          </div>

          {strError && (
            <div role="alert" className="mb-3 px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{textoInterfaz(strError)}</div>
          )}

          <ul className="m-0 p-0 list-none border border-[#CBD5E1] rounded-xl overflow-hidden">
            {boolCargando && listFilas.length === 0 && !strError && (
              <li className="text-center text-sm text-[#64748B] px-[18px] py-7">Cargando lista…</li>
            )}

            {!boolCargando && !strError && listVisibles.length === 0 && (
              <li className="text-center text-sm text-[#64748B] px-[18px] py-7">
                {textoInterfaz(listBuscadas.length === 0 ? "Sin coincidencias en la lista." : "No hay estudiantes con este estado.")}
              </li>
            )}

            <ReporteLista titulo="Lista oficial de estudiantes" contenido={() => <>{listVisibles.map((f) => {
              const strEstado = estadoDe(f);
              const objEstado = ESTADOS[strEstado];
              const strClave = claveDe(f);
              const boolNuevo = Boolean(objNuevos[strClave]);
              const strMotivo = f.observacion || f.observacionHabilitacion || "";
              return (
                <li
                  key={strClave}
                  className={
                    "grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0 transition-colors " +
                    (boolNuevo || f.ci === strUltimoRegistrado ? "bg-[#F0F6FC]" : "")
                  }
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#08264A]">
                      {nombreEstudiante(f)}
                      {boolNuevo && <span className="ml-2 text-[10px] font-extrabold text-[#1860A3]">Nuevo</span>}
                    </div>
                    <div className="mt-px text-xs text-[#64748B]">SIS {f.sis} · C.i. {f.ci}</div>
                    {strEstado === "INHABILITADO" && (
                      <div className="mt-1 text-xs text-[#B91C1C]">Motivo: {textoInterfaz(strMotivo ? strMotivo.charAt(0).toLocaleUpperCase("es") + strMotivo.slice(1) : "sin motivo especificado")}</div>
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
              const strClave = claveDe(f);
              const boolNuevo = Boolean(objNuevos[strClave]);
              const strMotivo = f.observacion || f.observacionHabilitacion || "";
              return (
                <li
                  key={strClave}
                  className={
                    "grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0 transition-colors " +
                    (boolNuevo || f.ci === strUltimoRegistrado ? "bg-[#F0F6FC]" : "")
                  }
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#08264A]">
                      {nombreEstudiante(f)}
                      {boolNuevo && <span className="ml-2 text-[10px] font-extrabold text-[#1860A3]">Nuevo</span>}
                    </div>
                    <div className="mt-px text-xs text-[#64748B]">SIS {f.sis} · C.i. {f.ci}</div>
                    {strEstado === "INHABILITADO" && (
                      <div className="mt-1 text-xs text-[#B91C1C]">Motivo: {textoInterfaz(strMotivo ? strMotivo.charAt(0).toLocaleUpperCase("es") + strMotivo.slice(1) : "sin motivo especificado")}</div>
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
      </aside>
    </div>
  );
}
