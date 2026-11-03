// HU12: "Reportes y Asistencia" (docente y administrador).
// - Docente: elige una de SUS materias y un examen finalizado.
// - Administrador: elige primero el docente, luego una materia de ese docente y un examen finalizado.
// La vista previa (indicadores y tabla por aula) se calcula con la lista oficial del examen.
// El archivo PDF / Excel lo genera el backend (ver services/reporteService.js).
import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { obtenerExamenesFinalizadosDocente } from "../../services/examenService";
import { obtenerDocentesAdmin } from "../../services/adminNormasService";
import { obtenerListaOficial } from "../../services/ingresoService";
import { descargarReporteAsistencia } from "../../services/reporteService";
import { obtenerUsuarioActual } from "../../services/authService";
import { estadoExamen } from "../../pages/docente/utilidadesExamenDocente";
import { textoGrupoExamen } from "../examenes/textoGrupoExamen";

const SECCIONES = [
  { strId: "resumen", strTexto: "Resumen de cantidades" },
  { strId: "asistentes", strTexto: "Lista de asistentes" },
  { strId: "ausentes", strTexto: "Lista de ausentes" },
  { strId: "inhabilitados", strTexto: "Inhabilitados con motivo" },
];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const CLASE_SELECT =
  "w-full px-3.5 py-[10px] rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm font-semibold text-[#08264A] outline-none " +
  "focus:border-[#1860A3] focus:shadow-[0_0_0_4px_#D9E8F7] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed";
const CLASE_LABEL = "block text-xs font-extrabold text-[#334155] mb-1.5";

// ---------- Utilidades ----------

const hhmm = (v) => (v ? String(v).slice(0, 5) : "");

// Examen del backend con horario y aulas en el primer nivel (para estadoExamen y los textos)
function normalizarExamen(ex) {
  const listAmb = Array.isArray(ex.ambientes) ? ex.ambientes : [];
  return {
    ...ex,
    horaInicio: hhmm(ex.horaInicio || listAmb[0]?.horaInicio),
    horaFin: hhmm(ex.horaFin || listAmb[0]?.horaFin),
    listAulas: listAmb.map((a) => a.nombreAmbiente || a.nombreAula).filter(Boolean),
  };
}

