// "Mis exámenes": los 3 más relevantes como tarjetas + "Ver todos" con la lista completa
import { useMemo, useState } from "react";
import { GraduationCap, Clock, ArrowLeft, Search, Download, RefreshCw, CheckCircle } from "lucide-react";
import PildoraFila from "./PildoraFila";
import { useNominaLocal, useConectividad, sincronizarAhora } from "../../../../offline";

const ESTADOS = {
  EN_CURSO: { strTexto: "En curso", strClase: "bg-[#F0F6FC] text-[#1860A3]", strPunto: "bg-[#267BC2] animate-pulse" },
  PROXIMO: { strTexto: "Próximo", strClase: "bg-[#F1F5F9] text-[#475569]", strPunto: "bg-[#9AA8BA]" },
  FINALIZADO: { strTexto: "Finalizado", strClase: "bg-[#F1F5F9] text-[#64748B]", strPunto: "bg-[#CBD5E1]" },
};

const NUM_DESTACADOS = 3;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// "2026-10-05" → "Hoy", "Mañana" o "lun 5 oct"
function formatearFecha(strFecha) {
  const m = strFecha ? String(strFecha).match(/(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dif = Math.round((d - hoy) / 86400000);
  if (dif === 0) return "Hoy";
  if (dif === 1) return "Mañana";
  if (dif === -1) return "Ayer";
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

const claveTiempo = (e) => `${e.fecha || ""}T${e.horaInicio || ""}`;

// En curso → próximos (el más cercano primero) → finalizados (el más reciente primero)
function ordenarPorRelevancia(list) {
  const enCurso = list.filter((e) => e.estado === "EN_CURSO").sort((a, b) => claveTiempo(a).localeCompare(claveTiempo(b)));
  const proximos = list.filter((e) => e.estado === "PROXIMO").sort((a, b) => claveTiempo(a).localeCompare(claveTiempo(b)));
  const finalizados = list.filter((e) => e.estado === "FINALIZADO").sort((a, b) => claveTiempo(b).localeCompare(claveTiempo(a)));
  return { enCurso, proximos, finalizados, todos: [...enCurso, ...proximos, ...finalizados] };
}

function Chip({ strClase, numValor, strEtiqueta }) {
  return (
    <span className={"inline-flex items-baseline gap-[7px] px-3 py-1.5 rounded-lg text-xs font-medium max-md:flex-col max-md:items-start max-md:gap-0 max-md:px-2.5 max-md:text-[11px] " + strClase}>
      <b className="text-base font-bold">{numValor}</b>{strEtiqueta}
    </span>
  );
}

// Tarjeta rectangular de un examen (mismo estilo que la tarjeta del examen elegido)
/* ---------- Modo sin conexión: nómina de cada examen ----------
   El estado y la descarga vienen del motor offline (HU07) mediante useNominaLocal,
   que lee la nómina descargada en el dispositivo y expone el progreso de descarga. */
function EstadoNomina({ examen, objNomina, boolSinRed, fnDescargarNomina }) {
  const [toast, setToast] = useState(null);
  const [forzando, setForzando] = useState(false);

  const mostrarToast = (msg, tipo = "info") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const handleForzar = async () => {
    if (forzando) return;
    setForzando(true);
    mostrarToast("Iniciando sincronización forzada…", "info");
    try {
      const res = await sincronizarAhora();
      if (res?.sinConexion) mostrarToast("No se pudo sincronizar: sin conexión", "info");
      else if (res?.omitido) mostrarToast("Ya hay una sincronización en curso", "info");
      else mostrarToast(`Sincronización completada: ${res?.enviados ?? 0} marcas enviadas`, "ok");
    } catch (e) {
      mostrarToast("Error al sincronizar: " + (e?.message || "desconocido"), "info");
    } finally {
      setForzando(false);
    }
  };

  const strEstado = objNomina?.estado || "ninguna";

  if (strEstado === "lista") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D9E8F7] text-[#124B83]">
          <CheckCircle className="w-3.5 h-3.5" />
          Disponible sin internet{objNomina.total ? ` · ${objNomina.total} estudiantes` : ""}
        </span>
        <button
          type="button"
          onClick={handleForzar}
          disabled={forzando}
          className="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-lg bg-[#003770] hover:bg-[#124B83] disabled:bg-[#9AA8BA] text-white text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${forzando ? "animate-spin" : ""}`} /> Forzar
        </button>
        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-xs font-semibold shadow-lg animate-slide-up ${toast.tipo === "ok" ? "bg-[#267BC2] text-white" : "bg-[#1860A3] text-white"
            }`}>
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  if (strEstado === "descargando") {
    const numPct = objNomina.porcentaje ?? 0;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-xs text-[#475569]">
          <span className="w-24 h-[6px] rounded-full bg-[#F1F5F9] overflow-hidden">
            <i className="block h-full bg-[#003770] rounded-full transition-[width] duration-500" style={{ width: numPct + "%" }} />
          </span>
          {boolSinRed ? "Descarga en pausa" : "Descargando nómina…"} {numPct} %
        </span>
        <button
          type="button"
          onClick={handleForzar}
          disabled={forzando || boolSinRed}
          className="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-lg bg-[#003770] hover:bg-[#124B83] disabled:bg-[#9AA8BA] text-white text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${forzando ? "animate-spin" : ""}`} /> Forzar
        </button>
      </div>
    );
  }

  if (boolSinRed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#B91C1C]">
          Sin nómina · requiere conexión
        </span>
        <button
          type="button"
          onClick={handleForzar}
          disabled={forzando}
          className="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-lg bg-[#003770] hover:bg-[#124B83] disabled:bg-[#9AA8BA] text-white text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${forzando ? "animate-spin" : ""}`} /> Forzar
        </button>
      </div>
    );
  }

  const boolConectado = typeof fnDescargarNomina === "function";
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => boolConectado && fnDescargarNomina(examen)}
        disabled={!boolConectado}
        title={boolConectado ? "" : "La descarga se habilita cuando se conecte con el modo sin conexión"}
        className="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-lg border border-[#CBD5E1] bg-white text-[#003770] text-xs font-semibold hover:border-[#003770] cursor-pointer disabled:text-[#9AA8BA] disabled:hover:border-[#CBD5E1] disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5" /> Descargar nómina
      </button>
      <button
        type="button"
        onClick={handleForzar}
        disabled={forzando}
        className="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-lg bg-[#003770] hover:bg-[#124B83] disabled:bg-[#9AA8BA] text-white text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${forzando ? "animate-spin" : ""}`} /> Forzar
      </button>
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-xs font-semibold shadow-lg animate-slide-up ${toast.tipo === "ok" ? "bg-[#267BC2] text-white" : "bg-[#1860A3] text-white"
          }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// "Modo sin conexión: …" de un examen (estado de la nómina + Forzar), tal como lo hizo Yuri (HU07).
