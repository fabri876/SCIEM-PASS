import ReporteLista from '../common/ReporteLista.jsx';
import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  Clock,
  CloudUpload,
  Filter,
  History,
  Info,
  RotateCcw,
  User,
  UserMinus,
  X,
} from "lucide-react";
import { listarIncidencias, revocarExpulsion, cerrarIncidencia } from "../../services/incidenciaService";
import { obtenerUsuarioActual } from "../../services/authService";
import { estaOfflineIncidencia } from "../../offline/incidenciaOffline";
import { evidenciaRepo } from "../../offline/evidenciaRepo";
import { incidenciaRepo } from "../../offline/incidenciaRepo";
import { db } from "../../offline/db";
import { revocacionRepo } from "../../offline/revocacionRepo";
import { formatearFecha, formatearHora } from "./utilidadesIncidencias";
import ModalRevocar from "./ModalRevocar";

const ESTADOS_CON_ERROR = new Set(["ERROR", "ERROR_SYNC"]);

const ETIQUETAS_TIPO = {
  SUPLANTACION: "Suplantación",
  OBJETO_PROHIBIDO: "Objeto prohibido",
  CONDUCTA_INAPROPIADA: "Conducta inapropiada",
  FALLA_TECNICA: "Falla técnica",
  PROBLEMA_AULA: "Problema del aula",
  OTRO: "Otro",
};

const ETIQUETAS_SEVERIDAD = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

const ETIQUETAS_ACCIONES = {
  REGISTRO: "Registro de la incidencia",
  ADVERTENCIA_VERBAL: "Advertencia verbal",
  ADVERTENCIA_ESCRITA: "Advertencia escrita",
  CAMBIO_ASIENTO: "Cambio de asiento",
  RETIRO_MATERIAL: "Retiro del material/dispositivo",
  DESCUENTO_PUNTAJE: "Descuento de puntos",
  ANULACION_PREGUNTA: "Anulación de pregunta/sección",
  ANULACION_EXAMEN: "Anulación del examen",
  OTRO: "Otro",
};

const ESTILO_SEVERIDAD = {
  ALTA: {
    barra: "bg-[#B91C1C]",
    insignia: "bg-[#FEE2E2] text-[#B91C1C]",
  },
  MEDIA: {
    barra: "bg-[#4A97D3]",
    insignia: "bg-[#D9E8F7] text-[#124B83]",
  },
  BAJA: {
    barra: "bg-[#83B7E2]",
    insignia: "bg-[#F0F6FC] text-[#124B83]",
  },
};

const ESTILO_ESTADO = {
  ABIERTA: "bg-[#D9E8F7] text-[#124B83]",
  EN_REVISION: "bg-[#FEF9E7] text-[#92400E]",
  CERRADA: "bg-[#F1F5F9] text-[#64748B]",
  REVOCADA: "bg-[#E2E8F0] text-[#475569]",
  PENDIENTE_SYNC: "bg-[#FEF9E7] text-[#92400E] border border-[#FDE68A]",
  ERROR_SYNC: "bg-[#FEE2E2] text-[#B91C1C]",
};

function textoTipo(item) {
  // Cuando el tipo es "Otro", mostrar el texto escrito en vez de "Otro"
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
  return item.tipoEtiqueta || ETIQUETAS_TIPO[item.tipo] || item.tipo || "Incidencia";
}

function textoAccion(item) {
  // Cuando la acción es "Otro", mostrar el texto escrito en vez de "Otro"
  if (item.accion === "OTRO" && item.detalleAccionOtro && item.detalleAccionOtro.trim()) {
    return item.detalleAccionOtro.trim();
  }
  return item.accionEtiqueta || ETIQUETAS_ACCIONES[item.accion] || item.accion || "-";
}

function textoSeveridad(item) {
  return (
    item.severidadEtiqueta ||
    ETIQUETAS_SEVERIDAD[item.severidad] ||
    item.severidad ||
    "Sin severidad"
  );
}

