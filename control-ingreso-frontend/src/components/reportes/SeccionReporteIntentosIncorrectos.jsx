import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import {
  AlertTriangle,
  XCircle,
  Split,
  Copy,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen
} from "lucide-react";
import {
  listarReporteIntentosIncorrectos,
  calcularEstadisticasIntentos,
  exportarIntentosExcelCsv,
  generarReporteOficialPdf,
} from "../../services/reporteIntentosService";
import { obtenerUsuarioActual } from "../../services/authService";

const REGISTROS_POR_PAGINA = 5;

export default function SeccionReporteIntentosIncorrectos({ strRol = "DOCENTE" }) {
  const boolAdmin = strRol === "ADMINISTRADOR";
  const objUsuario = obtenerUsuarioActual();

  // Estados de datos
  const [arrIntentos, setArrIntentos] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [strMensajeExito, setStrMensajeExito] = useState("");
  const [boolExportando, setBoolExportando] = useState(false);
  const ultimaConsulta = useRef(0);

  // Filtros de entrada
  const [filtroAsignatura, setFiltroAsignatura] = useState("TODAS");
  const [filtroExamen, setFiltroExamen] = useState("TODOS");
  const [filtroMotivo, setFiltroMotivo] = useState("TODOS");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  // Filtros aplicados
  const [filtrosActivos, setFiltrosActivos] = useState({
    idAsignatura: "TODAS",
    idExamen: "TODOS",
    motivo: "TODOS",
    fecha: "",
    busqueda: "",
  });

  // Paginación
  const [intPaginaActual, setIntPaginaActual] = useState(1);

  // Carga de intentos
  const fnCargarDatos = useCallback(async (filtros) => {
    const consulta = ++ultimaConsulta.current;
    setBoolCargando(true);
    setStrError("");
    setStrMensajeExito("");

    try {
      const data = await listarReporteIntentosIncorrectos(filtros);
      if (consulta !== ultimaConsulta.current) return;
      setArrIntentos(Array.isArray(data) ? data : []);
      setIntPaginaActual(1);
    } catch (err) {
      if (consulta !== ultimaConsulta.current) return;
      setArrIntentos([]);
      setStrError(err.message || "Error al consultar los registros de intentos incorrectos.");
    } finally {
      if (consulta === ultimaConsulta.current) setBoolCargando(false);
    }
  }, []);

  useEffect(() => {
    fnCargarDatos(filtrosActivos);
  }, [fnCargarDatos, filtrosActivos]);

  // Lista de asignaturas disponibles para el filtro (según rol)
  const listAsignaturasDisponibles = useMemo(() => {
    const mapa = new Map();
    for (const item of arrIntentos) {
      if (item.idAsignatura && !mapa.has(item.idAsignatura)) {
        mapa.set(item.idAsignatura, item.nombreAsignatura || `Asignatura #${item.idAsignatura}`);
      }
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [arrIntentos]);

  // Lista de exámenes dependientes de la asignatura seleccionada
  const listExamenesDisponibles = useMemo(() => {
    const mapa = new Map();
    for (const item of arrIntentos) {
      if (
        filtroAsignatura === "TODAS" ||
        String(item.idAsignatura) === String(filtroAsignatura)
      ) {
        if (item.idExamen && !mapa.has(item.idExamen)) {
          mapa.set(item.idExamen, item.nombreExamen || `Examen #${item.idExamen}`);
        }
      }
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [arrIntentos, filtroAsignatura]);

  // Al cambiar la asignatura, resetear el selector de examen
  const fnCambiarAsignatura = (nuevaAsig) => {
    setFiltroAsignatura(nuevaAsig);
    setFiltroExamen("TODOS");
  };

  // Manejador del botón Filtrar (Criterios 6, 7, 8, 9, 10, 11)
  const fnAplicarFiltros = (e) => {
    if (e) e.preventDefault();
    setFiltrosActivos({
      idAsignatura: filtroAsignatura,
      idExamen: filtroExamen,
      motivo: filtroMotivo,
      fecha: filtroFecha,
      busqueda: filtroBusqueda,
    });
  };

  const fnLimpiarFiltros = () => {
    setFiltroAsignatura("TODAS");
    setFiltroExamen("TODOS");
    setFiltroMotivo("TODOS");
    setFiltroFecha("");
    setFiltroBusqueda("");
    setFiltrosActivos({
      idAsignatura: "TODAS",
      idExamen: "TODOS",
      motivo: "TODOS",
      fecha: "",
      busqueda: "",
    });
  };

  // Cálculo de KPIs oficiales (Criterios 14 al 20)
  const kpis = useMemo(() => {
    return calcularEstadisticasIntentos(arrIntentos);
  }, [arrIntentos]);

  // Paginación (Criterios 29 y 30)
  const intTotalPaginas = Math.max(1, Math.ceil(arrIntentos.length / REGISTROS_POR_PAGINA));
  const arrPaginados = useMemo(() => {
    const inicio = (intPaginaActual - 1) * REGISTROS_POR_PAGINA;
    return arrIntentos.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [arrIntentos, intPaginaActual]);

  const intInicio = arrIntentos.length === 0 ? 0 : (intPaginaActual - 1) * REGISTROS_POR_PAGINA + 1;
  const intFin = Math.min(intPaginaActual * REGISTROS_POR_PAGINA, arrIntentos.length);

  // Descarga PDF Oficial (Criterios 31 al 33)
  const fnDescargarPdf = () => {
    if (arrIntentos.length === 0) {
      setStrError("No existen datos para generar el reporte.");
      return;
    }
    setBoolExportando(true);
    try {
      const nombreAsig =
        filtroAsignatura !== "TODAS"
          ? listAsignaturasDisponibles.find((a) => String(a.id) === String(filtroAsignatura))?.nombre
          : "Todas las Asignaturas";
      const nombreEx =
        filtroExamen !== "TODOS"
          ? listExamenesDisponibles.find((e) => String(e.id) === String(filtroExamen))?.nombre
          : "Todos los Exámenes";

      generarReporteOficialPdf(arrIntentos, {
        asignatura: nombreAsig,
        examen: nombreEx,
        docente: objUsuario?.nombre || "Docente Titular",
      });
      setStrMensajeExito("Reporte oficial en formato PDF preparado para visualización e impresión.");
      setTimeout(() => setStrMensajeExito(""), 4000);
    } catch {
      setStrError("No fue posible completar la generación del archivo PDF.");
    } finally {
      setBoolExportando(false);
    }
  };

  // Exportar a Excel (CSV) (Criterios 34 al 37)
  const fnExportarCsv = () => {
    if (arrIntentos.length === 0) {
      setStrError("No existen datos para generar el reporte.");
      return;
    }
    setBoolExportando(true);
    try {
      exportarIntentosExcelCsv(arrIntentos);
      setStrMensajeExito("Archivo Excel (CSV) descargado exitosamente con todos los registros filtrados.");
      setTimeout(() => setStrMensajeExito(""), 4000);
    } catch {
      setStrError("No fue posible completar la exportación a Excel.");
    } finally {
      setBoolExportando(false);
    }
  };

  // Badges de motivo
  const fnRenderBadgeMotivo = (motivo) => {
    const m = (motivo || "").toUpperCase();
    if (m.includes("EXAMEN_INCORRECTO")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-[#003770] border border-slate-200">
          EXAMEN INCORRECTO
        </span>
      );
    }
    if (m.includes("AMBIENTE_DIFERENTE") || m.includes("AULA_DIFERENTE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-[#003770] border border-slate-200">
          AMBIENTE DIFERENTE
        </span>
      );
    }
    if (m.includes("DUPLICADO")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-[#003770] border border-slate-200">
          DUPLICADO BLOQUEADO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
        INHABILITADO ACADÉMICO
      </span>
    );
  };

  // Badges de estado posterior
  const fnRenderBadgeEstadoPosterior = (estado) => {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
        {estado || "No disponible"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          ENCABEZADO DE LA SECCIÓN (Conforme al Mockup Oficial HU13)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#003770] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 inline-block mb-1">
            Módulo de Fiscalización y Trazabilidad
          </span>
          <h1 className="text-xl lg:text-2xl font-extrabold text-[#003770] tracking-tight">
            Reporte de Estudiantes con Intentos de Ingreso Incorrectos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Consolidado oficial de desvíos, aulas erróneas e intentos no autorizados en puertas para actas y reasignación.
          </p>
        </div>

        {/* Botones de Exportación (Mockup HU13) */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fnDescargarPdf}
            disabled={boolExportando || arrIntentos.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Descargar documento PDF con formato oficial y actas"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar Reporte Oficial (PDF)</span>
          </button>

          <button
            type="button"
            onClick={fnExportarCsv}
            disabled={boolExportando || arrIntentos.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#15803D] text-white text-xs font-bold hover:bg-[#166534] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Exportar archivo estructurado para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar a Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => fnCargarDatos(filtrosActivos)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${boolCargando ? "animate-spin text-primary-blue" : ""}`} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          MENSAJES Y NOTIFICACIONES
          ========================================================================= */}
      {strError && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold" role="alert">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{strError}</span>
          </div>
          <button
            type="button"
            onClick={() => fnCargarDatos(filtrosActivos)}
            className="underline font-bold hover:text-rose-900 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {strMensajeExito && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{strMensajeExito}</span>
        </div>
      )}

      {/* =========================================================================
          FILTROS DE BÚSQUEDA Y GENERACIÓN (Mockup HU13)
          ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#003770]" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Filtros de Búsqueda y Generación
            </span>
          </div>
          {(filtrosActivos.idAsignatura !== "TODAS" ||
            filtrosActivos.idExamen !== "TODOS" ||
            filtrosActivos.motivo !== "TODOS" ||
            filtrosActivos.fecha ||
            filtrosActivos.busqueda) && (
            <button
              type="button"
              onClick={fnLimpiarFiltros}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <form onSubmit={fnAplicarFiltros} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          {/* Asignatura */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Asignatura
            </label>
            <select
              value={filtroAsignatura}
              onChange={(e) => fnCambiarAsignatura(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue focus:bg-white transition"
            >
              <option value="TODAS">Todas las Asignaturas {boolAdmin ? "(General)" : "(Asignadas)"}</option>
              {listAsignaturasDisponibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Examen */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Examen
            </label>
            <select
              value={filtroExamen}
              onChange={(e) => setFiltroExamen(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue focus:bg-white transition"
            >
              <option value="TODOS">Todos los Exámenes</option>
              {listExamenesDisponibles.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Motivo del Intento */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Motivo del Intento
            </label>
            <select
              value={filtroMotivo}
              onChange={(e) => {
                const motivo = e.target.value;
                setFiltroMotivo(motivo);
                setFiltrosActivos((actuales) => ({ ...actuales, motivo }));
              }}
              className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue focus:bg-white transition"
            >
              <option value="TODOS">Todos los Motivos Incorrectos</option>
              <option value="EXAMEN_INCORRECTO">Examen Incorrecto</option>
              <option value="AMBIENTE_DIFERENTE">Aula Diferente</option>
              <option value="DUPLICADO">Duplicados Bloqueados</option>
              <option value="INHABILITADO">Inhabilitado Académico</option>
            </select>
          </div>

          {/* Fecha */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Fecha
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue focus:bg-white transition"
            />
          </div>

          {/* Botón Filtrar */}
          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full h-10 inline-flex items-center justify-center gap-1.5 bg-[#003770] text-white rounded-xl text-xs font-bold hover:bg-[#021B3B] transition shadow-xs cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Filtrar</span>
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          TARJETAS KPI ESTADÍSTICAS (Mockup HU13)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Intentos Incorrectos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Intentos Incorrectos
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-[#003770] mt-1 tracking-tight">
              {kpis.totalIntentos}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Registrados en puertas de control
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
            <AlertTriangle className="w-5 h-5 text-[#003770]" />
          </div>
        </div>

        {/* KPI 2: Examen Incorrecto (HU-09) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Examen Incorrecto
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-[#003770] mt-1 tracking-tight">
              {kpis.examenIncorrecto}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {kpis.porcentajeExamenInc}% de los intentos
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-[#003770] border border-slate-200">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Aula Diferente (HU-18) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Aula Diferente
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-[#003770] mt-1 tracking-tight">
              {kpis.aulaDiferente}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              Reubicación requerida en puerta
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-[#003770] border border-slate-200">
            <Split className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Duplicados Bloqueados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Duplicados Bloqueados
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-[#003770] mt-1 tracking-tight">
              {kpis.duplicadosBloqueados}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              Ingresos previos detectados
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-[#003770] border border-slate-200">
            <Copy className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABLA DETALLE NOMINAL DE INTENTOS INCORRECTOS (Mockup HU13)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#021B3B] uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#003770]" />
              Detalle Nominal de Intentos Incorrectos
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Listado oficial y auditable de desvíos, aulas equivocadas y bloqueos en puertas.
            </p>
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            {arrIntentos.length > 0 ? (
              <span>
                Mostrando {intInicio} a {intFin} de {arrIntentos.length.toLocaleString()} registros consolidados
              </span>
            ) : (
              <span>0 registros</span>
            )}
          </div>
        </div>

        {/* Tabla responsive con scroll horizontal */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Estudiante (SIS / CI)</th>
                <th className="py-3 px-4">Motivo del Intento</th>
                <th className="py-3 px-4">Se Presentó En</th>
                <th className="py-3 px-4">Examen / Aula Asignada</th>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4">Estado Posterior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {boolCargando ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-primary-blue" />
                      <span>Cargando reporte de intentos incorrectos...</span>
                    </div>
                  </td>
                </tr>
              ) : arrIntentos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-500 font-medium">
                    {filtrosActivos.idAsignatura !== "TODAS" ||
                    filtrosActivos.idExamen !== "TODOS" ||
                    filtrosActivos.motivo !== "TODOS" ||
                    filtrosActivos.fecha || filtrosActivos.busqueda ? (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-600">No se encontraron registros de intentos incorrectos con los filtros aplicados.</p>
                        <p className="text-slate-400">Modifica los filtros de búsqueda para consultar otros eventos.</p>
                      </div>
                    ) : (
                      <p className="font-bold text-slate-600">No se encontraron registros de intentos incorrectos.</p>
                    )}
                  </td>
                </tr>
              ) : (
                arrPaginados.map((item) => (
                  <tr key={item.idIntento} className="text-xs hover:bg-slate-50/80 transition-colors text-slate-700">
                    {/* Estudiante (SIS / CI) */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.estudianteNombre}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        SIS: <span className="font-mono text-slate-700">{item.codSis}</span> · CI: {item.ci}
                      </div>
                      {item.carreraEstudiante && (
                        <div className="text-[10px] text-slate-400">{item.carreraEstudiante}</div>
                      )}
                    </td>

                    {/* Motivo del Intento */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {fnRenderBadgeMotivo(item.motivo)}
                    </td>

                    {/* Se Presentó En */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {item.sePresentoEn}
                    </td>

                    {/* Examen / Aula Asignada */}
                    <td className="py-3.5 px-4 font-medium text-primary-blue">
                      {item.examenAulaAsignada || fnRenderBadgeEstadoPosterior(null)}
                    </td>

                    {/* Hora */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {item.hora}
                    </td>

                    {/* Operador */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {item.operador}
                    </td>

                    {/* Estado Posterior */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {fnRenderBadgeEstadoPosterior(item.estadoPosterior)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación (Criterios 29 y 30) */}
        {arrIntentos.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Página <span className="font-bold text-slate-700">{intPaginaActual}</span> de{" "}
              <span className="font-bold text-slate-700">{intTotalPaginas}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIntPaginaActual((p) => Math.max(1, p - 1))}
                disabled={intPaginaActual <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              {Array.from({ length: intTotalPaginas }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === intTotalPaginas || Math.abs(p - intPaginaActual) <= 1)
                .map((numPagina, idx, arrVisibles) => {
                  const boolSalto = idx > 0 && numPagina - arrVisibles[idx - 1] > 1;
                  return (
                    <Fragment key={numPagina}>
                      {boolSalto && <span className="px-1 text-slate-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setIntPaginaActual(numPagina)}
                        className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer ${
                          intPaginaActual === numPagina
                            ? "bg-[#003770] text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {numPagina}
                      </button>
                    </Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setIntPaginaActual((p) => Math.min(intTotalPaginas, p + 1))}
                disabled={intPaginaActual >= intTotalPaginas}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

