import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  Copy,
  Check,
  Lock,
  ChevronLeft,
  ChevronRight,
  User,
  Database,
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";
import {
  listarHistorialInmodificable,
  verificarIntegridadBloque,
  verificarCadenaCompleta,
  exportarRegistroCompletoCsv,
} from "../../../services/historialInmodificableService";

const REGISTROS_POR_PAGINA = 6;

export default function HistorialInmodificable() {
  // Estados de datos
  const [arrBloques, setArrBloques] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [boolExportando, setBoolExportando] = useState(false);
  const [strMensajeFeedback, setStrMensajeFeedback] = useState("");
  const ultimaConsulta = useRef(0);

  // Filtros de entrada (formulario)
  const [filtroModulo, setFiltroModulo] = useState("TODOS");
  const [filtroEjecutor, setFiltroEjecutor] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [errorFechas, setErrorFechas] = useState("");
  const fechaHoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).reduce((partes, parte) => {
    if (parte.type !== "literal") partes[parte.type] = parte.value;
    return partes;
  }, {});
  const fechaMaxima = `${fechaHoy.year}-${fechaHoy.month}-${fechaHoy.day}`;

  // Filtros aplicados efectivamente (al presionar "Aplicar Filtros Forenses")
  const [filtrosActivos, setFiltrosActivos] = useState({
    modulo: "TODOS",
    ejecutor: "",
    fecha: "",
    fechaInicio: "",
    fechaFin: "",
  });

  // Paginación
  const [intPaginaActual, setIntPaginaActual] = useState(1);

  // Bloque seleccionado para Inspección Forense
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);
  const [verificacionBloqueActual, setVerificacionBloqueActual] = useState(null);
  const [boolVerificandoBloque, setBoolVerificandoBloque] = useState(false);
  const [strCopiadoKey, setStrCopiadoKey] = useState("");

  // Modal de Verificación de Cadena Completa
  const [boolModalCadenaAbierto, setBoolModalCadenaAbierto] = useState(false);
  const [boolVerificandoCadena, setBoolVerificandoCadena] = useState(false);
  const [resVerificacionCadena, setResVerificacionCadena] = useState(null);

  // Carga inicial y recarga
  const fnCargarHistorial = useCallback(async (filtrosParaCargar) => {
    const consulta = ++ultimaConsulta.current;
    setBoolCargando(true);
    setStrError("");
    setStrMensajeFeedback("");
    setArrBloques([]);
    setBloqueSeleccionado(null);

    try {
      const data = await listarHistorialInmodificable(filtrosParaCargar);
      if (consulta !== ultimaConsulta.current) return;
      const lista = Array.isArray(data) ? data : [];
      setArrBloques(lista);

      // Si hay elementos, seleccionar el primero por defecto para inspección
      if (lista.length > 0) {
        setBloqueSeleccionado(lista[0]);
      } else {
        setBloqueSeleccionado(null);
      }
      setIntPaginaActual(1);
    } catch (err) {
      if (consulta !== ultimaConsulta.current) return;
      setArrBloques([]);
      setBloqueSeleccionado(null);
      setStrError(err.message || "Error al recuperar el historial inmodificable.");
    } finally {
      if (consulta === ultimaConsulta.current) setBoolCargando(false);
    }
  }, []);

  useEffect(() => {
    fnCargarHistorial(filtrosActivos);
  }, [fnCargarHistorial, filtrosActivos]);

  // Cada vez que cambia el bloque seleccionado, verificar su integridad individual
  useEffect(() => {
    let cancel = false;
    async function fnVerificar() {
      if (!bloqueSeleccionado) {
        setVerificacionBloqueActual(null);
        return;
      }
      setBoolVerificandoBloque(true);
      try {
        const res = await verificarIntegridadBloque(bloqueSeleccionado);
        if (!cancel) {
          setVerificacionBloqueActual(res);
        }
      } catch {
        if (!cancel) {
          setVerificacionBloqueActual({
            esValido: false,
            motivo: "Error al recalcular el sello criptográfico.",
          });
        }
      } finally {
        if (!cancel) {
          setBoolVerificandoBloque(false);
        }
      }
    }
    fnVerificar();
    return () => {
      cancel = true;
    };
  }, [bloqueSeleccionado]);

  // Manejo de aplicación de filtros (Criterio 22)
  const fnAplicarFiltros = (e) => {
    if (e) e.preventDefault();
    if (filtroFechaInicio && filtroFechaFin && filtroFechaInicio > filtroFechaFin) {
      setErrorFechas("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    if ([filtroFecha, filtroFechaInicio, filtroFechaFin].some((fecha) => fecha && fecha > fechaMaxima)) {
      setErrorFechas("No se permiten fechas posteriores a hoy.");
      return;
    }
    setErrorFechas("");
    setFiltrosActivos({
      modulo: filtroModulo,
      ejecutor: filtroEjecutor,
      fecha: filtroFecha,
      fechaInicio: filtroFechaInicio,
      fechaFin: filtroFechaFin,
    });
  };

  const fnLimpiarFiltros = () => {
    setFiltroModulo("TODOS");
    setFiltroEjecutor("");
    setFiltroFecha("");
    setFiltroFechaInicio("");
    setFiltroFechaFin("");
    setErrorFechas("");
    setFiltrosActivos({
      modulo: "TODOS",
      ejecutor: "",
      fecha: "",
      fechaInicio: "",
      fechaFin: "",
    });
  };

  // Paginación sobre el conjunto filtrado (Criterio 24)
  const intTotalPaginas = Math.max(1, Math.ceil(arrBloques.length / REGISTROS_POR_PAGINA));
  const arrBloquesPaginados = useMemo(() => {
    const inicio = (intPaginaActual - 1) * REGISTROS_POR_PAGINA;
    return arrBloques.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [arrBloques, intPaginaActual]);

  const intInicioRango = arrBloques.length === 0 ? 0 : (intPaginaActual - 1) * REGISTROS_POR_PAGINA + 1;
  const intFinRango = Math.min(intPaginaActual * REGISTROS_POR_PAGINA, arrBloques.length);

  // Exportar a CSV (Criterios 26, 27, 28, 36, 37, 39)
  const fnExportarCsv = async () => {
    if (arrBloques.length === 0) {
      setStrMensajeFeedback("No existen datos para generar el reporte.");
      return;
    }
    setBoolExportando(true);
    setStrMensajeFeedback("");
    try {
      await exportarRegistroCompletoCsv(filtrosActivos);
      setStrMensajeFeedback("Archivo CSV exportado exitosamente con todos los registros filtrados.");
      setTimeout(() => setStrMensajeFeedback(""), 4000);
    } catch {
      setStrError("No fue posible completar la exportación. Intenta de nuevo.");
    } finally {
      setBoolExportando(false);
    }
  };

  // Verificar Cadena Completa (Criterio 38)
  const fnEjecutarVerificacionCadena = async () => {
    setBoolModalCadenaAbierto(true);
    setBoolVerificandoCadena(true);
    setResVerificacionCadena(null);

    try {
      const resultado = await verificarCadenaCompleta(arrBloques);
      setResVerificacionCadena(resultado);
    } catch (err) {
      setResVerificacionCadena({
        esValido: false,
        motivo: "Fallo durante el cálculo criptográfico de la cadena: " + err.message,
      });
    } finally {
      setBoolVerificandoCadena(false);
    }
  };

  // Copiar al portapapeles
  const fnCopiarTexto = (texto, key) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setStrCopiadoKey(key);
    setTimeout(() => setStrCopiadoKey(""), 2000);
  };

  // Helper para color de badge de módulo
  const fnBadgeModuloClass = (modulo) => {
    switch ((modulo || "").toUpperCase()) {
      case "CONTROL_INGRESO":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "EXPULSIONES":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ING_EXCEPCIONAL":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "HABILITACIONES":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "CARGA_MASIVA":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "EXAMENES":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "SEGURIDAD":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          ENCABEZADO DE LA SECCIÓN (Conforme al Mockup de HU15)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#003770] tracking-tight">
              Historial Inmodificable de las Operaciones del Sistema
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-[#003770] border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-blue" />
              Auditoría
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Consulta de eventos y sellos disponibles. La integridad depende de la configuración y verificación del servidor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={fnEjecutarVerificacionCadena}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/70 text-[#003770] text-xs font-bold hover:bg-blue-100/80 transition shadow-xs cursor-pointer"
            title="Verificar encadenamiento de toda la base histórica"
          >
            <ShieldCheck className="w-4 h-4 text-primary-blue" />
            <span>Verificar Cadena Completa</span>
          </button>

          <button
            type="button"
            onClick={fnExportarCsv}
            disabled={boolExportando || boolCargando || arrBloques.length === 0}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#003770] text-white text-xs font-bold hover:bg-[#021B3B] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{boolExportando ? "Exportando..." : "Exportar Registro Completo (CSV)"}</span>
          </button>

          <button
            type="button"
            onClick={() => fnCargarHistorial(filtrosActivos)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer shrink-0"
            title="Actualizar eventos"
          >
            <RefreshCw className={`w-4 h-4 ${boolCargando ? "animate-spin text-primary-blue" : ""}`} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          BANNER DE NOTIFICACIONES O ERRORES
          ========================================================================= */}
      {strError && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold" role="alert">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{strError}</span>
          </div>
          <button
            type="button"
            onClick={() => fnCargarHistorial(filtrosActivos)}
            className="underline font-bold hover:text-rose-900 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {strMensajeFeedback && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{strMensajeFeedback}</span>
        </div>
      )}

      {/* =========================================================================
          FILTROS DE BÚSQUEDA Y OPERACIÓN (Mockup HU15)
          ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#003770]" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Filtros de Búsqueda y Generación
            </span>
          </div>
          {(filtrosActivos.modulo !== "TODOS" || filtrosActivos.ejecutor || filtrosActivos.fecha || filtrosActivos.fechaInicio || filtrosActivos.fechaFin) && (
            <button
              type="button"
              onClick={fnLimpiarFiltros}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <form onSubmit={fnAplicarFiltros} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* Módulo */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Módulo del Sistema
            </label>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue focus:bg-white transition"
            >
              <option value="TODOS">Todos los Módulos (Auditoría General)</option>
              <option value="CONTROL_INGRESO">CONTROL DE INGRESO (Verificación)</option>
              <option value="EXPULSIONES">EXPULSIONES (HU-14 / Incidentes)</option>
              <option value="ING_EXCEPCIONAL">ING_EXCEPCIONAL (HU-06)</option>
              <option value="HABILITACIONES">HABILITACIONES (Nóminas)</option>
              <option value="CARGA_MASIVA">CARGA_MASIVA (Estudiantes / Docentes)</option>
              <option value="EXAMENES">EXAMENES (Programación)</option>
              <option value="INCIDENCIAS">INCIDENCIAS</option>
              <option value="USUARIOS">USUARIOS Y ROLES</option>
              <option value="SEGURIDAD">SEGURIDAD Y SESIONES</option>
            </select>
          </div>

          {/* Usuario / Ejecutor */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Usuario / Ejecutor
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrar por correo o SIS..."
                value={filtroEjecutor}
                onChange={(e) => setFiltroEjecutor(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-blue focus:bg-white transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Rango de Fecha */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
              Fecha de Registro
            </label>
            <div className="relative">
              <input
                type="date"
                max={fechaMaxima}
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-blue focus:bg-white transition"
              />
            </div>
          </div>

          <div className="col-span-1 sm:col-span-1 lg:col-span-2 space-y-1">
            <label htmlFor="auditoria-fecha-inicio" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Desde</label>
            <input id="auditoria-fecha-inicio" type="date" max={fechaMaxima} value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700" />
          </div>
          <div className="col-span-1 sm:col-span-1 lg:col-span-2 space-y-1">
            <label htmlFor="auditoria-fecha-fin" className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Hasta</label>
            <input id="auditoria-fecha-fin" type="date" max={fechaMaxima} value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700" />
          </div>
          {errorFechas && <p role="alert" className="col-span-full text-xs text-rose-700">{errorFechas}</p>}

          {/* Botón Aplicar */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <button
              type="submit"
              className="w-full h-10 inline-flex items-center justify-center gap-2 bg-[#021B3B] text-white rounded-xl text-xs font-bold hover:bg-[#003770] transition shadow-xs cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Aplicar Filtros Forenses</span>
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          TABLA DE EVENTOS Y BLOQUES CRIPTOGRÁFICOS (Mockup HU15)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#021B3B] uppercase tracking-wide flex items-center gap-2">
              <Database className="w-4 h-4 text-[#003770]" />
              Registro de Eventos y Bloques Criptográficos
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Eventos registrados en orden cronológico inverso; los sellos solo se muestran cuando existen.
            </p>
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            {boolCargando ? (
              <span>Consultando eventos...</span>
            ) : strError && arrBloques.length === 0 ? (
              <span>Historial no disponible</span>
            ) : arrBloques.length > 0 ? (
              <span>
                Mostrando {intInicioRango} a {intFinRango} de {arrBloques.length.toLocaleString()} eventos auditables
              </span>
            ) : (
              <span>0 eventos auditables</span>
            )}
          </div>
        </div>

        {/* Tabla responsive con scroll horizontal controlado */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">ID Bloque</th>
                <th className="py-3 px-4">Fecha y Hora Oficial</th>
                <th className="py-3 px-4">Módulo</th>
                <th className="py-3 px-4">Operación Ejecutada</th>
                <th className="py-3 px-4">Ejecutor</th>
                <th className="py-3 px-4">IP Origen</th>
                <th className="py-3 px-4 text-center">Sello SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {boolCargando ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-primary-blue" />
                      <span>Cargando eventos...</span>
                    </div>
                  </td>
                </tr>
              ) : strError && arrBloques.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-xs text-slate-500">No se pudo recuperar el historial.</td></tr>
              ) : arrBloques.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-500 font-medium">
                    {filtrosActivos.modulo !== "TODOS" || filtrosActivos.ejecutor || filtrosActivos.fecha || filtrosActivos.fechaInicio || filtrosActivos.fechaFin ? (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-600">No se encontraron resultados.</p>
                        <p className="text-slate-400">Ningún evento coincide con los filtros aplicados.</p>
                      </div>
                    ) : (
                      <p className="font-bold text-slate-600">No existen operaciones registradas.</p>
                    )}
                  </td>
                </tr>
              ) : (
                arrBloquesPaginados.map((bloque) => {
                  const esSeleccionado = bloqueSeleccionado?.idBloque === bloque.idBloque;
                  return (
                    <tr
                      key={bloque.idBloque}
                      onClick={() => setBloqueSeleccionado(bloque)}
                      className={`text-xs cursor-pointer transition-colors ${esSeleccionado
                          ? "bg-blue-50/70 border-l-4 border-primary-blue font-medium"
                          : "hover:bg-slate-50/80 text-slate-700"
                        }`}
                    >
                      {/* ID Bloque */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#003770]">
                        #{bloque.idBloque}
                      </td>

                      {/* Fecha y Hora Oficial */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                        {bloque.fechaHoraOficial}
                      </td>

                      {/* Módulo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase border ${fnBadgeModuloClass(
                            bloque.modulo
                          )}`}
                        >
                          {bloque.modulo}
                        </span>
                      </td>

                      {/* Operación Ejecutada */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[260px] truncate" title={bloque.operacionEjecutada}>
                        {bloque.operacionEjecutada}
                      </td>

                      {/* Ejecutor */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium max-w-[180px] truncate" title={bloque.usuarioEjecutor}>
                        {bloque.usuarioEjecutor}
                      </td>

                      {/* IP Origen */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {bloque.ipOrigen}
                      </td>

                      {/* Sello SHA-256 */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-50 text-slate-700 border border-slate-200">
                          {bloque.selloSha256 ? `${bloque.selloSha256.slice(0, 6)}...${bloque.selloSha256.slice(-4)}` : "SIN SELLO"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {arrBloques.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Página <span className="font-bold text-slate-700">{intPaginaActual}</span> de{" "}
              <span className="font-bold text-slate-700">{intTotalPaginas}</span>
            </div>

            <div className="flex items-center gap-1 max-w-full overflow-x-auto py-1">
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
                        className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer ${intPaginaActual === numPagina
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

      {/* =========================================================================
          INSPECCIÓN FORENSE DE BLOQUE AUDITABLE (Mockup HU15)
          ========================================================================= */}
      {bloqueSeleccionado && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-primary-blue">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#021B3B] uppercase tracking-wide">
                  Inspección Forense de Bloque Auditable #{bloqueSeleccionado.idBloque}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Datos registrados y estado del sello individual, cuando está disponible.
                </p>
              </div>
            </div>

            <div>
              {boolVerificandoBloque ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Calculando SHA-256...
                </span>
              ) : verificacionBloqueActual?.esValido ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#003770] border border-blue-200 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary-blue" />
                  SELLO CRIPTOGRÁFICO VÁLIDO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  {bloqueSeleccionado.selloSha256 ? "SELLO NO CONFIRMADO" : "SIN SELLO: NO VERIFICABLE"}
                </span>
              )}
            </div>
          </div>

          {/* Grilla de metadatos forenses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fecha y Hora Exacta
              </span>
              <p className="font-mono font-bold text-slate-700">
                {bloqueSeleccionado.fechaHoraOficial}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Usuario Ejecutor
              </span>
              <p className="font-semibold text-slate-700 truncate" title={bloqueSeleccionado.usuarioEjecutor}>
                {bloqueSeleccionado.usuarioEjecutor}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Dirección IP Registrada
              </span>
              <p className="font-mono font-semibold text-slate-700">
                {bloqueSeleccionado.ipOrigen}
              </p>
            </div>
          </div>

          {/* Detalles completos de la operación */}
          <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Detalle Forense y Entidad Afectada
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${fnBadgeModuloClass(
                  bloqueSeleccionado.modulo
                )}`}
              >
                {bloqueSeleccionado.modulo} — {bloqueSeleccionado.operacionEjecutada}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {bloqueSeleccionado.detalles}
            </p>
          </div>

          {/* Cadena Criptográfica de Integridad (SHA-256 WORM Chaining) */}
          <div className="bg-[#021B3B] text-slate-100 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200">
                  Cadena criptográfica de integridad (SHA-256)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Verificación interna
              </span>
            </div>

            {/* Hash de este registro */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">
                  Hash de este registro (Bloque #{bloqueSeleccionado.idBloque}):
                </span>
                <button
                  type="button"
                  onClick={() => fnCopiarTexto(bloqueSeleccionado.selloSha256, "actual")}
                  className="inline-flex items-center gap-1 text-[10px] text-blue-300 hover:text-blue-100 transition cursor-pointer"
                >
                  {strCopiadoKey === "actual" ? (
                    <>
                      <Check className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar SHA-256</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700 font-mono text-[11px] text-blue-200 break-all select-all">
                {bloqueSeleccionado.selloSha256}
              </div>
            </div>

            {/* Hash bloque anterior */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">
                  Hash del bloque anterior:
                </span>
                <button
                  type="button"
                  onClick={() => fnCopiarTexto(bloqueSeleccionado.hashBloqueAnterior, "anterior")}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {strCopiadoKey === "anterior" ? (
                    <>
                      <Check className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar SHA-256</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-700 font-mono text-[11px] text-slate-300 break-all select-all">
                {bloqueSeleccionado.hashBloqueAnterior}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal border-t border-slate-700/80 pt-2.5">
              Los eventos sin sello previo no pueden verificarse. La cadena interna tampoco sustituye un punto de control externo protegido.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE VERIFICACIÓN DE CADENA COMPLETA (Criterio 38)
          ========================================================================= */}
      {boolModalCadenaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#003770] flex items-center justify-center border border-blue-200">
                  <ShieldCheck className="w-4 h-4 text-primary-blue" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#021B3B]">
                    Verificación Forense de la Cadena
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Comprobación de enlaces internos SHA-256
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBoolModalCadenaAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {boolVerificandoCadena ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#003770] mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Comprobando la secuencia de eventos sellados...
                </p>
                <p className="text-[11px] text-slate-400">
                  Recalculando hashes canónicos y comparando eslabones SHA-256.
                </p>
              </div>
            ) : resVerificacionCadena ? (
              <div className="space-y-4">
                {resVerificacionCadena.esValido ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wide">
                        Cadena interna consistente
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-emerald-900">
                      No incluye eventos sin sello ni un control externo.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wide">
                        No se pudo confirmar la integridad
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-rose-900">
                      {resVerificacionCadena.motivo}
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Eventos sellados comprobados:</span>
                    <span className="font-bold text-slate-800">{resVerificacionCadena.totalBloques ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Algoritmo de enlace:</span>
                    <span className="font-mono font-bold text-slate-800">SHA-256</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estado de la cadena interna:</span>
                    <span className="font-bold text-slate-700">{resVerificacionCadena.esValido ? "CONSISTENTE" : "NO CONFIRMADO"}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setBoolModalCadenaAbierto(false)}
                    className="px-4 py-2 bg-[#003770] text-white rounded-xl text-xs font-bold hover:bg-[#021B3B] transition cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
