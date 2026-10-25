// Lista del ayudante (panel lateral, solo lectura).
// - Con internet: "Lista oficial" → toda SU aula (todas las letras), con los datos del servidor.
// - Sin internet: "Mi lista" → solo SU rango de apellidos, con la nómina descargada en el equipo.
// En ambos casos se suman los registros de este equipo que aún no se sincronizaron.
// Si con internet el servidor no responde, se usa la nómina descargada (toda el aula).
// Solo LEE la base local; no modifica nada del modo sin conexión.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { obtenerListaOficial } from "../../../../services/ingresoService";
import { db } from "../../../../offline/db.js";
import { ESTADO_SYNC } from "../../../../offline/constantes.js";

const ESTADOS = {
  INGRESO: { strTexto: "Ingreso registrado", strClase: "bg-[#D9E8F7] text-[#124B83]" },
  SIN_SINCRONIZAR: { strTexto: "Registrado · sin sincronizar", strClase: "bg-[#FEF3C7] text-[#92400E]" },
  PENDIENTE: { strTexto: "Sin registrar", strClase: "bg-[#F1F5F9] text-[#475569]" },
  INHABILITADO: { strTexto: "Inhabilitado", strClase: "bg-[#FEE2E2] text-[#B91C1C]" },
};

const FILTROS = [
  { strId: "TODOS", strTexto: "Todos" },
  { strId: "PENDIENTE", strTexto: "Sin registrar" },
  { strId: "INGRESO", strTexto: "Ingreso registrado" },
  { strId: "INHABILITADO", strTexto: "Inhabilitados" },
];