function textoEstado(item) {
  return item.estadoEtiqueta || item.estado || "Sin estado";
}

export default function ModalHistorialIncidencias({ boolAbierto, onCerrar, idExamen, idAmbiente, rol = "DOCENTE" }) {
  const [incidencias, setIncidencias] = useState([]);
  const [boolCargando, setBoolCargando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strMensaje, setStrMensaje] = useState("");
  const [idRevocando, setIdRevocando] = useState(null);
  const [modalRevocarAbierto, setModalRevocarAbierto] = useState(false);
  const [itemARevocar, setItemARevocar] = useState(null);
  const [strErrorRevocar, setStrErrorRevocar] = useState("");
  // Chip de filtro activo del historial (total / abiertas / ... / expulsadas).
  const [filtroChip, setFiltroChip] = useState("total");

  // Cargar las incidencias guardadas en el dispositivo (pendientes, en envío o
  // rechazadas por el servidor) junto con el estado de sus evidencias.
  // `omitirSyncing` evita duplicarlas con las del servidor cuando el historial se
  // consulta con conexión y un envío está en curso.
  const cargarLocales = async ({ omitirSyncing = false } = {}) => {
    const usuario = obtenerUsuarioActual();
    const idUsuario = usuario?.idUsuario ?? usuario?.idusuario ?? null;
    const todas = await db.incidencias_pendientes.toArray();
    const evidencias = await db.evidencias_pendientes.toArray();
    const evidenciasPorIncidencia = new Map();
    for (const ev of evidencias) {
      const lista = evidenciasPorIncidencia.get(ev.incidenciaClientUuid) || [];
      lista.push(ev);
      evidenciasPorIncidencia.set(ev.incidenciaClientUuid, lista);
    }

    return todas
      .filter((p) => p.syncStatus !== "sincronizado" && p.syncStatus !== "duplicado")
      .filter((p) => !omitirSyncing || p.syncStatus !== "syncing")
      .filter((p) => !idAmbiente || Number(p.idAmbiente) === Number(idAmbiente))
      // CA38: no mostrar registros creados por otro usuario en este dispositivo.
      .filter((p) => !p.creadoPor || idUsuario == null || String(p.creadoPor) === String(idUsuario))
      .map((p) => {
        const evs = evidenciasPorIncidencia.get(p.clientUuid) || [];
        const evidenciaPendiente = evs.some(
          (ev) => ev.syncStatus === "pendiente" || ev.syncStatus === "syncing" || ev.syncStatus === "error"
        );
        const esError = p.syncStatus === "error";
        return {
          idIncidencia: null,
          clientUuid: p.clientUuid,
          codigo: null,
          estado: esError ? "ERROR_SYNC" : "PENDIENTE_SYNC",
          estadoEtiqueta: esError ? "Rechazada por el servidor" : "Pendiente de envío",
          tipo: p.tipo,
          tipoEtiqueta: ETIQUETAS_TIPO[p.tipo] || p.tipo,
          // El texto libre se conserva tal cual: textoTipo/textoAccion lo usan
          // para mostrar lo que escribio el docente cuando el tipo/accion es OTRO.
          detalleTipoOtro: p.detalleTipoOtro || null,
          accion: p.accion,
          accionEtiqueta: ETIQUETAS_ACCIONES[p.accion] || p.accion,
          detalleAccionOtro: p.detalleAccionOtro || null,
          severidad: p.severidad,
          severidadEtiqueta: ETIQUETAS_SEVERIDAD[p.severidad] || p.severidad,
          descripcion: p.descripcion,
          estudiante: p.codSisEstudiante ? `SIS ${p.codSisEstudiante}` : null,
          estudianteRetirado: Boolean(p.retirarEstudiante),
          esExpulsion: Boolean(p.retirarEstudiante),
          esRevocada: false,
          aula: p.aula || null,
          fechaHora: p.registradoEn || null,
          idExpulsion: null,
          estadoExpulsion: null,
          local: true,
          ultimoError: p.ultimoError || null,
          evidenciaPendiente,
        };
      });
  };

  const cargarCompleto = async () => {
    const offline = await estaOfflineIncidencia();
    const locales = await cargarLocales({ omitirSyncing: !offline });
    if (offline) return locales;
    try {
      const res = await listarIncidencias({ idExamen });
      const servidor = (Array.isArray(res?.incidencias) ? res.incidencias : []).map((it) => ({
        ...it,
        esExpulsion: Boolean(it.idExpulsion) || it.estudianteRetirado === true,
        // Revocada = la incidencia se canceló, o su expulsión se revocó.
        esRevocada: it.estado === "REVOCADA" || it.estadoExpulsion === "REVOCADA",
      }));
      // Primero lo que aún no llegó al servidor (pendiente o rechazado); así el
      // docente ve los envíos pendientes aunque tenga conexión.
      return [...locales, ...servidor];
    } catch (err) {
      setStrError(err.message || "No se pudieron cargar las incidencias.");
      return locales;
    }
  };

  // Cerrar con ESC, igual que la "X" de la cabecera.
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const fnTecla = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // Si hay un modal de revocación encima, ESC cierra ese primero.
        if (modalRevocarAbierto) {
          setModalRevocarAbierto(false);
          setItemARevocar(null);
          setStrErrorRevocar("");
          return;
        }
        if (onCerrar) onCerrar();
      }
    };
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, modalRevocarAbierto, onCerrar]);

  useEffect(() => {
    if (!boolAbierto) return;
    setStrError("");
    setStrMensaje("");
    setFiltroChip("total");
    setBoolCargando(true);
    cargarCompleto()
      .then((lista) => setIncidencias(lista))
      .finally(() => setBoolCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolAbierto, idExamen, idAmbiente]);

  // Si la cola se sincroniza mientras el modal está abierto, la lista se
  // recarga: lo que estaba "Sin sincronizar" pasa a estar en el servidor.
  useEffect(() => {
    if (!boolAbierto) return undefined;
    const fnActualizar = () => {
      setBoolCargando(true);
      cargarCompleto()
        .then((lista) => setIncidencias(lista))
        .finally(() => setBoolCargando(false));
    };
    window.addEventListener("incidencias:actualizadas", fnActualizar);
    return () => window.removeEventListener("incidencias:actualizadas", fnActualizar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolAbierto]);

  if (!boolAbierto) return null;

  const fnAbrirRevocar = (item) => {
    setItemARevocar(item);
    setStrErrorRevocar("");
    setModalRevocarAbierto(true);
  };

  /**
   * Tras revocar una expulsión hay que desbloquear al estudiante en la
   * nómina LOCAL: si no, el dispositivo lo seguiría teniendo por retirado y
   * no podría volver a entrar aunque la revocación ya se haya aplicado.
   */
  const fnRestaurarNominaLocal = async (idIncidencia) => {
    if (!idIncidencia) return;
    const expulsiones = await db.expulsiones_pendientes.toArray();
    for (const e of expulsiones) {
      if (e.idIncidencia != null && Number(e.idIncidencia) === Number(idIncidencia)) {
        await incidenciaRepo.restaurarNominaPorExpulsion(e);
      }
    }
  };

  const fnConfirmarRevocacion = async (motivo) => {
    if (!itemARevocar) return;
    const item = itemARevocar;
    const key = item.local ? item.clientUuid : (item.idExpulsion || item.idIncidencia);
    setIdRevocando(key);
    setStrMensaje("");
    setStrErrorRevocar("");
    try {
      if (item.local) {
        // Cancelar la incidencia pendiente localmente: borrarla de la cola.
        const pendiente = await db.incidencias_pendientes.get(item.clientUuid);
        await db.incidencias_pendientes.delete(item.clientUuid);
        // Si era expulsión, borrar la expulsión encolada y restaurar la nómina
        // exactamente como estaba antes (no se rehabilita a un estudiante que
        // estaba inhabilitado por otro motivo).
        if (pendiente?.retirarEstudiante) {
          const expulsiones = await db.expulsiones_pendientes
            .where('incidenciaClientUuid').equals(item.clientUuid).toArray();
          for (const e of expulsiones) {
            await incidenciaRepo.restaurarNominaPorExpulsion(e);
            await db.expulsiones_pendientes.delete(e.clientUuid);
          }
        }
        // La evidencia local de esa incidencia ya no debe enviarse.
        await evidenciaRepo.eliminarPorIncidencia(item.clientUuid);
        setStrMensaje("Incidencia revocada localmente.");
        setIncidencias(await cargarCompleto());
        setModalRevocarAbierto(false);
        setItemARevocar(null);
        return;
      }
      if (await estaOfflineIncidencia()) {
        await revocacionRepo.encolar({
          idIncidencia: item.idIncidencia,
          idExpulsion: item.idExpulsion,
          idExamen,
          motivo,
        });
        // El estudiante puede volver a entrar en este dispositivo desde ya.
        await fnRestaurarNominaLocal(item.idIncidencia);
        setStrMensaje("Revocación guardada en el dispositivo; se enviará al recuperar la conexión.");
        setModalRevocarAbierto(false);
        setItemARevocar(null);
        return;
      }
      if (item.idExpulsion) {
        await revocarExpulsion(idExamen, item.idExpulsion, motivo);
      }
      await cerrarIncidencia(item.idIncidencia, motivo);
      await fnRestaurarNominaLocal(item.idIncidencia);
      setStrMensaje(item.idExpulsion
        ? "Expulsión revocada."
        : item.estado === "CERRADA" ? "Incidencia revocada." : "Incidencia cerrada.");
      setIncidencias(await cargarCompleto());
      setModalRevocarAbierto(false);
      setItemARevocar(null);
    } catch (err) {
      // El error se muestra dentro del modal de revocación: si solo se pintara
      // en el cuerpo del historial quedaría tapado por el modal.
      const strDetalle = err.message || "No se pudo revocar.";
      setStrErrorRevocar(strDetalle);
      setStrMensaje(strDetalle);
    } finally {
      setIdRevocando(null);
    }
  };

  // Los contadores se calculan sobre la lista completa (no sobre la filtrada)
  // para que no cambien al cambiar de chip.
  const resumen = incidencias.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.local) acc.sinSincronizar += 1;
      if (item.estado === "ABIERTA") acc.abiertas += 1;
      if (item.estado === "EN_REVISION") acc.revision += 1;
      if (item.estado === "CERRADA") acc.cerradas += 1;
      if (item.esRevocada) acc.revocadas += 1;
      // Expulsión vigente: el estudiante sigue retirado del examen.
      if (item.esExpulsion && !item.esRevocada) acc.expulsadas += 1;
      return acc;
    },
    { total: 0, abiertas: 0, revision: 0, cerradas: 0, revocadas: 0, expulsadas: 0, sinSincronizar: 0 }
  );

  /** Un chip filtra la lista; "total" no filtra. */
  const fnCoincideChip = (item, clave) => {
    switch (clave) {
      case "abiertas":
        return item.estado === "ABIERTA";
      case "revision":
        return item.estado === "EN_REVISION";
      case "cerradas":
        return item.estado === "CERRADA";
      case "revocadas":
        return Boolean(item.esRevocada);
      case "expulsadas":
        return Boolean(item.esExpulsion) && !item.esRevocada;
      case "locales":
        return Boolean(item.local);
      default:
        return true;
    }
  };

  const incidenciasFiltradas = incidencias.filter((item) => fnCoincideChip(item, filtroChip));

  const resumenChips = [
    { clave: "total", etiqueta: "Total", valor: resumen.total, clase: "bg-white/20 border-white/30 text-white" },
    { clave: "abiertas", etiqueta: "Abiertas", valor: resumen.abiertas, clase: "bg-[#D9E8F7] text-[#124B83] border-transparent" },
    { clave: "revision", etiqueta: "En revisión", valor: resumen.revision, clase: "bg-[#FEF9E7] text-[#92400E] border-transparent" },
    { clave: "cerradas", etiqueta: "Cerradas", valor: resumen.cerradas, clase: "bg-white text-[#64748B] border-transparent" },
    { clave: "expulsadas", etiqueta: "Expulsadas", valor: resumen.expulsadas, clase: "bg-[#FEE2E2] text-[#B91C1C] border-transparent" },
    { clave: "revocadas", etiqueta: "Revocadas", valor: resumen.revocadas, clase: "bg-[#E2E8F0] text-[#475569] border-transparent" },
    ...(resumen.sinSincronizar > 0
      ? [{
        clave: "locales",
        etiqueta: "Sin enviar",
        valor: resumen.sinSincronizar,
        clase: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
      }]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-[#CBD5E1] animate-in fade-in zoom-in-95 duration-200">

        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#08264A] via-[#003770] to-[#1860A3] text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-start gap-3 pr-9">
            <span className="w-11 h-11 shrink-0 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
              <History className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-black tracking-wider mb-1.5">
                <ClipboardList className="w-3 h-3" />
                <span>Incidencias</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-tight">
                Historial del examen
              </h3>
              <p className="text-[11.5px] text-white/85 font-semibold mt-0.5">
                Consulta, revisa y revoca las incidencias registradas en este examen.
              </p>
            </div>
          </div>

          {!boolCargando && incidencias.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {resumenChips.map((chip) => {
                const activo = filtroChip === chip.clave;
                return (
                  <button
                    key={chip.clave}
                    type="button"
                    onClick={() => setFiltroChip(chip.clave)}
                    aria-pressed={activo}
                    title={activo ? "Quitar el filtro" : `Ver solo ${chip.etiqueta.toLowerCase()}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wider transition cursor-pointer ${
                      activo
                        ? "ring-2 ring-white/70 shadow-sm"
                        : "opacity-90 hover:opacity-100 hover:brightness-105"
                    } ${chip.clase}`}
                  >
                    <span className="text-[12px] leading-none">{chip.valor}</span>
                    <span className="opacity-90">{textoInterfaz(chip.etiqueta)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto bg-[#F8FAFC]">
          {strError && (
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] p-3 rounded-2xl text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{textoInterfaz(strError)}</span>
            </div>
          )}
          {strMensaje && (
            <div className="bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] p-3 rounded-2xl text-xs font-bold flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{textoInterfaz(strMensaje)}</span>
            </div>
          )}

          {boolCargando ? (
            <div className="flex flex-col items-center gap-2 py-12 text-[#7A8BA0]">
              <span className="w-7 h-7 rounded-full border-[3px] border-[#CBD5E1] border-t-[#4A97D3] animate-spin" />
              <p className="text-xs font-bold">Cargando incidencias…</p>
            </div>
          ) : incidencias.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="w-14 h-14 rounded-2xl bg-[#F0F6FC] border border-[#B6D3EE] text-[#4A97D3] flex items-center justify-center">
                <ClipboardList className="w-7 h-7" />
              </span>
              <p className="text-sm font-black text-[#003770]">Sin incidencias registradas</p>
              <p className="text-[11.5px] font-semibold text-[#7A8BA0] max-w-xs">
                Las incidencias y expulsiones que registres en este examen aparecerán aquí.
              </p>
            </div>
          ) : incidenciasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="w-14 h-14 rounded-2xl bg-[#F1F5F9] border border-[#CBD5E1] text-[#64748B] flex items-center justify-center">
                <Filter className="w-7 h-7" />
              </span>
              <p className="text-sm font-black text-[#003770]">
                No hay incidencias {textoInterfaz(resumenChips.find((c) => c.clave === filtroChip)?.etiqueta.toLowerCase() || "")}
              </p>
              <p className="text-[11.5px] font-semibold text-[#7A8BA0] max-w-xs">
                Pulsa "Total" para verlas todas.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <ReporteLista titulo="Historial de incidencias" contenido={() => <>{incidenciasFiltradas.map((it) => {
                const claveItem = it.local ? it.clientUuid : (it.idExpulsion || it.idIncidencia);
                const estiloSeveridad = ESTILO_SEVERIDAD[it.severidad] || ESTILO_SEVERIDAD.BAJA;
                const claseEstado = ESTILO_ESTADO[it.estado] || "bg-[#F1F5F9] text-[#64748B]";
                const esError = ESTADOS_CON_ERROR.has(it.estado);
                const tieneExpulsion = Boolean(it.idExpulsion) || it.estudianteRetirado;
                const revocada = it.esRevocada;
                const borde = esError
                  ? "border-[#FCA5A5]"
                  : it.local
                    ? "border-[#FDE68A]"
                    : "border-[#E2E8F0]";
                return (
                  <article
                    key={claveItem}
                    className={`group relative overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md ${borde}`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${estiloSeveridad.barra}`} />

                    <div className="pl-4 pr-3.5 py-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-black tracking-wider text-[#124B83] bg-[#F0F6FC] border border-[#B6D3EE] rounded-md px-1.5 py-0.5">
                            {textoInterfaz(it.local ? "SIN SINCRONIZAR" : it.codigo)}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${claseEstado}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {textoInterfaz(textoEstado(it))}
                          </span>
                          {tieneExpulsion && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] px-2 py-0.5 text-[10px] font-black">
                              <UserMinus className="w-3 h-3" />
                              {revocada ? "Expulsión revocada" : "Estudiante retirado"}
                            </span>
                          )}
                          {it.evidenciaPendiente && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F6FC] text-[#124B83] border border-[#B6D3EE] px-2 py-0.5 text-[10px] font-black">
                              <CloudUpload className="w-3 h-3" />
                              Foto pendiente
                            </span>
                          )}
                        </div>
                        {it.fechaHora && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#9AA8BA] shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatearFecha(it.fechaHora)} · {formatearHora(it.fechaHora)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-col gap-1">
                        <div className="flex items-start gap-2 text-sm font-black text-[#08264A]">
                          <span className="text-[#B91C1C] font-bold text-[10px]">Tipo:</span>
                          <span>{textoTipo(it)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm font-black text-[#08264A]">
                          <span className="text-[#B91C1C] font-bold text-[10px]">Accion:</span>
                          <span>{textoAccion(it)}</span>
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#7A8BA0]">
                        {it.estudiante && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {it.estudiante}
                          </span>
                        )}
                        {it.aula && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {it.aula}
                          </span>
                        )}
                        {it.reportadoPor && (
                          <span className="inline-flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            {it.reportadoPor}
                          </span>
                        )}
                      </div>

                      {it.descripcion && (
                        <p className="mt-1.5 text-[11px] leading-snug text-[#64748B] line-clamp-2">
                          {textoInterfaz(it.descripcion)}
                        </p>
                      )}

                      {esError && it.ultimoError && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-2.5 py-1.5 text-[10.5px] font-bold text-[#B91C1C]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>Motivo del rechazo: {it.ultimoError}</span>
                        </div>
                      )}

                      {rol === "DOCENTE" && !revocada && it.estado !== "REVOCADA" && (
                        <div className="mt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => fnAbrirRevocar(it)}
                            disabled={idRevocando === claveItem}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-white px-2.5 py-1 text-[11px] font-black text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {idRevocando === claveItem ? "Revocando…" : "Revocar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}</>} />
{incidenciasFiltradas.map((it) => {
                const claveItem = it.local ? it.clientUuid : (it.idExpulsion || it.idIncidencia);
                const estiloSeveridad = ESTILO_SEVERIDAD[it.severidad] || ESTILO_SEVERIDAD.BAJA;
                const claseEstado = ESTILO_ESTADO[it.estado] || "bg-[#F1F5F9] text-[#64748B]";
                const esError = ESTADOS_CON_ERROR.has(it.estado);
                const tieneExpulsion = Boolean(it.idExpulsion) || it.estudianteRetirado;
                const revocada = it.esRevocada;
                const borde = esError
                  ? "border-[#FCA5A5]"
                  : it.local
                    ? "border-[#FDE68A]"
                    : "border-[#E2E8F0]";
                return (
                  <article
                    key={claveItem}
                    className={`group relative overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md ${borde}`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${estiloSeveridad.barra}`} />

                    <div className="pl-4 pr-3.5 py-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-black tracking-wider text-[#124B83] bg-[#F0F6FC] border border-[#B6D3EE] rounded-md px-1.5 py-0.5">
                            {textoInterfaz(it.local ? "SIN SINCRONIZAR" : it.codigo)}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${claseEstado}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {textoInterfaz(textoEstado(it))}
                          </span>
                          {tieneExpulsion && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] px-2 py-0.5 text-[10px] font-black">
                              <UserMinus className="w-3 h-3" />
                              {revocada ? "Expulsión revocada" : "Estudiante retirado"}
                            </span>
                          )}
                          {it.evidenciaPendiente && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F6FC] text-[#124B83] border border-[#B6D3EE] px-2 py-0.5 text-[10px] font-black">
                              <CloudUpload className="w-3 h-3" />
                              Foto pendiente
                            </span>
                          )}
                        </div>
                        {it.fechaHora && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#9AA8BA] shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatearFecha(it.fechaHora)} · {formatearHora(it.fechaHora)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-col gap-1">
                        <div className="flex items-start gap-2 text-sm font-black text-[#08264A]">
                          <span className="text-[#B91C1C] font-bold text-[10px]">Tipo:</span>
                          <span>{textoTipo(it)}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm font-black text-[#08264A]">
                          <span className="text-[#B91C1C] font-bold text-[10px]">Accion:</span>
                          <span>{textoAccion(it)}</span>
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#7A8BA0]">
                        {it.estudiante && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {it.estudiante}
                          </span>
                        )}
                        {it.aula && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {it.aula}
                          </span>
                        )}
                        {it.reportadoPor && (
                          <span className="inline-flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            {it.reportadoPor}
                          </span>
                        )}
                      </div>

                      {it.descripcion && (
                        <p className="mt-1.5 text-[11px] leading-snug text-[#64748B] line-clamp-2">
                          {textoInterfaz(it.descripcion)}
                        </p>
                      )}

                      {esError && it.ultimoError && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-2.5 py-1.5 text-[10.5px] font-bold text-[#B91C1C]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>Motivo del rechazo: {it.ultimoError}</span>
                        </div>
                      )}

                      {rol === "DOCENTE" && !revocada && it.estado !== "REVOCADA" && (
                        <div className="mt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => fnAbrirRevocar(it)}
                            disabled={idRevocando === claveItem}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FCA5A5] bg-white px-2.5 py-1 text-[11px] font-black text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {idRevocando === claveItem ? "Revocando…" : "Revocar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ModalRevocar
        boolAbierto={modalRevocarAbierto}
        onCerrar={() => {
          setModalRevocarAbierto(false);
          setItemARevocar(null);
          setStrErrorRevocar("");
        }}
        onConfirmar={fnConfirmarRevocacion}
        boolGuardando={idRevocando !== null}
        error={strErrorRevocar}
      />
    </div>
  );
}