function fechaCorta(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]}` : "";
}

function fechaLarga(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function textoTipo(ex) {
  return [ex.nombreTipoExamen, ex.detalleTipoExamen].filter(Boolean).join(" ") || "Examen";
}

function textoExamen(ex) {
  return [textoTipo(ex), textoGrupoExamen(ex.nombreGrupo ?? ex.grupo), fechaCorta(ex.fechaExamen)].filter(Boolean).join(" · ");
}

function nombreDocente(d) {
  return [d?.nombre, d?.apellido].filter(Boolean).join(" ").trim();
}

function nombreAula(strAula) {
  const str = String(strAula || "").trim();
  if (!str) return "Sin aula asignada";
  return /^aula/i.test(str) ? str : `Aula ${str}`;
}

// INGRESO | INHABILITADO | AUSENTE
function estadoFila(f) {
  const str = String(f.estado || "").toUpperCase();
  if (str === "INHABILITADO" || f.habilitado === false || f.estadoHabilitacion === false) return "INHABILITADO";
  if (str === "INGRESO") return "INGRESO";
  return "AUSENTE";
}

const porcentaje = (numParte, numTotal) => (numTotal > 0 ? Math.round((numParte * 100) / numTotal) : 0);

// Una fila por estudiante (sin duplicarlo entre aulas), con su estado y su aula
function prepararFilas(listLista) {
  const objVistos = new Map();
  for (const f of Array.isArray(listLista) ? listLista : []) {
    const strClave = String(f.sis ?? f.codigoSis ?? f.codSisEstudiante ?? f.ci ?? `${f.apellidos} ${f.nombres}`);
    if (objVistos.has(strClave)) continue;
    objVistos.set(strClave, {
      strClave,
      strNombre: `${f.apellidos || ""} ${f.nombres || ""}`.trim() || f.nombre || f.nombreEstudiante || "Sin nombre",
      strSis: f.sis ?? f.codigoSis ?? f.codSisEstudiante ?? "",
      strCi: f.ci ?? f.ciEstudiante ?? "",
      strAula: nombreAula(f.aulaAsignada),
      strEstado: estadoFila(f),
      strHora: hhmm(f.horaIngreso),
      strMotivo: f.observacion || f.observacionHabilitacion || "",
    });
  }
  return [...objVistos.values()].sort((a, b) => a.strNombre.localeCompare(b.strNombre, "es"));
}

function calcularResumen(listFilas) {
  const objTotal = { numInscritos: 0, numAsistentes: 0, numAusentes: 0, numInhabilitados: 0 };
  const objAulas = new Map();
  for (const f of listFilas) {
    if (!objAulas.has(f.strAula)) objAulas.set(f.strAula, { strAula: f.strAula, numInscritos: 0, numAsistentes: 0, numAusentes: 0, numInhabilitados: 0 });
    const objAula = objAulas.get(f.strAula);
    for (const obj of [objTotal, objAula]) {
      obj.numInscritos += 1;
      if (f.strEstado === "INGRESO") obj.numAsistentes += 1;
      else if (f.strEstado === "INHABILITADO") obj.numInhabilitados += 1;
      else obj.numAusentes += 1;
    }
  }
  const listAulas = [...objAulas.values()].sort((a, b) => {
    if (a.strAula === "Sin aula asignada") return 1;
    if (b.strAula === "Sin aula asignada") return -1;
    return a.strAula.localeCompare(b.strAula, "es", { numeric: true });
  });
  return { ...objTotal, numPorcentaje: porcentaje(objTotal.numAsistentes, objTotal.numInscritos), listAulas };
}

function nombreArchivo(ex, strFormato) {
  const strBase = [ex?.nombreAsignatura, textoTipo(ex || {}), String(ex?.fechaExamen || "").slice(0, 10)]
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return `reporte-asistencia-${strBase || "examen"}.${strFormato === "excel" ? "xlsx" : "pdf"}`;
}

// ---------- Piezas visuales ----------

// Tabla de resumen por aula. La fila "Total" solo aparece cuando hay más de un aula
// (con una sola aula repetiría los mismos números).
function filasResumen(objResumen) {
  const listFilas = objResumen.listAulas.map((a) => ({ ...a, numPorcentaje: porcentaje(a.numAsistentes, a.numInscritos), boolTotal: false }));
  if (objResumen.listAulas.length > 1) {
    listFilas.push({ strAula: "Total", numInscritos: objResumen.numInscritos, numAsistentes: objResumen.numAsistentes, numAusentes: objResumen.numAusentes, numInhabilitados: objResumen.numInhabilitados, numPorcentaje: objResumen.numPorcentaje, boolTotal: true });
  }
  return listFilas;
}

const COLUMNAS_RESUMEN = ["Aula", "Inscritos", "Asistieron", "Ausentes", "Inhabilitados", "% de asistencia"];

function VistaPreviaPdf({ objExamen, strDocente, objResumen, listFilas, objSecciones }) {
  const strEmision = new Date().toLocaleString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const listAsistentes = listFilas.filter((f) => f.strEstado === "INGRESO");
  const listAusentes = listFilas.filter((f) => f.strEstado === "AUSENTE");
  const listInhabilitados = listFilas.filter((f) => f.strEstado === "INHABILITADO");
  const boolVariasAulas = objResumen.listAulas.length > 1;
  const strAulas = objExamen.listAulas.length ? objExamen.listAulas.join(", ") : objResumen.listAulas.map((a) => a.strAula).join(", ");
  const strGrupo = textoGrupoExamen(objExamen.nombreGrupo ?? objExamen.grupo);
  const aula = (f) => f.strAula.replace(/^aula\s*/i, "");

  // Tabla pequeña con encabezados; muestra 2 filas y "…" si hay más
  const fnTabla = (strTitulo, listDatos, listColumnas, strGrid, fnCeldas, boolCompleta = false) => (
    <>
      <div className="mt-2.5 font-bold">{boolCompleta ? strTitulo : `${strTitulo} (${listDatos.length})`}</div>
      {listDatos.length === 0 ? (
        <div className="text-[#64748B]">Sin estudiantes.</div>
      ) : (
        <div className="mt-0.5">
          <div className={"grid gap-x-2 border-y border-[#94A3B8] font-bold " + strGrid}>
            {listColumnas.map((c) => <span key={c} className="truncate">{c}</span>)}
          </div>
          {(boolCompleta ? listDatos : listDatos.slice(0, 2)).map((f) => (
            <div key={f.strClave} className={"grid gap-x-2 " + strGrid}>
              {fnCeldas(f).map((v, i) => <span key={i} className="truncate">{v}</span>)}
            </div>
          ))}
          {!boolCompleta && listDatos.length > 2 && <div className="text-[#94A3B8]">…</div>}
        </div>
      )}
    </>
  );

  return (
    <div className="border border-[#CBD5E1] rounded-lg p-4 shadow-[0_4px_14px_rgba(8,38,74,.08)] text-[9px] leading-[1.55] text-[#0F172A]" style={{ fontFamily: "'Times New Roman', serif" }}>
      <div className="flex justify-between items-end gap-2 border-b border-[#0F172A] pb-1.5">
        <div>
          <div className="text-[7.5px] tracking-wide text-[#64748B]">SCIEM-PASS</div>
          <b className="text-[12px]">Reporte de asistencia</b>
        </div>
        <span className="shrink-0 text-[#334155]">Emitido: {strEmision}</span>
      </div>
      <div className="mt-2">
        <div><b>Materia:</b> {objExamen.nombreAsignatura}</div>
        <div><b>Examen:</b> {textoTipo(objExamen)}{strGrupo ? ` · ${strGrupo}` : ""}</div>
        <div><b>Fecha:</b> {fechaLarga(objExamen.fechaExamen)}{objExamen.horaInicio ? ` · ${objExamen.horaInicio} – ${objExamen.horaFin}` : ""}</div>
        {strAulas && <div><b>{boolVariasAulas || objExamen.listAulas.length > 1 ? "Aulas" : "Aula"}:</b> {strAulas}</div>}
        <div><b>Docente:</b> {strDocente || "—"}</div>
      </div>
      {objSecciones.resumen && fnTabla(
        "Resumen", filasResumen(objResumen).map((r) => ({ ...r, strClave: r.strAula })),
        ["Aula", "Inscr.", "Asist.", "Aus.", "Inhab.", "% asist."], "grid-cols-[1.4fr_repeat(5,1fr)]",
        (r) => [r.boolTotal ? "Total" : aula(r), r.numInscritos, r.numAsistentes, r.numAusentes, r.numInhabilitados, `${r.numPorcentaje}%`],
        true
      )}
      {objSecciones.asistentes && fnTabla(
        "Asistentes", listAsistentes,
        boolVariasAulas ? ["Nombre", "SIS", "C.I.", "Aula", "Hora"] : ["Nombre", "SIS", "C.I.", "Hora"],
        boolVariasAulas ? "grid-cols-[2.2fr_1.3fr_1.2fr_0.8fr_0.8fr]" : "grid-cols-[2.4fr_1.3fr_1.2fr_0.8fr]",
        (f) => boolVariasAulas ? [f.strNombre, f.strSis || "—", f.strCi || "—", aula(f), f.strHora || "—"] : [f.strNombre, f.strSis || "—", f.strCi || "—", f.strHora || "—"]
      )}
      {objSecciones.ausentes && fnTabla(
        "Ausentes", listAusentes, ["Nombre", "SIS", "C.I."], "grid-cols-[2.4fr_1.3fr_1.2fr]",
        (f) => [f.strNombre, f.strSis || "—", f.strCi || "—"]
      )}
      {objSecciones.inhabilitados && fnTabla(
        "Inhabilitados", listInhabilitados, ["Nombre", "SIS", "C.I.", "Motivo"], "grid-cols-[2fr_1.2fr_1.1fr_1.6fr]",
        (f) => [f.strNombre, f.strSis || "—", f.strCi || "—", f.strMotivo || "Sin motivo"]
      )}
    </div>
  );
}

function VistaPreviaExcel({ objResumen, objSecciones }) {
  const listHojas = [
    objSecciones.resumen && "Resumen",
    objSecciones.asistentes && "Asistentes",
    objSecciones.ausentes && "Ausentes",
    objSecciones.inhabilitados && "Inhabilitados",
  ].filter(Boolean);
  const listFilas = [
    ["Aula", "Inscr.", "Asist.", "Aus.", "Inhab.", "% asist."],
    ...filasResumen(objResumen).slice(-4).map((r) => [r.boolTotal ? "Total" : r.strAula.replace(/^aula\s*/i, ""), r.numInscritos, r.numAsistentes, r.numAusentes, r.numInhabilitados, `${r.numPorcentaje}%`]),
  ];
  const strGrid = "grid-cols-[22px_1.2fr_repeat(5,1fr)]";

  return (
    <div className="border border-[#CBD5E1] rounded-lg overflow-hidden shadow-[0_4px_14px_rgba(8,38,74,.08)] text-[9.5px] text-[#0F172A]">
      <div className={"grid bg-[#F1F5F9] text-[#64748B] font-bold text-center " + strGrid}>
        {["", "A", "B", "C", "D", "E", "F"].map((c, i) => <span key={i} className="py-1 border-r border-[#E2E8F0] last:border-r-0">{c}</span>)}
      </div>
      {listFilas.map((listCeldas, i) => (
        <div key={i} className={"grid border-t border-[#E2E8F0] " + strGrid + (i === 0 || listCeldas[0] === "Total" ? " font-bold" : "")}>
          <span className="py-1 text-center bg-[#F1F5F9] text-[#64748B] border-r border-[#E2E8F0]">{i + 1}</span>
          {listCeldas.map((v, j) => <span key={j} className="py-1 px-1 truncate border-r border-[#E2E8F0] last:border-r-0">{v}</span>)}
        </div>
      ))}
      <div className="flex gap-1 px-1.5 py-1.5 bg-[#F8FAFC] border-t border-[#E2E8F0] overflow-x-auto">
        {listHojas.map((strHoja, i) => (
          <span key={strHoja} className={"px-2 py-0.5 rounded-sm whitespace-nowrap font-semibold " + (i === 0 ? "bg-white text-[#166534] border border-[#CBD5E1]" : "text-[#64748B]")}>{strHoja}</span>
        ))}
      </div>
    </div>
  );
}

// ---------- Sección ----------

export default function SeccionReportesAsistencia({ strRol = "DOCENTE", boolMostrarTitulo = true }) {
  const boolAdmin = strRol === "ADMINISTRADOR";
  const objUsuario = obtenerUsuarioActual();

  const [listExamenes, setListExamenes] = useState([]);
  const [listDocentes, setListDocentes] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strErrorCarga, setStrErrorCarga] = useState("");

  const [idDocente, setIdDocente] = useState("");
  const [idAsignatura, setIdAsignatura] = useState("");
  const [idExamen, setIdExamen] = useState("");
  const [objSecciones, setObjSecciones] = useState({ resumen: false, asistentes: false, ausentes: false, inhabilitados: false });
  const [strFormato, setStrFormato] = useState("pdf");

  const [listFilas, setListFilas] = useState([]);
  const [boolCargandoLista, setBoolCargandoLista] = useState(false);
  const [strErrorLista, setStrErrorLista] = useState("");

  const [boolDescargando, setBoolDescargando] = useState(false);
  const [objAviso, setObjAviso] = useState(null);
  const refDescargando = useRef(false);

  // Para admin se carga primero solo el catálogo de docentes. Los exámenes se
  // consultan al seleccionar uno, evitando traer todos los exámenes del semestre.
  useEffect(() => {
    let boolVivo = true;
    (async () => {
      setBoolCargando(true);
      setStrErrorCarga("");
      try {
        if (boolAdmin) {
          const listDoc = await obtenerDocentesAdmin();
          if (!boolVivo) return;
          setListDocentes(Array.isArray(listDoc) ? listDoc : []);
          setListExamenes([]);
        } else {
          const listEx = await obtenerExamenesFinalizadosDocente();
          if (!boolVivo) return;
          setListExamenes(Array.isArray(listEx) ? listEx.map(normalizarExamen) : []);
        }
      } catch {
        if (boolVivo) setStrErrorCarga("No se pudieron cargar los exámenes. Revisa tu conexión e intenta de nuevo.");
      } finally {
        if (boolVivo) setBoolCargando(false);
      }
    })();
    return () => { boolVivo = false; };
  }, [boolAdmin]);

  useEffect(() => {
    if (!boolAdmin || !idDocente) {
      if (boolAdmin) setListExamenes([]);
      return undefined;
    }
    let boolVivo = true;
    setBoolCargando(true);
    setStrErrorCarga("");
    setIdAsignatura("");
    setIdExamen("");
    obtenerExamenesFinalizadosDocente(idDocente)
      .then((listEx) => { if (boolVivo) setListExamenes(Array.isArray(listEx) ? listEx.map(normalizarExamen) : []); })
      .catch(() => { if (boolVivo) setStrErrorCarga("No se pudieron cargar los exámenes del docente."); })
      .finally(() => { if (boolVivo) setBoolCargando(false); });
    return () => { boolVivo = false; };
  }, [boolAdmin, idDocente]);

  // Solo exámenes finalizados (del docente elegido, si es el admin)
  const listFinalizados = useMemo(() => {
    const dateAhora = new Date();
    return listExamenes
      .filter((ex) => estadoExamen(ex, dateAhora) === "FINALIZADO")
      .filter((ex) => !boolAdmin || (idDocente && String(ex.idUsuario) === String(idDocente)));
  }, [listExamenes, boolAdmin, idDocente]);

  const listMaterias = useMemo(() => {
    const objMaterias = new Map();
    for (const ex of listFinalizados) {
      if (!objMaterias.has(String(ex.idAsignatura))) {
        objMaterias.set(String(ex.idAsignatura), { id: String(ex.idAsignatura), strNombre: ex.nombreAsignatura || "Materia sin nombre" });
      }
    }
    return [...objMaterias.values()].sort((a, b) => a.strNombre.localeCompare(b.strNombre, "es"));
  }, [listFinalizados]);

  const listExamenesMateria = useMemo(
    () => listFinalizados
      .filter((ex) => String(ex.idAsignatura) === String(idAsignatura))
      .sort((a, b) => String(b.fechaExamen).localeCompare(String(a.fechaExamen)) || String(b.horaInicio).localeCompare(String(a.horaInicio))),
    [listFinalizados, idAsignatura]
  );

  const objExamen = listExamenesMateria.find((ex) => String(ex.idExamen) === String(idExamen)) || null;

  const strDocente = boolAdmin
    ? nombreDocente(listDocentes.find((d) => String(d.idUsuario) === String(idDocente))) || objExamen?.nombreDocente || ""
    : objExamen?.nombreDocente || nombreDocente(objUsuario) || "";

  // Lista oficial del examen elegido (para los indicadores y la vista previa)
  useEffect(() => {
    setListFilas([]);
    setStrErrorLista("");
    if (!idExamen) return undefined;
    let boolVivo = true;
    setBoolCargandoLista(true);
    obtenerListaOficial(idExamen, "")
      .then((list) => { if (boolVivo) setListFilas(prepararFilas(list)); })
      .catch(() => { if (boolVivo) setStrErrorLista("No se pudo obtener la asistencia del examen. Revisa tu conexión e intenta de nuevo."); })
      .finally(() => { if (boolVivo) setBoolCargandoLista(false); });
    return () => { boolVivo = false; };
  }, [idExamen]);

  // Los avisos se van solos
  useEffect(() => {
    if (!objAviso) return undefined;
    const idTimer = setTimeout(() => setObjAviso(null), 6000);
    return () => clearTimeout(idTimer);
  }, [objAviso]);

  const objResumen = useMemo(() => calcularResumen(listFilas), [listFilas]);
  const boolHayDatos = Boolean(objExamen) && !boolCargandoLista && !strErrorLista;
  const listSeccionesElegidas = SECCIONES.filter((s) => objSecciones[s.strId]).map((s) => s.strId);

  const fnCambiarDocente = (v) => { setIdDocente(v); setIdAsignatura(""); setIdExamen(""); setObjAviso(null); };
  const fnCambiarMateria = (v) => { setIdAsignatura(v); setIdExamen(""); setObjAviso(null); };
  const fnCambiarExamen = (v) => { setIdExamen(v); setObjAviso(null); };
  const fnCambiarSeccion = (strId) => { setObjSecciones((o) => ({ ...o, [strId]: !o[strId] })); setObjAviso(null); };

  const fnDescargar = async () => {
    if (refDescargando.current) return; // evita solicitudes duplicadas
    if (!objExamen) {
      setObjAviso({ strTipo: "error", strTexto: "Selecciona un examen finalizado para generar el reporte." });
      return;
    }
    if (listSeccionesElegidas.length === 0) {
      setObjAviso({ strTipo: "error", strTexto: "Selecciona al menos una opción en el contenido del reporte." });
      return;
    }
    refDescargando.current = true;
    setBoolDescargando(true);
    setObjAviso(null);
    try {
      const { blobArchivo, strNombre } = await descargarReporteAsistencia(objExamen.idExamen, strFormato === "excel" ? "xlsx" : "pdf", listSeccionesElegidas);
      const strUrl = URL.createObjectURL(blobArchivo);
      const elEnlace = document.createElement("a");
      elEnlace.href = strUrl;
      elEnlace.download = strNombre || nombreArchivo(objExamen, strFormato);
      document.body.appendChild(elEnlace);
      elEnlace.click();
      elEnlace.remove();
      URL.revokeObjectURL(strUrl);
      setObjAviso({ strTipo: "ok", strTexto: "Reporte descargado correctamente." });
    } catch (err) {
      setObjAviso({ strTipo: "error", strTexto: err.message || "No se pudo generar el reporte. Intenta de nuevo." });
    } finally {
      refDescargando.current = false;
      setBoolDescargando(false);
    }
  };

  // ----- Textos de ayuda de los selectores -----
  let strAyudaMateria = "";
  if (!boolCargando && !strErrorCarga) {
    if (boolAdmin && !idDocente) strAyudaMateria = "Primero selecciona un docente.";
    else if (listMaterias.length === 0) strAyudaMateria = boolAdmin ? "Este docente no tiene exámenes finalizados." : "Todavía no tienes exámenes finalizados.";
  }

  return (
    <section className="space-y-5">
      <div>
        {boolMostrarTitulo && <h2 className="m-0 text-[22px] font-black text-[#08264A]">Reportes y Asistencia</h2>}
        <p className="mt-1 text-[13px] font-semibold text-[#64748B]">
          Genera el reporte de asistencia, ausentes y cantidad de registrados de un examen finalizado.
        </p>
      </div>

      {strErrorCarga && (
        <div role="alert" className="px-4 py-3 rounded-lg text-sm font-semibold bg-[#FEF2F2] text-[#B91C1C]">{strErrorCarga}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          {/* Selección */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5">
            <div className={"grid grid-cols-1 gap-4 " + (boolAdmin ? "md:grid-cols-3" : "md:grid-cols-2")}>
              {boolAdmin && (
                <div>
                  <label htmlFor="rep-docente" className={CLASE_LABEL}>Docente</label>
                  <select id="rep-docente" value={idDocente} onChange={(e) => fnCambiarDocente(e.target.value)} disabled={boolCargando} className={CLASE_SELECT}>
                    <option value="">{boolCargando ? "Cargando…" : "Selecciona un docente"}</option>
                    {[...listDocentes]
                      .sort((a, b) => nombreDocente(a).localeCompare(nombreDocente(b), "es"))
                      .map((d) => <option key={d.idUsuario} value={d.idUsuario}>{nombreDocente(d) || `Docente ${d.idUsuario}`}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="rep-materia" className={CLASE_LABEL}>Materia</label>
                <select
                  id="rep-materia"
                  value={idAsignatura}
                  onChange={(e) => fnCambiarMateria(e.target.value)}
                  disabled={boolCargando || listMaterias.length === 0}
                  className={CLASE_SELECT}
                >
                  <option value="">{boolCargando ? "Cargando…" : "Selecciona una materia"}</option>
                  {listMaterias.map((m) => <option key={m.id} value={m.id}>{m.strNombre}</option>)}
                </select>
                {strAyudaMateria && <p className="mt-1.5 text-xs font-semibold text-[#64748B]">{strAyudaMateria}</p>}
              </div>
              <div>
                <label htmlFor="rep-examen" className={CLASE_LABEL}>Examen finalizado</label>
                <select id="rep-examen" value={idExamen} onChange={(e) => fnCambiarExamen(e.target.value)} disabled={!idAsignatura} className={CLASE_SELECT}>
                  <option value="">Selecciona un examen</option>
                  {listExamenesMateria.map((ex) => <option key={ex.idExamen} value={ex.idExamen}>{textoExamen(ex)}</option>)}
                </select>
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className={CLASE_LABEL}>Contenido del reporte</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                {SECCIONES.map((s) => (
                  <label key={s.strId} className="flex items-center gap-2 text-sm font-semibold text-[#08264A] cursor-pointer">
                    <input type="checkbox" checked={objSecciones[s.strId]} onChange={() => fnCambiarSeccion(s.strId)} className="w-4 h-4 accent-[#003770] cursor-pointer" />
                    {s.strTexto}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Resumen */}
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5">
            <h3 className="m-0 text-[15px] font-black text-[#08264A]">Resumen</h3>

            {!objExamen && (
              <p className="mt-3 text-sm font-semibold text-[#64748B]">Selecciona una materia y un examen finalizado para ver el resumen de asistencia.</p>
            )}
            {objExamen && boolCargandoLista && <p className="mt-3 text-sm font-semibold text-[#64748B]">Cargando asistencia del examen…</p>}
            {objExamen && strErrorLista && (
              <div role="alert" className="mt-3 px-3.5 py-[11px] rounded-lg text-sm font-semibold bg-[#FEF2F2] text-[#B91C1C]">{strErrorLista}</div>
            )}

            {boolHayDatos && (objResumen.numInscritos === 0 ? (
              <p className="mt-3 text-sm font-semibold text-[#64748B]">Este examen no tiene estudiantes inscritos.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F1F5F9] text-left text-xs font-extrabold text-[#334155]">
                      {COLUMNAS_RESUMEN.map((c, i) => (
                        <th key={c} className={"px-4 py-2.5 " + (i === 0 ? "rounded-l-lg" : i === COLUMNAS_RESUMEN.length - 1 ? "rounded-r-lg" : "")}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[#08264A] font-semibold">
                    {filasResumen(objResumen).map((r) => (
                      <tr key={r.strAula} className={r.boolTotal ? "bg-[#F8FAFC] font-black" : "border-b border-[#E2E8F0]"}>
                        <td className="px-4 py-2.5">{r.strAula}</td>
                        <td className="px-4">{r.numInscritos}</td>
                        <td className="px-4">{r.numAsistentes}</td>
                        <td className="px-4">{r.numAusentes}</td>
                        <td className="px-4">{r.numInhabilitados}</td>
                        <td className="px-4">{r.numPorcentaje}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* Descarga */}
        <div className="bg-white border border-[#CBD5E1] rounded-xl p-4 sm:p-5">
          <h3 className="m-0 text-[15px] font-black text-[#08264A]">Descargar</h3>
          <div className={CLASE_LABEL + " mt-3"}>Formato</div>
          <div role="radiogroup" aria-label="Formato del reporte" className="grid grid-cols-2 gap-2">
            {[{ strId: "pdf", strTexto: "PDF" }, { strId: "excel", strTexto: "Excel" }].map((f) => {
              const boolActivo = strFormato === f.strId;
              return (
                <button
                  key={f.strId}
                  type="button"
                  role="radio"
                  aria-checked={boolActivo}
                  onClick={() => setStrFormato(f.strId)}
                  className={
                    "px-3 py-2.5 rounded-lg text-sm text-center cursor-pointer transition-colors " +
                    (boolActivo ? "border-2 border-[#1860A3] bg-[#F0F7FF] font-extrabold text-[#124B83]" : "border-[1.5px] border-[#CBD5E1] font-bold text-[#475569] hover:bg-[#F8FAFC]")
                  }
                >
                  {f.strTexto}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={fnDescargar}
            disabled={boolDescargando || !boolHayDatos}
            className="mt-4 w-full py-3 rounded-xl bg-[#003770] text-white text-sm font-extrabold cursor-pointer hover:bg-[#08264A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {boolDescargando ? "Generando reporte…" : "Descargar reporte"}
          </button>

          {objAviso && (
            <div
              role={objAviso.strTipo === "error" ? "alert" : "status"}
              className={"mt-3 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold " + (objAviso.strTipo === "error" ? "bg-[#FEF2F2] text-[#B91C1C]" : "bg-[#F0FDF4] text-[#166534]")}
            >
              {objAviso.strTexto}
            </div>
          )}

          {boolHayDatos && (
            <>
              <div className="mt-5 mb-2 text-xs font-extrabold text-[#334155]">Vista previa</div>
              {listSeccionesElegidas.length === 0 ? (
                <p className="text-xs font-semibold text-[#64748B]">Selecciona al menos una opción en el contenido del reporte.</p>
              ) : strFormato === "pdf" ? (
                <VistaPreviaPdf objExamen={objExamen} strDocente={strDocente} objResumen={objResumen} listFilas={listFilas} objSecciones={objSecciones} />
              ) : (
                <VistaPreviaExcel objResumen={objResumen} objSecciones={objSecciones} />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