// Misma regla que el motor sin conexión: primera letra, sin tildes, en mayúscula
function inicial(strTexto) {
  return String(strTexto || "").trim().charAt(0).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

function enRango(strApellido, objFila) {
  if (!objFila?.desde || !objFila?.hasta) return true; // sin rango: toda el aula
  const strLetra = inicial(strApellido);
  if (!strLetra) return true;
  return strLetra.localeCompare(inicial(objFila.desde), "es") >= 0 && strLetra.localeCompare(inicial(objFila.hasta), "es") <= 0;
}

function normalizarAula(strAula) {
  return String(strAula || "").trim().replace(/^aula\s*/i, "").toLowerCase();
}

function enAula(strAulaEstudiante, strAulaExamen) {
  if (!strAulaEstudiante || !strAulaExamen) return true; // sin aula asignada: no se descarta
  return normalizarAula(strAulaEstudiante) === normalizarAula(strAulaExamen);
}

// La nómina local guarda "Nombres Apellidos" en un solo campo: se separa con el apellido paterno
function separarNombreLocal(r) {
  const strNombre = String(r.nombre || "").trim();
  const strPaterno = String(r.apellidoPaterno || "").trim();
  const numPos = strPaterno ? strNombre.toLowerCase().indexOf(strPaterno.toLowerCase()) : -1;
  if (numPos > 0) {
    return { apellidos: strNombre.slice(numPos).trim(), nombres: strNombre.slice(0, numPos).trim() };
  }
  return { apellidos: strNombre, nombres: "" };
}

function estadoServidor(strEstado) {
  const str = String(strEstado || "").toUpperCase();
  if (str === "INGRESO") return "INGRESO";
  if (str === "INHABILITADO") return "INHABILITADO";
  return "PENDIENTE";
}

async function leerPendientesLocales(exId) {
  const set = new Set();
  try {
    const list = await db.asistencias_pendientes.where("examenId").equals(exId).toArray();
    list
      .filter((a) => a.syncStatus === ESTADO_SYNC.PENDIENTE || a.syncStatus === ESTADO_SYNC.SYNCING || a.syncStatus === ESTADO_SYNC.ERROR)
      .forEach((a) => set.add(String(a.codigoSis)));
  } catch {
    // sin base local: no hay pendientes que mostrar
  }
  return set;
}

async function leerNominaLocal(exId, setPendientes) {
  const list = await db.nominas.where("examenId").equals(exId).toArray();
  return list.map((r) => {
    const sis = String(r.codigoSis || "");
    let strEstado = "PENDIENTE";
    if (!r.habilitado) strEstado = "INHABILITADO";
    else if (setPendientes.has(sis)) strEstado = "SIN_SINCRONIZAR";
    else if (r.marcadoLocal === 1) strEstado = "INGRESO";
    return {
      ...separarNombreLocal(r),
      paterno: r.apellidoPaterno || "",
      sis,
      ci: r.ci || "",
      aula: r.aulaAsignada || null,
      estado: strEstado,
    };
  });
}

function fechaHora(valor) {
  if (!valor) return "";
  try {
    return new Date(valor).toLocaleString("es-BO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function PanelMiLista({ boolAbierto, onCerrar, examen, boolSinRed, numVersion, numPendientes, strUltimoRegistrado, strNominaDescargadaEn }) {
  const [strBuscar, setStrBuscar] = useState("");
  const [strFiltro, setStrFiltro] = useState("TODOS");
  const [listFilas, setListFilas] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);
  const [strOrigen, setStrOrigen] = useState("servidor"); // servidor | local | sinNomina

  const exId = Number(examen?.idexamen);
  const objFila = examen?.fila || null;
  const strAula = examen?.aula || "";

  useEffect(() => {
    if (!boolAbierto || !Number.isInteger(exId) || exId <= 0) return undefined;
    let boolVivo = true;
    setBoolCargando(true);

    (async () => {
      const setPendientes = await leerPendientesLocales(exId);
      let list = null;
      let strFuente = "servidor";

      if (!boolSinRed) {
        try {
          const resp = await obtenerListaOficial(exId, "");
          if (Array.isArray(resp)) {
            list = resp.map((f) => {
              const sis = String(f.sis ?? f.codigoSis ?? "");
              let strEstado = estadoServidor(f.estado);
              if (strEstado === "PENDIENTE" && setPendientes.has(sis)) strEstado = "SIN_SINCRONIZAR";
              return {
                apellidos: f.apellidos || "",
                nombres: f.nombres || "",
                paterno: String(f.apellidos || "").trim().split(/\s+/)[0] || "",
                sis,
                ci: f.ci || "",
                aula: f.aulaAsignada || null,
                estado: strEstado,
              };
            });
          }
        } catch {
          list = null;
        }
      }

      if (!list) {
        try {
          list = await leerNominaLocal(exId, setPendientes);
          strFuente = list.length ? "local" : "sinNomina";
        } catch {
          list = [];
          strFuente = "sinNomina";
        }
      }

      const listMias = list
        // El rango de apellidos solo se aplica sin internet
        .filter((f) => enAula(f.aula, strAula) && (!boolSinRed || enRango(f.paterno || f.apellidos, objFila)))
        .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es"));

      if (boolVivo) {
        setListFilas(listMias);
        setStrOrigen(strFuente);
      }
    })().finally(() => boolVivo && setBoolCargando(false));

    return () => { boolVivo = false; };
  }, [boolAbierto, exId, boolSinRed, numVersion, numPendientes, strAula, objFila?.desde, objFila?.hasta]);

  // Cerrar con Esc
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const fnTecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, onCerrar]);

  if (!boolAbierto) return null;

  const strTermino = strBuscar.trim().toLowerCase();
  const listBuscadas = strTermino
    ? listFilas.filter((f) => `${f.apellidos} ${f.nombres} ${f.sis} ${f.ci}`.toLowerCase().includes(strTermino))
    : listFilas;

  const fnEsIngreso = (f) => f.estado === "INGRESO" || f.estado === "SIN_SINCRONIZAR";
  const objConteo = {
    TODOS: listBuscadas.length,
    PENDIENTE: listBuscadas.filter((f) => f.estado === "PENDIENTE").length,
    INGRESO: listBuscadas.filter(fnEsIngreso).length,
    INHABILITADO: listBuscadas.filter((f) => f.estado === "INHABILITADO").length,
  };
  const listVisibles = strFiltro === "TODOS"
    ? listBuscadas
    : strFiltro === "INGRESO"
      ? listBuscadas.filter(fnEsIngreso)
      : listBuscadas.filter((f) => f.estado === strFiltro);

  const strAulaTexto = String(strAula).replace(/^aula\s*/i, "").trim();
  const listChips = [
    strAulaTexto ? `Aula ${strAulaTexto}` : null,
    boolSinRed && objFila?.desde && objFila?.hasta ? `Apellidos ${objFila.desde}–${objFila.hasta}` : "Toda el aula",
    `${listFilas.length} estudiantes`,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(8,38,74,.45)]" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="ci-t-milista" className="ci-deslizar h-full w-[min(540px,100vw)] bg-white overflow-y-auto flex flex-col">
        <div className="flex items-start justify-between gap-3 px-[22px] pt-[22px]">
          <div>
            <h2 id="ci-t-milista" className="m-0 text-[19px] font-bold text-[#08264A]">{boolSinRed ? "Mi lista" : "Lista oficial"}</h2>
            <p className="mt-1 text-[13px] text-[#64748B]">{boolSinRed ? "Estudiantes que te toca registrar" : "Estado de ingreso de los estudiantes del aula"}</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-[#003770] hover:bg-[#F1F5F9] cursor-pointer">
            <X className="w-[22px] h-[22px]" />
          </button>
        </div>

        <div className="px-[22px] pt-3 flex flex-wrap gap-2">
          {listChips.map((str) => (
            <span key={str} className="px-2.5 py-1 rounded-full bg-[#E8F1FB] text-[#124B83] text-xs font-bold">{str}</span>
          ))}
        </div>

        <div className="px-[22px] pt-4 pb-6 flex-1">
          {strOrigen === "local" && (
            <div className="mb-3 px-3.5 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FEE2E2] text-[13px] text-[#B91C1C]">
              <b className="font-bold">{boolSinRed ? "Sin conexión" : "No se pudo cargar del servidor"}</b>:{" "}
              {boolSinRed && objFila?.desde && objFila?.hasta ? `solo tu rango ${objFila.desde}–${objFila.hasta}, con ` : "se muestra "}
              la nómina descargada{strNominaDescargadaEn ? ` (${fechaHora(strNominaDescargadaEn)})` : ""} y tus registros de este equipo.
            </div>
          )}

          {strOrigen === "sinNomina" && !boolCargando ? (
            <div className="px-4 py-6 rounded-xl border border-[#CBD5E1] text-center text-sm text-[#475569]">
              Descarga la nómina con internet para ver tu lista sin conexión.
            </div>
          ) : (
            <>
              <label htmlFor="ci-buscar-mia" className="sr-only">Buscar en mi lista</label>
              <input
                id="ci-buscar-mia"
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
                    {listBuscadas.length === 0 ? "Sin coincidencias en la lista." : "No hay estudiantes con este estado."}
                  </li>
                )}

                {listVisibles.map((f) => {
                  const objEstado = ESTADOS[f.estado] || ESTADOS.PENDIENTE;
                  const boolUltimo = strUltimoRegistrado && (f.ci === strUltimoRegistrado || f.sis === strUltimoRegistrado);
                  return (
                    <li
                      key={f.sis || f.ci}
                      className={"grid grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0 " + (boolUltimo ? "bg-[#F0F6FC]" : "")}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#08264A]">{f.apellidos} {f.nombres}</div>
                        <div className="mt-px text-xs text-[#64748B]">SIS {f.sis}{f.ci ? ` · C.I. ${f.ci}` : ""}</div>
                      </div>
                      <span className={"justify-self-end px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap " + objEstado.strClase}>
                        {objEstado.strTexto}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="px-[22px] py-3 border-t border-[#E2E8F0] text-xs text-[#64748B]">
          Solo lectura · El registro se hace desde Verificación de ingreso
        </div>
      </aside>
    </div>
  );
}
