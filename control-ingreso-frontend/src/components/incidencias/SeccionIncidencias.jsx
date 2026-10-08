import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  UserCheck,
  Plus,
  BookOpen,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Building,
  RefreshCw,
  X
} from "lucide-react";
import { obtenerUsuarioActual } from "../../services/authService";
import {
  obtenerMisExamenes,
  obtenerExamenes
} from "../../services/examenService";
import {
  obtenerCatalogosIncidencia,
  obtenerAmbientesDelDia,
  listarIncidencias,
  obtenerDetalleIncidencia,
  marcarEnRevisionIncidencia,
  cerrarIncidencia,
  listarIngresosExcepcionales
} from "../../services/incidenciaService";
import ModalIncidencia from "./ModalIncidencia";
import ModalIngresoExcepcional from "./ModalIngresoExcepcional";

/** Extrae HH:mm de un LocalDateTime ISO como "2026-10-04T08:19:30" */
function formatearHora(isoString) {
  if (!isoString) return "--:--";
  try {
    const partes = isoString.split("T");
    if (partes.length > 1) {
      return partes[1].substring(0, 5);
    }
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

export default function SeccionIncidencias({ rol = "DOCENTE" }) {
  const usuarioSesion = obtenerUsuarioActual();

  // Tab activo: 'incidencias' | 'excepcionales'
  const [tabActivo, setTabActivo] = useState("incidencias");

  // Filtros
  const [examenes, setExamenes] = useState([]);
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [filtroAula, setFiltroAula] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [strBusquedaExcepcionales, setStrBusquedaExcepcionales] = useState("");

  // Catálogos
  const [catalogos, setCatalogos] = useState(null);

  // Datos reales
  const [totalesIncidencias, setTotalesIncidencias] = useState({
    abiertas: 0,
    enRevision: 0,
    cerradas: 0,
  });
  const [incidencias, setIncidencias] = useState([]);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [boolCargandoDetalle, setBoolCargandoDetalle] = useState(false);
  const [ingresosExcepcionales, setIngresosExcepcionales] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);

  // Modales
  const [boolModalIncidencia, setBoolModalIncidencia] = useState(false);
  const [boolModalExcepcional, setBoolModalExcepcional] = useState(false);
  const [estudianteParaIncidencia, setEstudianteParaIncidencia] = useState(null);

  // Resolución
  const [strResolucionInput, setStrResolucionInput] = useState("");
  const [boolGuardandoResolucion, setBoolGuardandoResolucion] = useState(false);
  const [strMensajeFeedback, setStrMensajeFeedback] = useState("");

  // 1. Cargar catálogos y aulas del día
  useEffect(() => {
    async function fnInicializar() {
      try {
        const cat = await obtenerCatalogosIncidencia();
        setCatalogos(cat);
      } catch (err) {
        console.warn("No se pudieron cargar catálogos desde el backend:", err);
      }

      try {
        // Consultar aulas de los exámenes del día que el usuario puede operar
        const ambientesDelDia = await obtenerAmbientesDelDia();
        if (Array.isArray(ambientesDelDia) && ambientesDelDia.length > 0) {
          setAulas(ambientesDelDia);

          // Extraer exámenes únicos a partir de los ambientes
          const mapaExamenes = new Map();
          ambientesDelDia.forEach((amb) => {
            if (amb.idExamen && !mapaExamenes.has(amb.idExamen)) {
              mapaExamenes.set(amb.idExamen, {
                idExamen: amb.idExamen,
                idAsignatura: amb.idAsignatura,
                nombreExamen: `${amb.asignatura} · Examen`,
                asignatura: amb.asignatura,
              });
            }
          });

          const listaExamenes = Array.from(mapaExamenes.values());
          if (listaExamenes.length > 0) {
            setExamenes(listaExamenes);
            setExamenSeleccionado(listaExamenes[0]);
            return;
          }
        }
      } catch (err) {
        console.warn("No se pudieron obtener ambientes del día:", err);
      }

      // Fallback a la lista de exámenes del docente o admin
      try {
        const lista = rol === "DOCENTE" ? await obtenerMisExamenes() : await obtenerExamenes();
        if (Array.isArray(lista) && lista.length > 0) {
          const mapeados = lista.map((ex) => ({
            idExamen: ex.idExamen || ex.id,
            idAsignatura: ex.idAsignatura,
            nombreExamen: ex.nombreAsignatura || ex.nombreTipoExamen || ex.nombre || "Examen",
            asignatura: ex.nombreAsignatura || ex.nombre || "",
          }));
          setExamenes(mapeados);
          setExamenSeleccionado(mapeados[0]);
        }
      } catch (errEx) {
        console.warn("No se pudieron cargar exámenes del servicio regular:", errEx);
      }
    }

    fnInicializar();
  }, [rol]);

  // 2. Cargar incidencias e ingresos excepcionales según los filtros seleccionados
  const fnRecargarDatos = useCallback(async () => {
    setBoolCargando(true);
    setStrMensajeFeedback("");

    const idExamenTarget = examenSeleccionado?.idExamen || null;
    const idAmbienteTarget = filtroAula !== "TODAS" ? filtroAula : null;
    const tipoTarget = filtroTipo !== "TODOS" ? filtroTipo : null;
    const estadoTarget = filtroEstado !== "TODOS" ? filtroEstado : null;

    try {
      // 1. Incidencias
      const resIncidencias = await listarIncidencias({
        idExamen: idExamenTarget,
        idAmbiente: idAmbienteTarget,
        tipo: tipoTarget,
        estado: estadoTarget,
      });

      if (resIncidencias) {
        setTotalesIncidencias(
          resIncidencias.totales || { abiertas: 0, enRevision: 0, cerradas: 0 }
        );
        const lista = resIncidencias.incidencias || [];
        setIncidencias(lista);

        // Si la lista tiene elementos y no hay seleccionado, seleccionar el primero
        if (lista.length > 0) {
          const actualSigueExistiendo = lista.find(
            (i) => i.idIncidencia === incidenciaSeleccionada?.idIncidencia
          );
          if (actualSigueExistiendo) {
            fnCargarDetalle(actualSigueExistiendo.idIncidencia);
          } else {
            fnCargarDetalle(lista[0].idIncidencia);
          }
        } else {
          setIncidenciaSeleccionada(null);
        }
      }

      // 2. Ingresos Excepcionales
      const resExcepcionales = await listarIngresosExcepcionales({
        idExamen: idExamenTarget,
        idAmbiente: idAmbienteTarget,
      });

      if (Array.isArray(resExcepcionales)) {
        setIngresosExcepcionales(resExcepcionales);
      }
    } catch (err) {
      console.error("Error al cargar incidencias o excepcionales del backend:", err);
    } finally {
      setBoolCargando(false);
    }
  }, [examenSeleccionado, filtroAula, filtroTipo, filtroEstado, incidenciaSeleccionada?.idIncidencia]);

  useEffect(() => {
    fnRecargarDatos();
  }, [fnRecargarDatos]);

  // Cargar detalle completo de una incidencia
  const fnCargarDetalle = async (idIncidencia) => {
    if (!idIncidencia) return;
    setBoolCargandoDetalle(true);
    try {
      const detalle = await obtenerDetalleIncidencia(idIncidencia);
      setIncidenciaSeleccionada(detalle);
      setStrResolucionInput(detalle.resolucion || "");
      setStrMensajeFeedback("");
    } catch (err) {
      console.error("Error al cargar detalle de incidencia:", err);
    } finally {
      setBoolCargandoDetalle(false);
    }
  };

  // Marcar en revisión (PATCH /api/incidencias/{id}/revision)
  const fnMarcarEnRevision = async () => {
    if (!incidenciaSeleccionada) return;
    setBoolGuardandoResolucion(true);
    setStrMensajeFeedback("");

    try {
      const res = await marcarEnRevisionIncidencia(incidenciaSeleccionada.idIncidencia);
      setIncidenciaSeleccionada(res);
      setStrMensajeFeedback("Incidencia marcada en revisión.");
      fnRecargarDatos();
    } catch (err) {
      console.error("Error al marcar en revisión:", err);
      setStrMensajeFeedback(err.message || "No se pudo cambiar el estado a revisión.");
    } finally {
      setBoolGuardandoResolucion(false);
    }
  };

  // Cerrar incidencia con resolución obligatoria (PATCH /api/incidencias/{id}/cierre)
  const fnCerrarIncidencia = async () => {
    if (!incidenciaSeleccionada) return;
    if (!strResolucionInput.trim()) {
      setStrMensajeFeedback("La resolución es obligatoria para cerrar la incidencia.");
      return;
    }

    setBoolGuardandoResolucion(true);
    setStrMensajeFeedback("");

    try {
      const res = await cerrarIncidencia(
        incidenciaSeleccionada.idIncidencia,
        strResolucionInput.trim()
      );
      setIncidenciaSeleccionada(res);
      setStrMensajeFeedback("Incidencia cerrada y archivada exitosamente.");
      fnRecargarDatos();
    } catch (err) {
      console.error("Error al cerrar incidencia:", err);
      setStrMensajeFeedback(err.message || "No se pudo cerrar la incidencia.");
    } finally {
      setBoolGuardandoResolucion(false);
    }
  };

  // Aulas filtradas por examen seleccionado
  const aulasDelExamen = aulas.filter(
    (a) => !examenSeleccionado || a.idExamen === examenSeleccionado.idExamen
  );

  // Filtrado de excepcionales por búsqueda
  const excepcionalesFiltrados = ingresosExcepcionales.filter((item) => {
    if (strBusquedaExcepcionales.trim()) {
      const q = strBusquedaExcepcionales.toLowerCase();
      const coincide =
        item.estudiante?.toLowerCase().includes(q) ||
        String(item.codSis).includes(q) ||
        item.motivoEtiqueta?.toLowerCase().includes(q) ||
        item.motivo?.toLowerCase().includes(q);
      if (!coincide) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* =================================================================== */}
      {/* BARRA SUPERIOR DE ACCIONES Y CONTROLES (Mockup 06-D) */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        
        {/* Tabs principales con conteos */}
        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-2xl w-fit">
          <button
            onClick={() => setTabActivo("incidencias")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              tabActivo === "incidencias"
                ? "bg-white text-[#003770] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Incidencias</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                tabActivo === "incidencias"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {incidencias.length}
            </span>
          </button>

          <button
            onClick={() => setTabActivo("excepcionales")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              tabActivo === "excepcionales"
                ? "bg-white text-[#003770] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Ingresos excepcionales</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                tabActivo === "excepcionales"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {ingresosExcepcionales.length}
            </span>
          </button>
        </div>

        {/* Filtros de Examen y Aula */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Badge de alcance por rol */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-[#1A365D] text-xs font-extrabold">
            <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{rol === "DOCENTE" ? "Solo mis materias" : "Todos los exámenes"}</span>
          </div>

          {/* Selector de Examen */}
          {examenes.length > 0 && (
            <div className="relative">
              <select
                value={examenSeleccionado?.idExamen || ""}
                onChange={(e) => {
                  const found = examenes.find(
                    (ex) => String(ex.idExamen) === e.target.value
                  );
                  if (found) {
                    setExamenSeleccionado(found);
                    setFiltroAula("TODAS");
                  }
                }}
                className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer"
              >
                {examenes.map((ex) => (
                  <option key={ex.idExamen} value={ex.idExamen}>
                    {ex.nombreExamen}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Aula */}
          <div className="relative">
            <select
              value={filtroAula}
              onChange={(e) => setFiltroAula(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer"
            >
              <option value="TODAS">Aula: Todas</option>
              {aulasDelExamen.map((aula, idx) => (
                <option key={aula.idAmbiente || idx} value={aula.idAmbiente}>
                  {aula.aula || aula.nombre || `Aula ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Botones de acción principales */}
          <button
            onClick={() => setBoolModalIncidencia(true)}
            className="bg-[#1A365D] hover:bg-[#132743] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Incidencia</span>
          </button>

          <button
            onClick={() => setBoolModalExcepcional(true)}
            className="bg-white hover:bg-slate-50 text-[#003770] border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Excepcional</span>
          </button>
        </div>

      </div>

      {/* =================================================================== */}
      {/* VISTA TAB: INCIDENCIAS (Mockup 06-D) */}
      {/* =================================================================== */}
      {tabActivo === "incidencias" && (
        <div className="space-y-4">
          
          {/* Pills de Estado con Totales Reales de la API */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFiltroEstado("TODOS")}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer ${
                filtroEstado === "TODOS"
                  ? "bg-[#003770] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todas
            </button>

            <button
              onClick={() => setFiltroEstado("ABIERTA")}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === "ABIERTA"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Abiertas {totalesIncidencias.abiertas}</span>
            </button>

            <button
              onClick={() => setFiltroEstado("EN_REVISION")}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === "EN_REVISION"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>En revisión {totalesIncidencias.enRevision}</span>
            </button>

            <button
              onClick={() => setFiltroEstado("CERRADA")}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === "CERRADA"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span>Cerradas {totalesIncidencias.cerradas}</span>
            </button>
          </div>

          {/* Grilla: Tabla a la izquierda + Detalle de incidencia a la derecha */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            
            {/* TABLA DE INCIDENCIAS */}
            <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                      <th className="py-3 px-3.5">Código</th>
                      <th className="py-3 px-2">Hora</th>
                      <th className="py-3 px-2">Aula</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-2">Severidad</th>
                      <th className="py-3 px-3">Reportado por</th>
                      <th className="py-3 px-3.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {boolCargando ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold animate-pulse">
                          Cargando incidencias del servidor...
                        </td>
                      </tr>
                    ) : incidencias.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                          No hay incidencias con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      incidencias.map((item) => {
                        const isSelected =
                          incidenciaSeleccionada?.idIncidencia === item.idIncidencia;

                        return (
                          <tr
                            key={item.idIncidencia}
                            onClick={() => fnCargarDetalle(item.idIncidencia)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#EFF6FF] border-l-4 border-l-[#2563EB]"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-3 px-3.5 font-mono font-black text-[#003770]">
                              {item.codigo}
                            </td>
                            <td className="py-3 px-2 font-mono text-slate-500 font-bold whitespace-nowrap">
                              {formatearHora(item.fechaHora)}
                            </td>
                            <td className="py-3 px-2 font-bold text-slate-700">
                              {item.aula}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {item.tipoEtiqueta || item.tipo}
                            </td>
                            <td className="py-3 px-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  item.severidad === "ALTA"
                                    ? "bg-rose-100 text-rose-700"
                                    : item.severidad === "MEDIA"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {item.severidadEtiqueta || item.severidad}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-600 truncate max-w-[130px]">
                              {item.reportadoPor}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  item.estado === "ABIERTA"
                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                    : item.estado === "EN_REVISION"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {item.estadoEtiqueta || (item.estado === "EN_REVISION" ? "En revisión" : item.estado)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANEL DE DETALLE DE INCIDENCIA (Lateral derecho Mockup 06-D) */}
            <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
              {boolCargandoDetalle ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold animate-pulse">
                  Cargando detalle e historial de auditoría...
                </div>
              ) : incidenciaSeleccionada ? (
                <>
                  {/* Encabezado del Detalle */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-[#003770]">
                        {incidenciaSeleccionada.codigo}
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatearHora(incidenciaSeleccionada.fechaHora)}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        incidenciaSeleccionada.estado === "ABIERTA"
                          ? "bg-rose-100 text-rose-700"
                          : incidenciaSeleccionada.estado === "EN_REVISION"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {incidenciaSeleccionada.estadoEtiqueta ||
                        (incidenciaSeleccionada.estado === "EN_REVISION"
                          ? "En revisión"
                          : incidenciaSeleccionada.estado)}
                    </span>
                  </div>

                  {/* Atributos Clave */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block">Tipo</span>
                      <span className="font-black text-slate-800">
                        {incidenciaSeleccionada.tipoEtiqueta || incidenciaSeleccionada.tipo}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block">Severidad</span>
                      <span
                        className={`font-black ${
                          incidenciaSeleccionada.severidad === "ALTA"
                            ? "text-rose-600"
                            : incidenciaSeleccionada.severidad === "MEDIA"
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {incidenciaSeleccionada.severidadEtiqueta || incidenciaSeleccionada.severidad}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block">Aula</span>
                      <span className="font-black text-slate-800">
                        {incidenciaSeleccionada.aula} · {incidenciaSeleccionada.asignatura}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block">Retirado</span>
                      <span className="font-black text-slate-800">
                        {incidenciaSeleccionada.estudianteRetirado ? (
                          <span className="text-rose-600">Sí · expulsión registrada</span>
                        ) : (
                          "No"
                        )}
                      </span>
                    </div>
                    {incidenciaSeleccionada.estudiante && (
                      <div className="col-span-2 pt-1 border-t border-slate-100">
                        <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block">
                          Estudiante involucrado
                        </span>
                        <span className="font-black text-[#003770]">
                          {incidenciaSeleccionada.estudiante}
                          {incidenciaSeleccionada.codSisEstudiante && ` · SIS ${incidenciaSeleccionada.codSisEstudiante}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Descripción completa */}
                  <div>
                    <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block mb-1">
                      Descripción
                    </span>
                    <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 leading-relaxed">
                      {incidenciaSeleccionada.descripcion}
                    </div>
                  </div>

                  {/* Foto de evidencia si existe */}
                  {incidenciaSeleccionada.evidenciaUrl && (
                    <div>
                      <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block mb-1">
                        Evidencia fotográfica
                      </span>
                      <a
                        href={incidenciaSeleccionada.evidenciaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline bg-blue-50 border border-blue-200 rounded-xl px-3 py-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Ver evidencia adjunta</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  )}

                  {/* Línea de Tiempo de Auditoría (EventoIncidenciaDto) */}
                  <div>
                    <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block mb-2">
                      Línea de tiempo (desde auditoría)
                    </span>
                    <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1 text-xs">
                      {incidenciaSeleccionada.lineaTiempo && incidenciaSeleccionada.lineaTiempo.length > 0 ? (
                        incidenciaSeleccionada.lineaTiempo.map((ev, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#2563EB] border-2 border-white" />
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 font-bold">
                              <span>{formatearHora(ev.fechaHora)}</span>
                              <span className="text-[#003770] font-black">{ev.accion}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium">
                              {ev.usuario}
                            </p>
                            {ev.detalle && (
                              <p className="text-[10.5px] text-slate-500 font-mono">
                                {ev.detalle}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-400 font-medium">
                          Sin eventos de auditoría adicionales.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sección Resolución */}
                  <div>
                    <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block mb-1">
                      Resolución {incidenciaSeleccionada.estado !== "CERRADA" && <span className="text-rose-500 font-normal">(obligatoria para cerrar)</span>}
                    </span>
                    {incidenciaSeleccionada.estado === "CERRADA" ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs font-bold text-emerald-900">
                        ✓ {incidenciaSeleccionada.resolucion || "Incidencia resuelta y archivada."}
                      </div>
                    ) : (
                      <textarea
                        value={strResolucionInput}
                        onChange={(e) => setStrResolucionInput(e.target.value)}
                        placeholder="Obligatoria para cerrar la incidencia..."
                        rows={2}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                      />
                    )}
                  </div>

                  {/* Feedback */}
                  {strMensajeFeedback && (
                    <p
                      className={`text-xs font-bold ${
                        strMensajeFeedback.includes("exitosamente") || strMensajeFeedback.includes("marcada")
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {strMensajeFeedback}
                    </p>
                  )}

                  {/* Botones de Acción de Estado */}
                  {incidenciaSeleccionada.estado !== "CERRADA" ? (
                    <div className="flex gap-2 pt-2">
                      {incidenciaSeleccionada.estado === "ABIERTA" && (
                        <button
                          type="button"
                          onClick={fnMarcarEnRevision}
                          disabled={boolGuardandoResolucion}
                          className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer"
                        >
                          Marcar en revisión
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={fnCerrarIncidencia}
                        disabled={boolGuardandoResolucion}
                        className="flex-1 bg-[#1A365D] hover:bg-[#132743] text-white py-2.5 px-3 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        {boolGuardandoResolucion ? "Guardando..." : "Cerrar incidencia"}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-1 text-slate-400 text-xs font-bold">
                      Esta incidencia ya está cerrada y auditada. No admite cambios.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  Selecciona una incidencia para ver su detalle y resolución.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VISTA TAB: INGRESOS EXCEPCIONALES (Mockup 06-D) */}
      {/* =================================================================== */}
      {tabActivo === "excepcionales" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-[#003770]">
                Ingresos Excepcionales Autorizados
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Estudiantes autorizados manualmente con motivo justificado y auditoría.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={strBusquedaExcepcionales}
                  onChange={(e) => setStrBusquedaExcepcionales(e.target.value)}
                  placeholder="Buscar por SIS o nombre..."
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <button
                onClick={() => setBoolModalExcepcional(true)}
                className="bg-[#1A365D] hover:bg-[#132743] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                  <th className="py-3 px-3.5">Código SIS</th>
                  <th className="py-3 px-3">Estudiante</th>
                  <th className="py-3 px-2">Aula</th>
                  <th className="py-3 px-2">Hora</th>
                  <th className="py-3 px-3">Motivo</th>
                  <th className="py-3 px-4">Observación</th>
                  <th className="py-3 px-3">Autorizado por</th>
                  <th className="py-3 px-3">Respaldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boolCargando ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold animate-pulse">
                      Cargando ingresos excepcionales del servidor...
                    </td>
                  </tr>
                ) : excepcionalesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                      No hay registros de ingresos excepcionales.
                    </td>
                  </tr>
                ) : (
                  excepcionalesFiltrados.map((item, idx) => (
                    <tr key={item.idIngreso || idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3.5 font-mono font-bold text-[#003770]">
                        {item.codSis}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-800">
                        {item.estudiante}
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-700">
                        {item.aula}
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-500 font-bold whitespace-nowrap">
                        {formatearHora(item.horaIngreso)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-blue-50 border border-blue-200 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full text-[10.5px] whitespace-nowrap">
                          {item.motivoEtiqueta || item.motivo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium max-w-xs truncate" title={item.observacion}>
                        {item.observacion}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                        {item.autorizadoPor || "Docente"}
                      </td>
                      <td className="py-3 px-3">
                        {item.evidenciaUrl ? (
                          <a
                            href={item.evidenciaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALES REUTILIZABLES */}
      {/* =================================================================== */}
      <ModalIncidencia
        boolAbierto={boolModalIncidencia}
        onCerrar={() => {
          setBoolModalIncidencia(false);
          setEstudianteParaIncidencia(null);
        }}
        examenSeleccionado={examenSeleccionado}
        aulasDisponibles={aulasDelExamen}
        aulaPreseleccionada={
          filtroAula !== "TODAS"
            ? aulasDelExamen.find((a) => String(a.idAmbiente) === String(filtroAula))
            : aulasDelExamen[0]
        }
        estudianteInicial={estudianteParaIncidencia}
        onExito={fnRecargarDatos}
      />

      <ModalIngresoExcepcional
        boolAbierto={boolModalExcepcional}
        onCerrar={() => setBoolModalExcepcional(false)}
        examenSeleccionado={examenSeleccionado}
        aulasDisponibles={aulasDelExamen}
        aulaPreseleccionada={
          filtroAula !== "TODAS"
            ? aulasDelExamen.find((a) => String(a.idAmbiente) === String(filtroAula))
            : aulasDelExamen[0]
        }
        onExito={fnRecargarDatos}
        onAbrirIncidenciaConEstudiante={(estudiante, aula) => {
          setEstudianteParaIncidencia(estudiante);
          setBoolModalIncidencia(true);
        }}
      />

    </div>
  );
}