// Se exporta para reutilizarlo en el Inicio y en "Mis exámenes" del ayudante.
export function FilaNominaSinConexion({ examen, boolSinRed }) {
  const nomina = useNominaLocal(examen.idexamen);
  const conn = useConectividad();
  const boolSinRedReal = boolSinRed ?? (conn.estado === "offline");
  const objNomina = {
    estado: nomina.descargando ? "descargando" : (nomina.estado.lista ? "lista" : "ninguna"),
    total: nomina.estado.totalLocal || 0,
    porcentaje: nomina.descargando
      ? (nomina.progreso?.porcentaje ?? 0)
      : (nomina.estado.lista ? 100 : 0),
  };
  const fnDescargarNomina = () => {
    nomina.descargar({ incluirFotos: false }).catch(() => { });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
      <span className="font-semibold text-[#475569]">Modo sin conexión:</span>
      <EstadoNomina examen={examen} objNomina={objNomina} boolSinRed={boolSinRedReal} fnDescargarNomina={fnDescargarNomina} />
    </div>
  );
}

function TarjetaExamenHoy({ examen, onElegir, boolSinRed }) {
  const nomina = useNominaLocal(examen.idexamen);
  const objNomina = {
    estado: nomina.descargando ? "descargando" : (nomina.estado.lista ? "lista" : "ninguna"),
    total: nomina.estado.totalLocal || 0,
    porcentaje: nomina.descargando
      ? (nomina.progreso?.porcentaje ?? 0)
      : (nomina.estado.lista ? 100 : 0),
  };
  const fnDescargarNomina = () => {
    nomina.descargar({ incluirFotos: false }).catch(() => { });
  };

  const c = examen.contador || {};
  const numIng = c.ingresaron ?? 0;
  const numHab = c.habilitados ?? 0;
  const numPct = numHab ? Math.min(100, (numIng / numHab) * 100) : 0;
  const objEstado = ESTADOS[examen.estado] || ESTADOS.PROXIMO;
  const boolFinalizado = examen.estado === "FINALIZADO";
  const objFila = examen.fila || null;
  const numOperadores = examen.filas?.length || 0;

  return (
    <article className={"bg-white border border-[#CBD5E1] rounded-xl px-[22px] py-[18px] max-md:p-4 " + (boolFinalizado ? "opacity-80" : "")}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3.5 min-w-0 flex-1 basis-[340px] max-md:basis-full">
          <span className={"w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 text-white " + (boolFinalizado ? "bg-[#CBD5E1]" : "bg-[#003770]")}>
            <GraduationCap className="w-[22px] h-[22px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="m-0 text-base font-bold text-[#08264A] leading-snug">{examen.tipo} · {examen.materia}</h3>
              <span className={"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold " + objEstado.strClase}>
                <i className={"w-[7px] h-[7px] rounded-full " + objEstado.strPunto} />
                {objEstado.strTexto}
              </span>
            </div>
            <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#64748B]">
              <span>Aula {examen.aula}{examen.grupo ? ` · Grupo ${examen.grupo}` : ""}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#9AA8BA]" />
                {formatearFecha(examen.fecha)}{examen.fecha ? " · " : ""}{examen.horaInicio} – {examen.horaFin}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 max-md:w-full max-md:grid max-md:grid-cols-3">
          <Chip strClase="bg-[#F0F6FC] text-[#1860A3]" numValor={numIng} strEtiqueta="Ingresaron" />
          <Chip strClase="bg-[#F1F5F9] text-[#475569]" numValor={c.pendientes ?? 0} strEtiqueta="Faltantes" />
          <Chip strClase="bg-[#FEF2F2] text-[#B91C1C]" numValor={c.inhabilitados ?? 0} strEtiqueta="Inhabilitados" />
        </div>

        <button
          type="button"
          onClick={() => onElegir(examen.id)}
          className={
            "min-h-[42px] px-5 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer max-md:w-full " +
            (boolFinalizado
              ? "border border-[#CBD5E1] bg-white text-[#003770] hover:border-[#003770]"
              : "bg-[#003770] hover:bg-[#124B83] text-white")
          }
        >
          {boolFinalizado ? "Ver ingresos" : "Registrar ingreso"}
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-4 text-xs text-[#64748B]">
        <span className="flex-1 h-[6px] bg-[#F1F5F9] rounded-full overflow-hidden">
          <i className="block h-full bg-[#003770] rounded-full transition-[width] duration-500" style={{ width: numPct + "%" }} />
        </span>
        <b className="text-[13px] font-bold text-[#08264A] whitespace-nowrap">{numIng} / {numHab} habilitados</b>
      </div>

      {(!boolFinalizado || objFila) && (
        <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 text-xs">
          {objFila ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 min-w-0">
              <PildoraFila objFila={objFila} />
              <span className="text-[#475569]">
                <b className="font-bold text-[#08264A]">{objFila.ingresaron ?? 0}</b> de {objFila.total ?? 0} de tus apellidos ya ingresaron
                {numOperadores > 1 && <span className="text-[#64748B]"> · {numOperadores} ayudantes en este examen</span>}
              </span>
            </div>
          ) : <span />}
          {!boolFinalizado && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-semibold text-[#475569]">Modo sin conexión:</span>
              <EstadoNomina
                examen={examen}
                objNomina={objNomina}
                boolSinRed={boolSinRed}
                fnDescargarNomina={fnDescargarNomina}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ---------- Fila compacta para "Ver todos" ---------- */
function FilaExamen({ examen, onElegir }) {
  const c = examen.contador || {};
  const boolFinalizado = examen.estado === "FINALIZADO";
  const objEstado = ESTADOS[examen.estado] || ESTADOS.PROXIMO;
  return (
    <li className="grid grid-cols-[110px_minmax(0,1fr)_90px_auto] gap-4 items-center px-[18px] py-3 border-t border-[#CBD5E1] first:border-t-0 max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:px-3.5">
      <div className="max-md:col-span-2 max-md:flex max-md:items-center max-md:gap-2">
        <div className="text-[13px] font-semibold text-[#08264A]">{formatearFecha(examen.fecha) || "—"}</div>
        <div className="text-xs text-[#64748B]">{examen.horaInicio} – {examen.horaFin}</div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#08264A] truncate">{examen.tipo} · {examen.materia}</div>
        <div className="mt-px text-xs text-[#64748B] truncate">
          Aula {examen.aula}{examen.grupo ? ` · Grupo ${examen.grupo}` : ""}{examen.fila ? ` · Sin internet: apellidos ${examen.fila.desde} – ${examen.fila.hasta}` : ""}
          <span className={"ml-2 inline-flex items-center gap-1 px-2 py-px rounded-full text-[11px] font-semibold " + objEstado.strClase}>
            <i className={"w-[6px] h-[6px] rounded-full " + objEstado.strPunto} />{objEstado.strTexto}
          </span>
        </div>
      </div>
      <div className="text-[13px] text-[#475569] max-md:hidden">
        <b className="font-bold text-[#08264A]">{c.ingresaron ?? 0}</b> / {c.habilitados ?? 0}
      </div>
      <button
        type="button"
        onClick={() => onElegir(examen.id)}
        className={
          "min-h-9 px-3.5 rounded-lg text-[13px] font-semibold whitespace-nowrap cursor-pointer " +
          (boolFinalizado
            ? "border border-[#CBD5E1] bg-white text-[#003770] hover:border-[#003770]"
            : "bg-[#003770] hover:bg-[#124B83] text-white")
        }
      >
        {boolFinalizado ? "Ver ingresos" : "Registrar ingreso"}
      </button>
    </li>
  );
}

function GrupoFilas({ strTitulo, list, onElegir }) {
  if (!list.length) return null;
  return (
    <div>
      <h3 className="m-0 mb-2 text-[13px] font-semibold uppercase tracking-[.4px] text-[#64748B]">
        {strTitulo} <span className="font-normal">({list.length})</span>
      </h3>
      <ul className="m-0 p-0 list-none bg-white border border-[#CBD5E1] rounded-xl overflow-hidden">
        {list.map((ex) => <FilaExamen key={ex.id} examen={ex} onElegir={onElegir} />)}
      </ul>
    </div>
  );
}

export default function ListaExamenesHoy({ listExamenes, boolCargando, onElegir, boolSinRed }) {
  const [boolVerTodos, setBoolVerTodos] = useState(false);
  const [strBuscar, setStrBuscar] = useState("");
  const conn = useConectividad();
  const boolSinRedReal = boolSinRed ?? (conn.estado === "offline");

  const objOrden = useMemo(() => ordenarPorRelevancia(listExamenes), [listExamenes]);
  const listDestacados = objOrden.todos.slice(0, NUM_DESTACADOS);
  const numTotal = listExamenes.length;

  // Filtro del buscador en "Ver todos"
  const strTermino = strBuscar.trim().toLowerCase();
  const fnFiltrar = (list) => !strTermino ? list
    : list.filter((e) => `${e.materia} ${e.tipo} ${e.aula} ${e.sigla || ""} ${e.grupo || ""}`.toLowerCase().includes(strTermino));
  const listEnCurso = fnFiltrar(objOrden.enCurso);
  const listProximos = fnFiltrar(objOrden.proximos);
  const listFinalizados = fnFiltrar(objOrden.finalizados);
  const boolSinResultados = !listEnCurso.length && !listProximos.length && !listFinalizados.length;

  if (boolVerTodos) {
    return (
      <section aria-labelledby="ci-t-todos" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => { setBoolVerTodos(false); setStrBuscar(""); }}
              className="inline-flex items-center gap-1.5 mb-1 text-[13px] font-medium text-[#1860A3] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <h2 id="ci-t-todos" className="m-0 text-base font-bold text-[#08264A]">Todos mis exámenes asignados</h2>
          </div>
          <label className="relative w-[280px] max-md:w-full">
            <span className="sr-only">Buscar examen</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA8BA]" />
            <input
              value={strBuscar}
              onChange={(e) => setStrBuscar(e.target.value)}
              placeholder="Buscar por materia o aula"
              className="w-full h-10 pl-9 pr-3 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#08264A] outline-none focus:border-[#1860A3] focus:shadow-[0_0_0_4px_#D9E8F7]"
            />
          </label>
        </div>

        <GrupoFilas strTitulo="En curso" list={listEnCurso} onElegir={onElegir} />
        <GrupoFilas strTitulo="Próximos" list={listProximos} onElegir={onElegir} />
        <GrupoFilas strTitulo="Finalizados" list={listFinalizados} onElegir={onElegir} />

        {boolSinResultados && (
          <div className="bg-white border border-dashed border-[#CBD5E1] rounded-xl px-5 py-8 text-center text-sm text-[#64748B]">
            Ningún examen coincide con «{strBuscar}».
          </div>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="ci-t-hoy">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="ci-t-hoy" className="m-0 text-base font-bold text-[#08264A]">Mis exámenes</h2>
        {!boolCargando && numTotal > NUM_DESTACADOS && (
          <button
            type="button"
            onClick={() => setBoolVerTodos(true)}
            className="text-[13px] font-semibold text-[#1860A3] hover:underline cursor-pointer"
          >
            Ver todos ({numTotal})
          </button>
        )}
        {!boolCargando && numTotal > 0 && numTotal <= NUM_DESTACADOS && (
          <span className="text-[13px] text-[#64748B]">{numTotal} {numTotal === 1 ? "asignado" : "asignados"}</span>
        )}
      </div>

      {boolCargando && (
        <div className="bg-white border border-[#CBD5E1] rounded-xl px-5 py-6 text-sm text-[#64748B]">Cargando exámenes…</div>
      )}

      {!boolCargando && numTotal === 0 && (
        <div className="bg-white border border-dashed border-[#CBD5E1] rounded-xl px-5 py-8 text-center">
          <p className="m-0 text-[15px] font-semibold text-[#08264A]">No tienes exámenes asignados</p>
          <p className="mt-1 text-[13px] text-[#64748B]">Cuando te asignen el control de un examen, aparecerá aquí.</p>
        </div>
      )}

      {listDestacados.length > 0 && (
        <div className="flex flex-col gap-3">
          {listDestacados.map((ex) => (
            <TarjetaExamenHoy
              key={ex.id}
              examen={ex}
              onElegir={onElegir}
              boolSinRed={boolSinRedReal}
            />
          ))}
        </div>
      )}
    </section>
  );
}
