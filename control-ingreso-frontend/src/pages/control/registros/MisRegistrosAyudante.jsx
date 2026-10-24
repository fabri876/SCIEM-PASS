// "Mis registros" del ayudante: los ingresos que registró en todos sus exámenes.
// - Sincronizados: los trae el backend (últimos ingresos de cada examen, solo los suyos).
// - Sin sincronizar: los registrados sin internet que siguen en la cola local de Yuri (HU07); solo se leen.
// Nota: hasta que el backend tenga un endpoint propio (p. ej. /api/v1/control/mis-registros),
// se pide examen por examen con un límite alto.
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { obtenerExamenesAsignados, obtenerUltimosIngresos } from "../../../services/ingresoService";
import { obtenerUsuarioActual } from "../../../services/authService";
import { db } from "../../../offline/db.js";
import { textoAula } from "../utilidadesAyudante";

const LIMITE_POR_EXAMEN = 500;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ESTADOS_PENDIENTES = ["pendiente", "syncing", "error"];

const dosDigitos = (n) => String(n).padStart(2, "0");

// "2026-10-24" → "24 oct"
function fechaCorta(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : "";
}

function textoMetodo(strMetodo) {
  const str = String(strMetodo || "").toUpperCase();
  return str === "QR" || str === "ESCANEO" ? "QR" : "Manual";
}

// "MARIA PEREZ" → "Maria Perez" (solo si viene todo en mayúsculas)
function nombreNormal(strNombre) {
  const str = String(strNombre || "").trim();
  if (!str || str !== str.toUpperCase()) return str;
  return str.toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase());
}

async function cargarRegistros() {
  const listExamenes = await obtenerExamenesAsignados();
  const listFilas = [];

  // 1. Sincronizados (backend)
  const listRespuestas = await Promise.all(
    listExamenes.map((ex) => obtenerUltimosIngresos(ex.idexamen, LIMITE_POR_EXAMEN, ex, true).catch(() => null))
  );
  listRespuestas.forEach((listIngresos, i) => {
    const ex = listExamenes[i];
    (listIngresos || []).forEach((r, j) => {
      listFilas.push({
        clave: `s-${ex.id}-${j}-${r.estudiante?.ci}`,
        idExamen: ex.id,
        strFecha: String(ex.fecha || "").slice(0, 10),
        strHora: r.hora || "",
        estudiante: { nombre: nombreNormal(`${r.estudiante?.nombres || ""} ${r.estudiante?.apellidos || ""}`), ci: r.estudiante?.ci, sis: r.estudiante?.sis },
        examen: ex,
        strMetodo: r.metodo || "Manual",
        boolSincronizado: true,
      });
    });
  });

  // 2. Sin sincronizar (cola local del modo sin conexión)
  try {
    const usuario = obtenerUsuarioActual();
    const idUsuario = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id;
    const listPendientes = (await db.asistencias_pendientes.toArray())
      .filter((a) => ESTADOS_PENDIENTES.includes(String(a.syncStatus || "").toLowerCase()))
      .filter((a) => idUsuario == null || a.operadorId == null || String(a.operadorId) === String(idUsuario));
    for (const a of listPendientes) {
      const ex = listExamenes.find((e) => Number(e.idexamen) === Number(a.examenId)) || null;
      const est = await db.nominas.get([Number(a.examenId), a.codigoSis]).catch(() => null);
      const date = new Date(a.timestampLocal);
      const boolFecha = !Number.isNaN(date.getTime());
      listFilas.push({
        clave: `p-${a.clientUuid}`,
        idExamen: ex?.id ?? null,
        strFecha: boolFecha ? `${date.getFullYear()}-${dosDigitos(date.getMonth() + 1)}-${dosDigitos(date.getDate())}` : "",
        strHora: boolFecha ? `${dosDigitos(date.getHours())}:${dosDigitos(date.getMinutes())}:${dosDigitos(date.getSeconds())}` : "",
        estudiante: { nombre: nombreNormal(est?.nombre || ""), ci: est?.ci || "", sis: a.codigoSis },
        examen: ex,
        strMetodo: textoMetodo(a.metodo),
        boolSincronizado: false,
      });
    }
  } catch { /* sin cola local: solo se muestran los sincronizados */ }

  // Del más reciente al más antiguo
  listFilas.sort((x, y) => `${y.strFecha}T${y.strHora}`.localeCompare(`${x.strFecha}T${x.strHora}`));
  return { listExamenes, listFilas };
}

