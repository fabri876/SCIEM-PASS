import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  UserCheck,
  Plus,
  BookOpen,
  Search,
  FileText,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  obtenerAulasAsignadas,
  obtenerAmbientesDelDia,
  listarIncidencias,
  obtenerDetalleIncidencia,
  marcarEnRevisionIncidencia,
  cerrarIncidencia,
  listarIngresosExcepcionales,
  notificarCambioIncidencias,
} from "../../services/incidenciaService";
import ModalIncidencia from "./ModalIncidencia";
import ModalIngresoExcepcional from "./ModalIngresoExcepcional";
import { formatearHora, formatearFecha } from "./utilidadesIncidencias";

const TODOS = "TODOS";

const TIPOS_INCIDENCIA = [
  { codigo: "SUPLANTACION", etiqueta: "Suplantación" },
  { codigo: "OBJETO_PROHIBIDO", etiqueta: "Objeto prohibido" },
  { codigo: "CONDUCTA_INAPROPIADA", etiqueta: "Conducta inapropiada" },
  { codigo: "FALLA_TECNICA", etiqueta: "Falla técnica" },
  { codigo: "PROBLEMA_AULA", etiqueta: "Problema del aula" },
  { codigo: "OTRO", etiqueta: "Otro" },
];

/**
 * Sección "Incidencias" (HU06) para DOCENTE y ADMINISTRADOR.
 *
 * - Exámenes y aulas: solo los ASIGNADOS al usuario (el docente, los exámenes
 *   de los que es responsable), de cualquier fecha hasta hoy: las incidencias
 *   se pueden registrar después del examen.
 * - Ingreso excepcional: solo aulas de HOY con el ingreso abierto.
 */
