import { TablaConReporte } from '../common/ReporteLista.jsx';
import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  UserCheck,
  UserMinus,
  Plus,
  BookOpen,
  Search,
  FileText,
  ExternalLink,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  obtenerAulasAsignadas,
  obtenerAmbientesDelDia,
  listarIncidencias,
  exportarIncidenciasExcel,
  obtenerDetalleIncidencia,
  marcarEnRevisionIncidencia,
  cerrarIncidencia,
  revocarExpulsion,
  listarIngresosExcepcionales,
  notificarCambioIncidencias,
} from "../../services/incidenciaService";
import ModalIncidencia from "./ModalIncidencia";
import ModalIngresoExcepcional from "./ModalIngresoExcepcional";
import ModalRevocar from "./ModalRevocar";
import { revocacionRepo } from "../../offline/revocacionRepo";
import { estaOfflineIncidencia } from "../../offline/incidenciaOffline";
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

/** Cuando el tipo es "Otro", mostrar el texto que escribió el docente. */
function textoTipo(item) {
  if (item.tipo === "OTRO") {
    if (item.detalleTipoOtro && item.detalleTipoOtro.trim()) {
      return item.detalleTipoOtro.trim();
    }
    // Incidencias anteriores al 2026-11-14: el texto libre quedaba concatenado
    // dentro de la descripcion porque la columna detalletipootro no existia.
    if (item.descripcion && item.descripcion.trim()) {
      return item.descripcion.trim();
    }
  }
  return item.tipoEtiqueta || item.tipo;
}

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
  const [strAvisoAulas, setStrAvisoAulas] = useState("");

  // Filtros
  const [strIdExamen, setStrIdExamen] = useState(TODOS);
  const [filtroAula, setFiltroAula] = useState(TODOS);
  const [filtroEstado, setFiltroEstado] = useState(TODOS);
  const [filtroTipo, setFiltroTipo] = useState(TODOS);
  const [filtroMateria, setFiltroMateria] = useState(TODOS);
  const [boolSoloExpulsiones, setBoolSoloExpulsiones] = useState(false);
  const [strBusquedaExcepcionales, setStrBusquedaExcepcionales] = useState("");

  // Datos
  const [totalesIncidencias, setTotalesIncidencias] = useState({ abiertas: 0, enRevision: 0, cerradas: 0, revocadas: 0 });
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
  const [boolRevocandoExpulsion, setBoolRevocandoExpulsion] = useState(false);
  const [modalRevocarAbierto, setModalRevocarAbierto] = useState(false);
  const [strErrorRevocar, setStrErrorRevocar] = useState("");

  // Exportación a Excel del filtro activo
  const [boolExportando, setBoolExportando] = useState(false);
  const [strErrorExportar, setStrErrorExportar] = useState("");

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
      setStrAvisoAulas("");
    } catch (err) {
      setStrAvisoAulas(err.message || "No se pudieron cargar tus exámenes asignados. Reintenta con Actualizar.");
    } finally {
      setBoolCargandoAulas(false);
    }
  }, []);

  useEffect(() => {
    fnCargarAulas();
  }, [fnCargarAulas]);

  // Cuando la cola offline se sincroniza, la lista se recarga sola: lo que
  // estaba "Sin sincronizar" pasa a estar en el servidor (HU21).
  useEffect(() => {
    const fnActualizar = () => {
      fnRecargarIncidencias();
      fnCargarAulas();
    };
    window.addEventListener("incidencias:actualizadas", fnActualizar);
    return () => window.removeEventListener("incidencias:actualizadas", fnActualizar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Materias únicas a partir de las aulas asignadas (más recientes primero)
  const materias = [];
  const idsMateriaVistos = new Set();
  aulasAsignadas.forEach((aula) => {
    if (!idsMateriaVistos.has(aula.idAsignatura)) {
      idsMateriaVistos.add(aula.idAsignatura);
      materias.push({
        idAsignatura: aula.idAsignatura,
        etiqueta: aula.asignatura,
      });
    }
  });

  // Exámenes de la materia seleccionada
  const examenesDeMateria = [];
  const idsExamenVistos = new Set();
  aulasAsignadas
    .filter((a) => filtroMateria === TODOS || String(a.idAsignatura) === String(filtroMateria))
    .filter((a) => !(a.cancelado === true))
    .forEach((aula) => {
      if (!idsExamenVistos.has(aula.idExamen)) {
        idsExamenVistos.add(aula.idExamen);
        examenesDeMateria.push({
          idExamen: aula.idExamen,
          etiqueta: `${aula.asignatura} · ${formatearFecha(aula.fechaExamen)}`,
        });
      }
    });

  // Aulas del examen seleccionado (respeta la materia cuando el examen está en TODOS)
  const aulasDelExamen = aulasAsignadas.filter((a) => {
    if (a.cancelado === true) return false;
    if (strIdExamen !== TODOS) {
      return String(a.idExamen) === strIdExamen;
    }
    if (filtroMateria !== TODOS) {
      return String(a.idAsignatura) === String(filtroMateria);
    }
    return true;
  });

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
  // Nota: esta pantalla NO tiene modo offline (el modo offline es solo del
  // control de ingreso). Lo que se registró offline en el examen aparece aquí
  // en cuanto la cola se sincroniza con el servidor.
  const fnRecargarIncidencias = useCallback(async () => {
    setBoolCargando(true);
    setStrErrorCarga("");

    try {
      const resIncidencias = await listarIncidencias({
        idExamen: strIdExamen !== TODOS ? strIdExamen : null,
        idAmbiente: filtroAula !== TODOS ? filtroAula : null,
        idAsignatura: filtroMateria !== TODOS ? filtroMateria : null,
        tipo: filtroTipo !== TODOS ? filtroTipo : null,
        estado: filtroEstado !== TODOS ? filtroEstado : null,
      });

      setTotalesIncidencias(resIncidencias?.totales || { abiertas: 0, enRevision: 0, cerradas: 0, revocadas: 0 });
      const lista = (resIncidencias?.incidencias || []).map((i) => ({
        ...i,
        esExpulsion: Boolean(i.idExpulsion) || i.estudianteRetirado === true,
        esRevocada: i.estado === "REVOCADA" || i.estadoExpulsion === "REVOCADA",
        local: false,
      }));
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
  }, [strIdExamen, filtroAula, filtroMateria, filtroTipo, filtroEstado, fnCargarDetalle]);

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

  const fnAbrirRevocar = () => {
    if (!incidenciaSeleccionada?.idExamen) return;
    if (rol !== "DOCENTE") return;
    setStrErrorRevocar("");
    setModalRevocarAbierto(true);
  };

  const fnConfirmarRevocacion = async (motivo) => {
    if (!incidenciaSeleccionada?.idExamen) return;
    const esExpulsion = Boolean(incidenciaSeleccionada.idExpulsion);
    // Una incidencia abierta se cierra; una ya cerrada se revoca.
    const yaEstabaCerrada = incidenciaSeleccionada.estado === "CERRADA";
    setBoolRevocandoExpulsion(true);
    setStrMensajeFeedback("");
    setStrErrorRevocar("");
    try {
      if (await estaOfflineIncidencia()) {
        await revocacionRepo.encolar({
          idIncidencia: incidenciaSeleccionada.idIncidencia,
          idExpulsion: incidenciaSeleccionada.idExpulsion,
          idExamen: incidenciaSeleccionada.idExamen,
          motivo,
        });
        setStrMensajeFeedback("Revocación guardada en el dispositivo; se enviará al recuperar la conexión.");
        setModalRevocarAbierto(false);
        return;
      }
      if (esExpulsion) {
        await revocarExpulsion(incidenciaSeleccionada.idExamen, incidenciaSeleccionada.idExpulsion, motivo);
      }
      await cerrarIncidencia(incidenciaSeleccionada.idIncidencia, motivo);
      setStrMensajeFeedback(esExpulsion
        ? "Expulsión revocada. El estudiante puede volver a ingresar."
        : yaEstabaCerrada
          ? "Incidencia revocada."
          : "Incidencia cerrada.");
      notificarCambioIncidencias();
      fnRecargarIncidencias();
      if (incidenciaSeleccionada?.idIncidencia) fnCargarDetalle(incidenciaSeleccionada.idIncidencia);
      setModalRevocarAbierto(false);
    } catch (err) {
      // El error se muestra dentro del modal: si solo se pintara en el panel
      // de detalle quedaría tapado por el modal y parecería que no pasa nada.
      const strDetalle = err.message || "No se pudo revocar.";
      setStrErrorRevocar(strDetalle);
      setStrMensajeFeedback(strDetalle);
    } finally {
      setBoolRevocandoExpulsion(false);
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

  // Filtro adicional de expulsiones (estudiante retirado) aplicado en frontend.
  const incidenciasMostradas = incidencias.filter((i) => {
    const coincideExpulsion = !boolSoloExpulsiones || i.estudianteRetirado === true;
    const coincideMateria =
      filtroMateria === TODOS || i.asignatura === materias.find((m) => m.idAsignatura === Number(filtroMateria))?.etiqueta;
    return coincideExpulsion && coincideMateria;
  });

  // Descarga en Excel exactamente lo que se ve con los filtros activos.
  const fnExportarExcel = async () => {
    if (boolExportando || incidenciasMostradas.length === 0) return;
    setBoolExportando(true);
    setStrErrorExportar("");
    try {
      const blobExcel = await exportarIncidenciasExcel({
        idExamen: strIdExamen !== TODOS ? strIdExamen : null,
        idAmbiente: filtroAula !== TODOS ? filtroAula : null,
        idAsignatura: filtroMateria !== TODOS ? filtroMateria : null,
        tipo: filtroTipo !== TODOS ? filtroTipo : null,
        estado: filtroEstado !== TODOS ? filtroEstado : null,
        soloExpulsiones: boolSoloExpulsiones,
      });
      const urlArchivo = window.URL.createObjectURL(blobExcel);
      const enlace = document.createElement("a");
      enlace.href = urlArchivo;
      enlace.download = `incidencias-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.URL.revokeObjectURL(urlArchivo);
    } catch (err) {
      setStrErrorExportar(err.message || "No se pudieron exportar las incidencias.");
    } finally {
      setBoolExportando(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* BARRA SUPERIOR: pestañas, filtros y acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#CBD5E1] shadow-xs">

        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-2xl w-fit max-w-full overflow-x-auto">
          <button
            onClick={() => setTabActivo("incidencias")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              tabActivo === "incidencias" ? "bg-white text-[#003770] shadow-xs" : "text-[#64748B] hover:text-[#08264A]"
            }`}
          >
            <span>Incidencias</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${tabActivo === "incidencias" ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#CBD5E1] text-[#64748B]"}`}>
              {incidencias.length}
            </span>
          </button>
          <button
            onClick={() => setTabActivo("excepcionales")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              tabActivo === "excepcionales" ? "bg-white text-[#003770] shadow-xs" : "text-[#64748B] hover:text-[#08264A]"
            }`}
          >
            <span>Ingresos excepcionales</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${tabActivo === "excepcionales" ? "bg-[#D9E8F7] text-[#124B83]" : "bg-[#CBD5E1] text-[#64748B]"}`}>
              {ingresosExcepcionales.length}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F0F6FC] border border-[#B6D3EE] text-[#003770] text-xs font-extrabold">
            <BookOpen className="w-3.5 h-3.5 text-[#4A97D3]" />
            <span>{textoInterfaz(rol === "DOCENTE" ? "Mis exámenes asignados" : "Todos los exámenes")}</span>
          </div>

          <select
            value={filtroMateria}
            onChange={(e) => {
              setFiltroMateria(e.target.value);
              setStrIdExamen(TODOS);
              setFiltroAula(TODOS);
            }}
            className="bg-white border border-[#CBD5E1] rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#08264A] focus:outline-none focus:border-[#4A97D3] cursor-pointer max-w-full"
          >
            <option value={TODOS}>Materia: Todas</option>
            {materias.map((m) => (
              <option key={m.idAsignatura} value={String(m.idAsignatura)}>
                {textoInterfaz(m.etiqueta)}
              </option>
            ))}
          </select>

          <select
            value={strIdExamen}
            onChange={(e) => {
              setStrIdExamen(e.target.value);
              setFiltroAula(TODOS);
            }}
            disabled={filtroMateria === TODOS}
            className="bg-white border border-[#CBD5E1] rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#08264A] focus:outline-none focus:border-[#4A97D3] cursor-pointer max-w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={TODOS}>Examen: Todos</option>
            {examenesDeMateria.map((ex) => (
              <option key={ex.idExamen} value={String(ex.idExamen)}>{textoInterfaz(ex.etiqueta)}</option>
            ))}
          </select>

          <select
            value={filtroAula}
            onChange={(e) => {
              const valor = e.target.value;
              setFiltroAula(valor);
              // Al elegir una aula específica, sincronizar materia y examen para que coincidan.
              if (valor !== TODOS) {
                const aulaElegida = aulasAsignadas.find((a) => String(a.idAmbiente) === valor);
                if (aulaElegida) {
                  setFiltroMateria(String(aulaElegida.idAsignatura));
                  setStrIdExamen(String(aulaElegida.idExamen));
                }
              } else {
                setFiltroMateria(TODOS);
                setStrIdExamen(TODOS);
              }
            }}
            className="bg-white border border-[#CBD5E1] rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#08264A] focus:outline-none focus:border-[#4A97D3] cursor-pointer max-w-full"
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
            className="bg-white border border-[#CBD5E1] rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#08264A] focus:outline-none focus:border-[#4A97D3] cursor-pointer max-w-full"
          >
            <option value={TODOS}>Tipo: Todos</option>
            {TIPOS_INCIDENCIA.map((t) => (
              <option key={t.codigo} value={t.codigo}>{textoInterfaz(t.etiqueta)}</option>
            ))}
          </select>

          <button
            onClick={fnTrasRegistrar}
            className="bg-white hover:bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1] p-2 rounded-xl transition cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${boolCargando ? "animate-spin" : ""}`} />
          </button>

          {rol === "DOCENTE" && (
          <button
            onClick={fnAbrirIncidencia}
            disabled={boolCargandoAulas || aulasAsignadas.length === 0}
            title={aulasAsignadas.length === 0 ? "Primero debe estar asignado un examen" : "Registrar incidencia"}
            className="bg-[#003770] hover:bg-[#08264A] disabled:opacity-45 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Incidencia</span>
          </button>
          )}

          <button
            onClick={() => setBoolModalExcepcional(true)}
            disabled={boolCargandoAulas}
            title={aulasHoyDelExamen.length === 0 ? "Solo el día del examen" : "Ingreso excepcional"}
            className="bg-white hover:bg-[#F1F5F9] disabled:opacity-45 text-[#003770] border border-[#CBD5E1] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#4A97D3]" />
            <span>Excepcional</span>
          </button>
        </div>
      </div>

      {strErrorCarga && (
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] p-3 rounded-2xl text-xs font-bold">
          ✕ {textoInterfaz(strErrorCarga)}
        </div>
      )}
      {strAvisoAulas && (
        <div className="bg-[#FEF9E7] border border-[#FDE68A] text-[#92400E] p-3 rounded-2xl text-xs font-bold">
          ⚠ {strAvisoAulas}
        </div>
      )}
      {!boolCargandoAulas && !strErrorCarga && aulasAsignadas.length === 0 && (
        <div className="bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] p-3 rounded-2xl text-xs font-bold">
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
              onClick={() => {
                setFiltroEstado("TODOS");
                setBoolSoloExpulsiones(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer ${
                filtroEstado === "TODOS" && !boolSoloExpulsiones
                  ? "bg-[#003770] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#CBD5E1]"
              }`}
            >
              Todas
            </button>

            <button
              onClick={() => {
                setFiltroEstado("ABIERTA");
                setBoolSoloExpulsiones(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === "ABIERTA"
                  ? "bg-[#4A97D3] text-white"
                  : "bg-[#F0F6FC] text-[#4A97D3] border border-[#B6D3EE] hover:bg-[#D9E8F7]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#4A97D3] inline-block" />
              <span>Abiertas {totalesIncidencias.abiertas}</span>
            </button>

            <button
              onClick={() => {
                setFiltroEstado("EN_REVISION");
                setBoolSoloExpulsiones(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === "EN_REVISION"
                  ? "bg-[#003770] text-white"
                  : "bg-[#F1F5F9] text-[#003770] border border-[#CBD5E1] hover:bg-[#CBD5E1]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#003770] inline-block" />
              <span>En revisión {totalesIncidencias.enRevision}</span>
            </button>

            <button
              onClick={() => {
                setFiltroEstado("CERRADA");
                setBoolSoloExpulsiones(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === "CERRADA"
                  ? "bg-[#475569] text-white"
                  : "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] hover:bg-[#CBD5E1]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#9AA8BA] inline-block" />
              <span>Cerradas {totalesIncidencias.cerradas}</span>
            </button>

            <button
              onClick={() => setBoolSoloExpulsiones((prev) => !prev)}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                boolSoloExpulsiones
                  ? "bg-[#003770] text-white border border-[#003770]"
                  : "bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1] hover:bg-[#CBD5E1]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#003770] inline-block" />
              <span>Expulsiones</span>
            </button>

            {/* Revocadas = canceladas: el docente dejó sin efecto la incidencia. */}
            <button
              onClick={() => {
                setFiltroEstado("REVOCADA");
                setBoolSoloExpulsiones(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filtroEstado === "REVOCADA"
                  ? "bg-[#475569] text-white"
                  : "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] hover:bg-[#CBD5E1]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#475569] inline-block" />
              <span>Revocadas {totalesIncidencias.revocadas}</span>
            </button>

            <button
              onClick={fnExportarExcel}
              disabled={boolCargando || boolExportando || incidenciasMostradas.length === 0}
              title={
                incidenciasMostradas.length === 0
                  ? "No hay incidencias para exportar con el filtro actual"
                  : "Exportar a Excel el filtro actual"
              }
              className="ml-auto bg-[#003770] hover:bg-[#08264A] disabled:opacity-45 disabled:cursor-not-allowed text-white border border-[#003770] px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className={`w-3.5 h-3.5 ${boolExportando ? "animate-pulse" : ""}`} />
              <span>{boolExportando ? "Exportando..." : "Exportar"}</span>
            </button>
          </div>

          {strErrorExportar && (
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] px-3 py-2 rounded-2xl text-xs font-bold">
              ✕ {textoInterfaz(strErrorExportar)}
            </div>
          )}

          {/* Grilla: Tabla a la izquierda + Detalle de incidencia a la derecha */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            
            {/* TABLA DE INCIDENCIAS (tarjetas en celular, tabla desde tablet) */}
            <div className="xl:col-span-7 bg-white rounded-3xl border border-[#CBD5E1] shadow-xs overflow-hidden">
              <div className="md:hidden divide-y divide-[#CBD5E1]">
                {boolCargando ? (
                  <p className="py-8 text-center text-[#9AA8BA] text-xs font-semibold animate-pulse">Cargando incidencias...</p>
                ) : incidenciasMostradas.length === 0 ? (
                  <p className="py-8 px-4 text-center text-[#9AA8BA] text-xs font-semibold">
                    {boolSoloExpulsiones ? "No se encontraron expulsiones con los filtros seleccionados." : "No hay incidencias con los filtros seleccionados."}
                  </p>
                ) : (
                  incidenciasMostradas.map((item) => (
                    <button
                      key={item.idIncidencia}
                      type="button"
                      onClick={() => {
                        fnCargarDetalle(item.idIncidencia);
                        document.getElementById("detalle-incidencia")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`w-full text-left p-3.5 space-y-1 transition ${
                        incidenciaSeleccionada?.idIncidencia === item.idIncidencia ? "bg-[#F0F6FC]" : "hover:bg-[#F1F5F9]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-[#003770] text-xs">{item.codigo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.estado === "ABIERTA" ? "bg-[#D9E8F7] text-[#124B83]"
                            : item.estado === "EN_REVISION" ? "bg-[#F0F6FC] text-[#003770]"
                            : item.estado === "REVOCADA" ? "bg-[#E2E8F0] text-[#475569] border border-[#94A3B8]"
                            : "bg-[#F1F5F9] text-[#64748B]"
                        }`}>
                          {textoInterfaz(item.estadoEtiqueta)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#08264A]">
                        {textoTipo(item)} ·{" "}
                        <span className={item.severidad === "ALTA" ? "text-[#003770]" : item.severidad === "MEDIA" ? "text-[#4A97D3]" : "text-[#83B7E2]"}>
                          {textoInterfaz(item.severidadEtiqueta)}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#7A8BA0] font-semibold">
                        {formatearHora(item.fechaHora)} · {item.aula} · {item.reportadoPor}
                      </p>
                      <p className="text-[10px] text-[#7A8BA0] font-bold truncate">
                        Acción: {textoInterfaz(item.accion === "OTRO" && item.detalleAccionOtro && item.detalleAccionOtro.trim()
                          ? item.detalleAccionOtro.trim()
                          : item.accionEtiqueta || item.accion || "-")}
                      </p>
                      {item.estudianteRetirado && (
                        <p className="text-[10px] font-bold text-[#003770] flex items-center gap-1">
                          <UserMinus className="w-3 h-3" /> Expulsión
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#7A8BA0] tracking-wider text-[10px] font-black">
                      <th className="py-3 px-3.5">Código</th>
                      <th className="py-3 px-2">Hora</th>
                      <th className="py-3 px-2">Aula</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Acción</th>
                      <th className="py-3 px-2">Severidad</th>
                      <th className="py-3 px-3">Reportado por</th>
                      <th className="py-3 px-2 text-center">Expulsión</th>
                      <th className="py-3 px-3.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CBD5E1]">
                    {boolCargando ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-[#9AA8BA] font-semibold animate-pulse">
                          Cargando incidencias del servidor...
                        </td>
                      </tr>
                    ) : incidenciasMostradas.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-[#9AA8BA] font-semibold">
                          {boolSoloExpulsiones ? "No se encontraron expulsiones con los filtros seleccionados." : "No hay incidencias con los filtros seleccionados."}
                        </td>
                      </tr>
                    ) : (
                      incidenciasMostradas.map((item) => {
                        const isSelected =
                          incidenciaSeleccionada?.idIncidencia === item.idIncidencia;

                        return (
                          <tr
                            key={item.idIncidencia}
                            onClick={() => fnCargarDetalle(item.idIncidencia)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#F0F6FC] border-l-4 border-l-[#4A97D3]"
                                : "hover:bg-[#F1F5F9]"
                            }`}
                          >
                            <td className="py-3 px-3.5 font-mono font-black text-[#003770]">
                              {item.codigo}
                            </td>
                            <td className="py-3 px-2 font-mono text-[#7A8BA0] font-bold whitespace-nowrap">
                              {formatearHora(item.fechaHora)}
                            </td>
                            <td className="py-3 px-2 font-bold text-[#475569]">
                              {item.aula}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#08264A]">
                              {textoTipo(item)}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#08264A] truncate max-w-[120px]">
                              {textoInterfaz(item.accion === "OTRO" && item.detalleAccionOtro && item.detalleAccionOtro.trim()
                                ? item.detalleAccionOtro.trim()
                                : item.accionEtiqueta || item.accion || "-")}
                            </td>
                            <td className="py-3 px-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                                  item.severidad === "ALTA"
                                    ? "bg-[#003770] text-white"
                                    : item.severidad === "MEDIA"
                                    ? "bg-[#4A97D3] text-white"
                                    : "bg-[#83B7E2] text-white"
                                }`}
                              >
                                {textoInterfaz(item.severidadEtiqueta || item.severidad)}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-[#64748B] truncate max-w-[130px]">
                              {item.reportadoPor}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {item.estudianteRetirado ? (
                                <span className="text-[10px] font-bold text-[#003770]">Sí</span>
                              ) : (
                                <span className="text-[10px] text-[#9AA8BA]">No</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                                  item.estado === "ABIERTA"
                                    ? "bg-[#267BC2] text-white border border-[#267BC2]"
                                    : item.estado === "EN_REVISION"
                                    ? "bg-[#003770] text-white border border-[#003770]"
                                    : item.estado === "REVOCADA"
                                    ? "bg-[#E2E8F0] text-[#475569] border border-[#94A3B8]"
                                    : "bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]"
                                }`}
                              >
                                {textoInterfaz(item.estadoEtiqueta || (item.estado === "EN_REVISION" ? "En revisión" : item.estado))}
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
            <div id="detalle-incidencia" className="xl:col-span-5 bg-white rounded-3xl border border-[#CBD5E1] shadow-xs p-5 space-y-4 scroll-mt-28 min-w-0 break-words">
              {boolCargandoDetalle ? (
                <div className="text-center py-12 text-[#9AA8BA] text-xs font-semibold animate-pulse">
                  Cargando detalle e historial de auditoría...
                </div>
              ) : incidenciaSeleccionada ? (
                <>
                  {/* Encabezado del Detalle */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-[#003770]">
                        {incidenciaSeleccionada.codigo}
                      </h4>
                      <span className="text-xs text-[#9AA8BA] font-mono">
                        {formatearHora(incidenciaSeleccionada.fechaHora)}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                        incidenciaSeleccionada.estado === "ABIERTA"
                          ? "bg-[#267BC2] text-white"
                          : incidenciaSeleccionada.estado === "EN_REVISION"
                          ? "bg-[#003770] text-white"
                          : incidenciaSeleccionada.estado === "REVOCADA"
                          ? "bg-[#E2E8F0] text-[#475569] border border-[#94A3B8]"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      {textoInterfaz(incidenciaSeleccionada.estadoEtiqueta ||
                        (incidenciaSeleccionada.estado === "EN_REVISION"
                          ? "En revisión"
                          : incidenciaSeleccionada.estado))}
                    </span>
                  </div>

                  {/* Atributos Clave */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block">Tipo</span>
                      <span className="font-black text-[#08264A]">
                        {textoTipo(incidenciaSeleccionada)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block">Severidad</span>
                      <span
                        className={`font-black ${
                          incidenciaSeleccionada.severidad === "ALTA"
                            ? "text-[#003770]"
                            : incidenciaSeleccionada.severidad === "MEDIA"
                            ? "text-[#4A97D3]"
                            : "text-[#83B7E2]"
                        }`}
                      >
                        {textoInterfaz(incidenciaSeleccionada.severidadEtiqueta || incidenciaSeleccionada.severidad)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block">Aula</span>
                      <span className="font-black text-[#08264A]">
                        {incidenciaSeleccionada.aula} · {incidenciaSeleccionada.asignatura}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between rounded-lg bg-[#F1F5F9] border border-[#CBD5E1] px-3 py-2">
                      <span className="text-[10.5px] font-extrabold text-[#9AA8BA]">
                        Expulsión
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-black ${
                          incidenciaSeleccionada.estudianteRetirado ? "text-[#003770]" : "text-[#7A8BA0]"
                        }`}
                      >
                        {incidenciaSeleccionada.estudianteRetirado && <UserMinus className="w-3.5 h-3.5" />}
                        {incidenciaSeleccionada.estudianteRetirado ? "Sí" : "No"}
                      </span>
                    </div>
                    {incidenciaSeleccionada.estudiante && (
                      <div className="col-span-2 pt-1 border-t border-[#CBD5E1]">
                        <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block">
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
                    <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block mb-1">
                      Descripción
                    </span>
                    <div className="bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-3 text-xs font-semibold text-[#475569] leading-relaxed">
                      {textoInterfaz(incidenciaSeleccionada.descripcion)}
                    </div>
                  </div>

                  {/* Foto de evidencia si existe */}
                  {incidenciaSeleccionada.evidenciaUrl && (
                    <div>
                      <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block mb-1">
                        Evidencia fotográfica
                      </span>
                      <a
                        href={incidenciaSeleccionada.evidenciaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A97D3] hover:underline bg-[#F0F6FC] border border-[#B6D3EE] rounded-xl px-3 py-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Ver evidencia adjunta</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  )}

                  {/* Línea de Tiempo de Auditoría (EventoIncidenciaDto) */}
                  <div>
                    <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block mb-2">
                      Línea de tiempo (desde auditoría)
                    </span>
                    <div className="space-y-2 border-l-2 border-[#CBD5E1] pl-3 ml-1 text-xs">
                      {incidenciaSeleccionada.lineaTiempo && incidenciaSeleccionada.lineaTiempo.length > 0 ? (
                        incidenciaSeleccionada.lineaTiempo.map((ev, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#4A97D3] border-2 border-white" />
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#9AA8BA] font-bold">
                              <span>{formatearHora(ev.fechaHora)}</span>
                              <span className="text-[#003770] font-black">{ev.accion}</span>
                            </div>
                            <p className="text-[11px] text-[#64748B] font-medium">
                              {ev.usuario}
                            </p>
                            {ev.detalle && (
                              <p className="text-[10.5px] text-[#7A8BA0] font-mono">
                                {ev.detalle}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-[#9AA8BA] font-medium">
                          Sin eventos de auditoría adicionales.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sección Resolución */}
                  <div>
                    <span className="text-[10.5px] font-extrabold text-[#9AA8BA] block mb-1">
                      Resolución {incidenciaSeleccionada.estado !== "CERRADA" && incidenciaSeleccionada.estado !== "REVOCADA" && <span className="text-[#B91C1C] font-normal">(obligatoria para cerrar)</span>}
                    </span>
                    {incidenciaSeleccionada.estado === "CERRADA" || incidenciaSeleccionada.estado === "REVOCADA" ? (
                      <div className="bg-[#F0F6FC] border border-[#B6D3EE] rounded-xl p-3 text-xs font-bold text-[#003770]">
                        ✓ {incidenciaSeleccionada.resolucion || "Incidencia resuelta y archivada."}
                      </div>
                    ) : (
                      <textarea
                        value={strResolucionInput}
                        onChange={(e) => setStrResolucionInput(e.target.value)}
                        placeholder="Obligatoria para cerrar la incidencia..."
                        rows={2}
                        maxLength={255}
                        className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-2.5 text-xs font-semibold text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3]"
                      />
                    )}
                  </div>

                  {/* Feedback */}
                  {strMensajeFeedback && (
                    <p
                      className={`text-xs font-bold ${
                        strMensajeFeedback.includes("exitosamente") || strMensajeFeedback.includes("marcada")
                          ? "text-[#267BC2]"
                          : "text-[#B91C1C]"
                      }`}
                    >
                      {textoInterfaz(strMensajeFeedback)}
                    </p>
                  )}

                  {rol === "DOCENTE"
                    && incidenciaSeleccionada.estado !== "REVOCADA"
                    && incidenciaSeleccionada.estadoExpulsion !== "REVOCADA" && (
                    <div className="pt-2">
                      <button type="button" onClick={fnAbrirRevocar} disabled={boolRevocandoExpulsion} className="w-full bg-[#F0F6FC] hover:bg-[#D9E8F7] text-[#B91C1C] border border-[#B6D3EE] py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-50">
                        {boolRevocandoExpulsion ? "Revocando..." : "Revocar"}
                      </button>
                    </div>
                  )}

{/* Botones de Acción de Estado */}
                  {incidenciaSeleccionada.estado !== "CERRADA" && incidenciaSeleccionada.estado !== "REVOCADA" ? (
                    <div className="flex gap-2 pt-2">
                      {incidenciaSeleccionada.estado === "ABIERTA" && (
                        <button
                          type="button"
                          onClick={fnMarcarEnRevision}
                          disabled={boolGuardandoResolucion}
                          className="flex-1 bg-white hover:bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer"
                        >
                          Marcar en revisión
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={fnCerrarIncidencia}
                        disabled={boolGuardandoResolucion}
                        className="flex-1 bg-[#003770] hover:bg-[#08264A] text-white py-2.5 px-3 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        {boolGuardandoResolucion ? "Guardando..." : "Cerrar incidencia"}
                      </button>
                    </div>
                  ) : incidenciaSeleccionada.estado === "REVOCADA" ? (
                    <div className="text-center py-1 text-[#9AA8BA] text-xs font-bold">
                      Esta incidencia fue revocada (cancelada) y ya no admite cambios.
                    </div>
                  ) : incidenciaSeleccionada.estadoExpulsion === "REVOCADA" ? (
                    <div className="text-center py-1 text-[#9AA8BA] text-xs font-bold">
                      La expulsión de esta incidencia fue revocada. El estudiante puede volver a ingresar.
                    </div>
                  ) : (
                    <div className="text-center py-1 text-[#9AA8BA] text-xs font-bold">
                      Esta incidencia ya está cerrada y auditada. No admite cambios.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-[#9AA8BA] text-xs font-semibold">
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
        <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-[#003770]">
                Ingresos Excepcionales Autorizados
              </h4>
              <p className="text-xs text-[#7A8BA0] font-medium">
                Estudiantes autorizados manualmente con motivo justificado y auditoría.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#9AA8BA] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={strBusquedaExcepcionales}
                  onChange={(e) => setStrBusquedaExcepcionales(e.target.value)}
                  placeholder="Buscar por SIS o nombre..."
                  className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3]"
                />
              </div>
              <button
                onClick={() => setBoolModalExcepcional(true)}
                className="bg-[#003770] hover:bg-[#08264A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>

          {/* Tarjetas en celular y tablet; tabla en computadora */}
          <div className="lg:hidden space-y-2.5">
            {boolCargando ? (
              <p className="py-8 text-center text-[#9AA8BA] text-xs font-semibold animate-pulse">Cargando ingresos excepcionales...</p>
            ) : excepcionalesFiltrados.length === 0 ? (
              <p className="py-8 text-center text-[#9AA8BA] text-xs font-semibold">No hay registros de ingresos excepcionales.</p>
            ) : (
              excepcionalesFiltrados.map((item, idx) => (
                <div key={item.idIngreso || idx} className="border border-[#CBD5E1] rounded-2xl p-3.5 space-y-1.5 text-xs break-words">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-[#08264A]">{item.estudiante}</p>
                      <p className="font-mono font-bold text-[#003770] text-[11px]">SIS {item.codSis}</p>
                    </div>
                    <span className="bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] font-extrabold px-2 py-0.5 rounded-full text-[10px] text-center shrink-0">
                      {textoInterfaz(item.motivoEtiqueta || item.motivo)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A8BA0] font-semibold">
                    {formatearHora(item.horaIngreso)} · {item.aula} · autorizó {item.autorizadoPor || "-"}
                  </p>
                  <p className="text-[#64748B] font-medium">{item.observacion}</p>
                  {item.evidenciaUrl && (
                    <a href={item.evidenciaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A97D3] hover:underline">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver respaldo</span>
                    </a>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-[#CBD5E1]">
            <TablaConReporte titulo="Ingresos excepcionales">{(_paraReporte) => (<table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#7A8BA0] tracking-wider text-[10px] font-black">
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
              <tbody className="divide-y divide-[#CBD5E1]">
                {boolCargando ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#9AA8BA] font-semibold animate-pulse">
                      Cargando ingresos excepcionales del servidor...
                    </td>
                  </tr>
                ) : excepcionalesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#9AA8BA] font-semibold">
                      No hay registros de ingresos excepcionales.
                    </td>
                  </tr>
                ) : (
                  excepcionalesFiltrados.map((item, idx) => (
                    <tr key={item.idIngreso || idx} className="hover:bg-[#F1F5F9] transition">
                      <td className="py-3 px-3.5 font-mono font-bold text-[#003770]">
                        {item.codSis}
                      </td>
                      <td className="py-3 px-3 font-black text-[#08264A]">
                        {item.estudiante}
                      </td>
                      <td className="py-3 px-2 font-bold text-[#475569]">
                        {item.aula}
                      </td>
                      <td className="py-3 px-2 font-mono text-[#7A8BA0] font-bold whitespace-nowrap">
                        {formatearHora(item.horaIngreso)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] font-extrabold px-2.5 py-0.5 rounded-full text-[10.5px] whitespace-nowrap">
                          {textoInterfaz(item.motivoEtiqueta || item.motivo)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B] font-medium max-w-xs truncate" title={item.observacion}>
                        {item.observacion}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#475569] whitespace-nowrap">
                        {item.autorizadoPor || "Docente"}
                      </td>
                      <td className="py-3 px-3">
                        {item.evidenciaUrl ? (
                          <a
                            href={item.evidenciaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A97D3] hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </a>
                        ) : (
                          <span className="text-[#CBD5E1] font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>)}</TablaConReporte>
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
        aulasDisponibles={
          aulasDelExamen.length > 0
            ? aulasDelExamen
            : filtroMateria !== TODOS
              ? aulasAsignadas.filter((a) => String(a.idAsignatura) === String(filtroMateria))
              : aulasAsignadas
        }
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
      <ModalRevocar
        boolAbierto={modalRevocarAbierto}
        onCerrar={() => {
          setModalRevocarAbierto(false);
          setStrErrorRevocar("");
        }}
        onConfirmar={fnConfirmarRevocacion}
        boolGuardando={boolRevocandoExpulsion}
        error={strErrorRevocar}
      />
    </div>
  );
}