export default function MisRegistrosAyudante() {
  const [listExamenes, setListExamenes] = useState([]);
  const [listFilas, setListFilas] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [strExamen, setStrExamen] = useState("");
  const [strBuscar, setStrBuscar] = useState("");

  useEffect(() => {
    let boolVivo = true;
    cargarRegistros()
      .then((r) => { if (boolVivo) { setListExamenes(r.listExamenes); setListFilas(r.listFilas); } })
      .catch((e) => boolVivo && setStrError(e.message || "No se pudieron cargar tus registros."))
      .finally(() => boolVivo && setBoolCargando(false));
    return () => { boolVivo = false; };
  }, []);

  const listVisibles = useMemo(() => {
    const strTermino = strBuscar.trim().toLowerCase();
    return listFilas
      .filter((f) => !strExamen || f.idExamen === strExamen)
      .filter((f) => !strTermino || `${f.estudiante.nombre} ${f.estudiante.ci} ${f.estudiante.sis}`.toLowerCase().includes(strTermino));
  }, [listFilas, strExamen, strBuscar]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1A365D]">Mis registros</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Los ingresos que registraste en tus exámenes.</p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <select
          value={strExamen}
          onChange={(e) => setStrExamen(e.target.value)}
          aria-label="Filtrar por examen"
          className="h-9 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 px-3 max-w-[280px] cursor-pointer max-md:w-full max-md:max-w-none"
        >
          <option value="">Examen: todos</option>
          {listExamenes.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.materia} · {ex.tipo}{ex.fecha ? ` · ${fechaCorta(ex.fecha)}` : ""}</option>
          ))}
        </select>
        <label className="relative w-[300px] max-md:w-full">
          <span className="sr-only">Buscar estudiante</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={strBuscar}
            onChange={(e) => setStrBuscar(e.target.value)}
            placeholder="Buscar por nombre, C.I. o SIS"
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-700 outline-none focus:border-[#1860A3]"
          />
        </label>
        {!boolCargando && (
          <span className="ml-auto text-xs font-bold text-slate-500 max-md:ml-0">
            {listVisibles.length} {listVisibles.length === 1 ? "registro" : "registros"}
          </span>
        )}
      </div>

      {strError && <div role="alert" className="px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strError}</div>}

      <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="bg-[#E8F1FB] text-left text-[10.5px] font-extrabold tracking-[.5px] text-[#124B83]">
                <th className="px-4 py-2.5">FECHA Y HORA</th>
                <th className="px-3 py-2.5">ESTUDIANTE</th>
                <th className="px-3 py-2.5">EXAMEN</th>
                <th className="px-3 py-2.5">MÉTODO</th>
                <th className="px-4 py-2.5 text-right">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {boolCargando ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs font-semibold text-slate-500 animate-pulse">Cargando registros…</td></tr>
              ) : listVisibles.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs font-semibold text-slate-500">
                  {listFilas.length === 0 ? "Todavía no registraste ingresos." : "Ningún registro coincide con la búsqueda."}
                </td></tr>
              ) : (
                listVisibles.map((f, i) => (
                  <tr key={f.clave} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                    <td className="px-4 py-2.5 border-t border-[#E2E8F0] whitespace-nowrap">
                      <b className="text-[#08264A]">{fechaCorta(f.strFecha)}</b>
                      <span className="text-slate-600">{f.strHora ? ` · ${f.strHora.slice(0, 5)}` : ""}</span>
                    </td>
                    <td className="px-3 py-2.5 border-t border-[#E2E8F0]">
                      <div className="font-bold text-[#08264A]">{f.estudiante.nombre || "—"}</div>
                      <div className="text-xs text-slate-500">{[f.estudiante.sis && `SIS ${f.estudiante.sis}`, f.estudiante.ci && `C.I. ${f.estudiante.ci}`].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-3 py-2.5 border-t border-[#E2E8F0]">
                      <div className="text-[#08264A]">{f.examen?.materia || "—"}</div>
                      <div className="text-xs text-slate-500">{[f.examen?.tipo, textoAula(f.examen?.aula)].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-3 py-2.5 border-t border-[#E2E8F0] text-slate-700">{f.strMetodo}</td>
                    <td className="px-4 py-2.5 border-t border-[#E2E8F0] text-right">
                      {f.boolSincronizado ? (
                        <span className="inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#E8F1FB] text-[#1860A3]">Sincronizado</span>
                      ) : (
                        <span className="inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C]">Sin sincronizar</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