export default function SeccionIncidencias({ rol = "DOCENTE" }) {
  const [tabActivo, setTabActivo] = useState("incidencias");

  // Aulas asignadas (todas las fechas hasta hoy) y aulas de hoy (ingreso excepcional)
  const [aulasAsignadas, setAulasAsignadas] = useState([]);
  const [aulasHoy, setAulasHoy] = useState([]);
  const [boolCargandoAulas, setBoolCargandoAulas] = useState(true);
  const [strErrorCarga, setStrErrorCarga] = useState("");

  // Filtros
  const [strIdExamen, setStrIdExamen] = useState(TODOS);
  const [filtroAula, setFiltroAula] = useState(TODOS);
  const [filtroEstado, setFiltroEstado] = useState(TODOS);
  const [filtroTipo, setFiltroTipo] = useState(TODOS);
  const [strBusquedaExcepcionales, setStrBusquedaExcepcionales] = useState("");

  // Datos
  const [totalesIncidencias, setTotalesIncidencias] = useState({ abiertas: 0, enRevision: 0, cerradas: 0 });
  const [incidencias, setIncidencias] = useState([]);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState(null);
  const [boolCargandoDetalle, setBoolCargandoDetalle] = useState(false);
  const [ingresosExcepcionales, setIngresosExcepcionales] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);

  // Modales
  const [boolModalIncidencia, setBoolModalIncidencia] = useState(false);
  const [boolModalExcepcional, setBoolModalExcepcional] = useState(false);
  const [estudianteParaIncidencia, setEstudianteParaIncidencia] = useState(null);
  const [aulaParaIncidencia, setAulaParaIncidencia] = useState(null);

  // Resolución
  const [strResolucionInput, setStrResolucionInput] = useState("");
  const [boolGuardandoResolucion, setBoolGuardandoResolucion] = useState(false);
  const [strMensajeFeedback, setStrMensajeFeedback] = useState("");

  // La incidencia seleccionada se guarda en un ref para que elegir una fila no
  // vuelva a disparar la recarga de toda la lista.
  const idSeleccionadaRef = useRef(null);
  useEffect(() => {
    idSeleccionadaRef.current = incidenciaSeleccionada?.idIncidencia ?? null;
  }, [incidenciaSeleccionada]);

  // 1. Aulas asignadas y aulas de hoy
  const fnCargarAulas = useCallback(async () => {
    setBoolCargandoAulas(true);
    try {
      const [asignadas, hoy] = await Promise.all([obtenerAulasAsignadas(), obtenerAmbientesDelDia()]);
      setAulasAsignadas(Array.isArray(asignadas) ? asignadas : []);
      setAulasHoy(Array.isArray(hoy) ? hoy : []);
    } catch (err) {
      setStrErrorCarga(err.message || "No se pudieron cargar tus exámenes asignados.");
    } finally {
      setBoolCargandoAulas(false);
    }
  }, []);

  useEffect(() => {
    fnCargarAulas();
  }, [fnCargarAulas]);

  // Exámenes únicos a partir de las aulas asignadas (más recientes primero)
  const examenes = [];
  const idsVistos = new Set();
  aulasAsignadas.forEach((aula) => {
    if (!idsVistos.has(aula.idExamen)) {
      idsVistos.add(aula.idExamen);
      examenes.push({
        idExamen: aula.idExamen,
        etiqueta: `${aula.asignatura} · ${formatearFecha(aula.fechaExamen)}`,
      });
    }
  });

  const aulasDelExamen = aulasAsignadas.filter(
    (a) => strIdExamen === TODOS || String(a.idExamen) === strIdExamen
  );
  // Se incluyen también las aulas de hoy con el ingreso ya cerrado: si alguien
  // intenta un ingreso excepcional ahí, el backend explica el motivo y lo audita.
  const aulasHoyDelExamen = aulasHoy.filter(
    (a) => strIdExamen === TODOS || String(a.idExamen) === strIdExamen
  );
  const aulaFiltrada = filtroAula !== TODOS
    ? aulasAsignadas.find((a) => String(a.idAmbiente) === String(filtroAula))
    : null;

  // 2. Detalle de una incidencia
  const fnCargarDetalle = useCallback(async (idIncidencia) => {
    if (!idIncidencia) return;
    setBoolCargandoDetalle(true);
    try {
      const detalle = await obtenerDetalleIncidencia(idIncidencia);
      setIncidenciaSeleccionada(detalle);
      setStrResolucionInput(detalle.resolucion || "");
      setStrMensajeFeedback("");
    } catch (err) {
      setStrMensajeFeedback(err.message || "No se pudo cargar el detalle.");
    } finally {
      setBoolCargandoDetalle(false);
    }
  }, []);

  // 3a. Incidencias según todos los filtros
  const fnRecargarIncidencias = useCallback(async () => {
    setBoolCargando(true);
    setStrErrorCarga("");

    try {
      const resIncidencias = await listarIncidencias({
        idExamen: strIdExamen !== TODOS ? strIdExamen : null,
        idAmbiente: filtroAula !== TODOS ? filtroAula : null,
        tipo: filtroTipo !== TODOS ? filtroTipo : null,
        estado: filtroEstado !== TODOS ? filtroEstado : null,
      });

      setTotalesIncidencias(resIncidencias?.totales || { abiertas: 0, enRevision: 0, cerradas: 0 });
      const lista = resIncidencias?.incidencias || [];
      setIncidencias(lista);

      if (lista.length === 0) {
        setIncidenciaSeleccionada(null);
      } else {
        const sigue = lista.find((i) => i.idIncidencia === idSeleccionadaRef.current);
        fnCargarDetalle((sigue || lista[0]).idIncidencia);
      }
    } catch (err) {
      setStrErrorCarga(err.message || "No se pudieron cargar las incidencias.");
    } finally {
      setBoolCargando(false);
    }
  }, [strIdExamen, filtroAula, filtroTipo, filtroEstado, fnCargarDetalle]);

  // 3b. Ingresos excepcionales: solo depende de examen y aula (no de tipo/estado)
  const fnRecargarExcepcionales = useCallback(async () => {
    try {
      const resExcepcionales = await listarIngresosExcepcionales({
        idExamen: strIdExamen !== TODOS ? strIdExamen : null,
        idAmbiente: filtroAula !== TODOS ? filtroAula : null,
      });
      setIngresosExcepcionales(Array.isArray(resExcepcionales) ? resExcepcionales : []);
    } catch {
      // El error de incidencias ya se muestra; no duplicar mensajes.
    }
  }, [strIdExamen, filtroAula]);

  useEffect(() => {
    fnRecargarIncidencias();
  }, [fnRecargarIncidencias]);

  useEffect(() => {
    fnRecargarExcepcionales();
  }, [fnRecargarExcepcionales]);

  // Después de registrar algo: recargar lista, aforos y el contador del menú
  const fnTrasRegistrar = () => {
    fnRecargarIncidencias();
    fnRecargarExcepcionales();
    fnCargarAulas();
  };

  const fnMarcarEnRevision = async () => {
    if (!incidenciaSeleccionada) return;
    setBoolGuardandoResolucion(true);
    setStrMensajeFeedback("");
    try {
      const res = await marcarEnRevisionIncidencia(incidenciaSeleccionada.idIncidencia);
      setIncidenciaSeleccionada(res);
      setStrMensajeFeedback("Incidencia marcada en revisión.");
      notificarCambioIncidencias();
      fnRecargarIncidencias();
    } catch (err) {
      setStrMensajeFeedback(err.message || "No se pudo cambiar el estado a revisión.");
    } finally {
      setBoolGuardandoResolucion(false);
    }
  };

  const fnCerrarIncidencia = async () => {
    if (!incidenciaSeleccionada) return;
    if (!strResolucionInput.trim()) {
      setStrMensajeFeedback("La resolución es obligatoria para cerrar la incidencia.");
      return;
    }
    setBoolGuardandoResolucion(true);
    setStrMensajeFeedback("");
    try {
      const res = await cerrarIncidencia(incidenciaSeleccionada.idIncidencia, strResolucionInput.trim());
      setIncidenciaSeleccionada(res);
      setStrMensajeFeedback("Incidencia cerrada exitosamente.");
      notificarCambioIncidencias();
      fnRecargarIncidencias();
    } catch (err) {
      setStrMensajeFeedback(err.message || "No se pudo cerrar la incidencia.");
    } finally {
      setBoolGuardandoResolucion(false);
    }
  };

  const excepcionalesFiltrados = ingresosExcepcionales.filter((item) => {
    if (!strBusquedaExcepcionales.trim()) return true;
    const q = strBusquedaExcepcionales.toLowerCase();
    return (
      item.estudiante?.toLowerCase().includes(q) ||
      String(item.codSis).includes(q) ||
      item.motivoEtiqueta?.toLowerCase().includes(q)
    );
  });

  const fnAbrirIncidencia = () => {
    setEstudianteParaIncidencia(null);
    setAulaParaIncidencia(aulaFiltrada || aulasDelExamen[0] || null);
    setBoolModalIncidencia(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* BARRA SUPERIOR: pestañas, filtros y acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">

        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-2xl w-fit max-w-full overflow-x-auto">
          <button
            onClick={() => setTabActivo("incidencias")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              tabActivo === "incidencias" ? "bg-white text-[#003770] shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Incidencias</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${tabActivo === "incidencias" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"}`}>
              {incidencias.length}
            </span>
          </button>
          <button
            onClick={() => setTabActivo("excepcionales")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              tabActivo === "excepcionales" ? "bg-white text-[#003770] shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Ingresos excepcionales</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${tabActivo === "excepcionales" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
              {ingresosExcepcionales.length}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-[#1A365D] text-xs font-extrabold">
            <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{rol === "DOCENTE" ? "Mis exámenes asignados" : "Todos los exámenes"}</span>
          </div>

          <select
            value={strIdExamen}
            onChange={(e) => {
              setStrIdExamen(e.target.value);
              setFiltroAula(TODOS);
            }}
            className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-full"
          >
            <option value={TODOS}>Examen: Todos</option>
            {examenes.map((ex) => (
              <option key={ex.idExamen} value={String(ex.idExamen)}>{ex.etiqueta}</option>
            ))}
          </select>

          <select
            value={filtroAula}
            onChange={(e) => setFiltroAula(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-full"
          >
            <option value={TODOS}>Aula: Todas</option>
            {aulasDelExamen.map((aula) => (
              <option key={aula.idAmbiente} value={String(aula.idAmbiente)}>
                {strIdExamen === TODOS ? `${aula.aula} · ${aula.asignatura}` : aula.aula}
              </option>
            ))}
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer max-w-full"
          >
            <option value={TODOS}>Tipo: Todos</option>
            {TIPOS_INCIDENCIA.map((t) => (
              <option key={t.codigo} value={t.codigo}>{t.etiqueta}</option>
            ))}
          </select>

          <button
            onClick={fnTrasRegistrar}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 p-2 rounded-xl transition cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${boolCargando ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={fnAbrirIncidencia}
            disabled={boolCargandoAulas || aulasAsignadas.length === 0}
            title={aulasAsignadas.length === 0 ? "Primero debe estar asignado un examen" : "Registrar incidencia"}
            className="bg-[#1A365D] hover:bg-[#132743] disabled:opacity-45 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Incidencia</span>
          </button>

          <button
            onClick={() => setBoolModalExcepcional(true)}
            disabled={boolCargandoAulas}
            title={aulasHoyDelExamen.length === 0 ? "Solo el día del examen" : "Ingreso excepcional"}
            className="bg-white hover:bg-slate-50 disabled:opacity-45 text-[#003770] border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Excepcional</span>
          </button>
        </div>
      </div>

      {strErrorCarga && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-bold">
          ✕ {strErrorCarga}
        </div>
      )}
      {!boolCargandoAulas && !strErrorCarga && aulasAsignadas.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-xs font-bold">
          No tienes exámenes asignados que ya se hayan tomado. Las incidencias se registran sobre un examen asignado.
        </div>
      )}

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
            
            {/* TABLA DE INCIDENCIAS (tarjetas en celular, tabla desde tablet) */}
            <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="md:hidden divide-y divide-slate-100">
                {boolCargando ? (
                  <p className="py-8 text-center text-slate-400 text-xs font-semibold animate-pulse">Cargando incidencias...</p>
                ) : incidencias.length === 0 ? (
                  <p className="py-8 px-4 text-center text-slate-400 text-xs font-semibold">No hay incidencias con los filtros seleccionados.</p>
                ) : (
                  incidencias.map((item) => (
                    <button
                      key={item.idIncidencia}
                      type="button"
                      onClick={() => {
                        fnCargarDetalle(item.idIncidencia);
                        document.getElementById("detalle-incidencia")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`w-full text-left p-3.5 space-y-1 transition ${
                        incidenciaSeleccionada?.idIncidencia === item.idIncidencia ? "bg-[#EFF6FF]" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-[#003770] text-xs">{item.codigo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.estado === "ABIERTA" ? "bg-rose-100 text-rose-700"
                            : item.estado === "EN_REVISION" ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {item.estadoEtiqueta}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {item.tipoEtiqueta} ·{" "}
                        <span className={item.severidad === "ALTA" ? "text-rose-600" : item.severidad === "MEDIA" ? "text-amber-600" : "text-emerald-600"}>
                          {item.severidadEtiqueta}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        {formatearHora(item.fechaHora)} · {item.aula} · {item.reportadoPor}
                      </p>
                    </button>
                  ))
                )}
              </div>
              <div className="hidden md:block overflow-x-auto">
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
            <div id="detalle-incidencia" className="xl:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4 scroll-mt-28 min-w-0 break-words">
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
                    <div className="col-span-2">
                      <span className="text-[10.5px] uppercase font-extrabold text-slate-400 block">Aula</span>
                      <span className="font-black text-slate-800">
                        {incidenciaSeleccionada.aula} · {incidenciaSeleccionada.asignatura}
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

          {/* Tarjetas en celular y tablet; tabla en computadora */}
          <div className="lg:hidden space-y-2.5">
            {boolCargando ? (
              <p className="py-8 text-center text-slate-400 text-xs font-semibold animate-pulse">Cargando ingresos excepcionales...</p>
            ) : excepcionalesFiltrados.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs font-semibold">No hay registros de ingresos excepcionales.</p>
            ) : (
              excepcionalesFiltrados.map((item, idx) => (
                <div key={item.idIngreso || idx} className="border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-xs break-words">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800">{item.estudiante}</p>
                      <p className="font-mono font-bold text-[#003770] text-[11px]">SIS {item.codSis}</p>
                    </div>
                    <span className="bg-blue-50 border border-blue-200 text-blue-700 font-extrabold px-2 py-0.5 rounded-full text-[10px] text-center shrink-0">
                      {item.motivoEtiqueta || item.motivo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {formatearHora(item.horaIngreso)} · {item.aula} · autorizó {item.autorizadoPor || "-"}
                  </p>
                  <p className="text-slate-600 font-medium">{item.observacion}</p>
                  {item.evidenciaUrl && (
                    <a href={item.evidenciaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:underline">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver respaldo</span>
                    </a>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-100">
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
      {/* MODALES */}
      {/* =================================================================== */}
      <ModalIncidencia
        boolAbierto={boolModalIncidencia}
        onCerrar={() => {
          setBoolModalIncidencia(false);
          setEstudianteParaIncidencia(null);
        }}
        aulasDisponibles={aulasDelExamen.length > 0 ? aulasDelExamen : aulasAsignadas}
        aulaPreseleccionada={aulaParaIncidencia}
        estudianteInicial={estudianteParaIncidencia}
        onExito={fnTrasRegistrar}
      />

      <ModalIngresoExcepcional
        boolAbierto={boolModalExcepcional}
        onCerrar={() => setBoolModalExcepcional(false)}
        aulasDisponibles={aulasHoyDelExamen}
        aulaPreseleccionada={
          aulaFiltrada && aulasHoyDelExamen.find((a) => a.idAmbiente === aulaFiltrada.idAmbiente)
        }
        onExito={fnTrasRegistrar}
        onAbrirIncidenciaConEstudiante={(estudiante, aula) => {
          // El aula del ingreso excepcional es de hoy, así que también está entre las asignadas.
          setEstudianteParaIncidencia(estudiante);
          setAulaParaIncidencia(aulasAsignadas.find((a) => a.idAmbiente === aula?.idAmbiente) || aula || null);
          setBoolModalIncidencia(true);
        }}
      />
    </div>
  );
}
