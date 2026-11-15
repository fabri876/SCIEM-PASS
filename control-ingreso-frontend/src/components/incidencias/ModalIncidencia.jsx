import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  BarChart2,
  Upload,
  CheckCircle2,
  Check,
  UserMinus,
  FileText,
  X,
  Search,
  Building,
  WifiOff,
} from "lucide-react";
import {
  consultarEstudianteIncidencia,
  registrarIncidencia,
  cerrarIncidencia,
  notificarCambioIncidencias,
} from "../../services/incidenciaService";
import { formatearFecha, formatearHora, validarImagen, etiquetaAula } from "./utilidadesIncidencias";
import { incidenciaRepo } from "../../offline/incidenciaRepo";
import { evidenciaRepo } from "../../offline/evidenciaRepo";
import { obtenerUsuarioActual } from "../../services/authService";
import {
  buscarEstudianteIncidenciaLocal,
  estaOfflineIncidencia,
} from "../../offline/incidenciaOffline";

const CATALOGO_TIPOS = [
  { codigo: "SUPLANTACION", etiqueta: "Suplantación" },
  { codigo: "OBJETO_PROHIBIDO", etiqueta: "Objeto prohibido" },
  { codigo: "CONDUCTA_INAPROPIADA", etiqueta: "Conducta inapropiada" },
  { codigo: "FALLA_TECNICA", etiqueta: "Falla técnica" },
  { codigo: "PROBLEMA_AULA", etiqueta: "Problema del aula" },
  { codigo: "OTRO", etiqueta: "Otro" },
];

const CATALOGO_ACCIONES = [
  { codigo: "REGISTRO", etiqueta: "Registro de la incidencia", nivel: 1 },
  { codigo: "ADVERTENCIA_VERBAL", etiqueta: "Advertencia verbal", nivel: 2 },
  { codigo: "ADVERTENCIA_ESCRITA", etiqueta: "Advertencia escrita", nivel: 3 },
  { codigo: "CAMBIO_ASIENTO", etiqueta: "Cambio de asiento", nivel: 4 },
  { codigo: "RETIRO_MATERIAL", etiqueta: "Retiro del material/dispositivo", nivel: 5 },
  { codigo: "DESCUENTO_PUNTAJE", etiqueta: "Descuento de puntos", nivel: 6 },
  { codigo: "ANULACION_PREGUNTA", etiqueta: "Anulación de pregunta/sección", nivel: 7 },
  { codigo: "ANULACION_EXAMEN", etiqueta: "Anulación del examen", nivel: 8 },
  { codigo: "OTRO", etiqueta: "Otro", nivel: 9 },
];

const CATALOGO_SEVERIDADES = [
  { codigo: "BAJA", etiqueta: "Baja", color: "bg-[#4A97D3] text-white" },
  { codigo: "MEDIA", etiqueta: "Media", color: "bg-[#1860A3] text-white" },
  { codigo: "ALTA", etiqueta: "Alta", color: "bg-[#B91C1C] text-white" },
];

const DESCRIPCION_MIN = 15;
const DESCRIPCION_MAX = 500;

function nuevaClaveSolicitud() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16)
      );
}

function mapearSeveridad(codigoAccion) {
  const mapa = {
    REGISTRO: "BAJA",
    ADVERTENCIA_VERBAL: "BAJA",
    ADVERTENCIA_ESCRITA: "MEDIA",
    CAMBIO_ASIENTO: "MEDIA",
    RETIRO_MATERIAL: "MEDIA",
    DESCUENTO_PUNTAJE: "MEDIA",
    ANULACION_PREGUNTA: "ALTA",
    ANULACION_EXAMEN: "ALTA",
    EXPULSION_EXAMEN: "ALTA",
  };
  return mapa[codigoAccion] || "BAJA";
}

/**
 * Registrar incidencia (HU06).
 *
 * - aulasDisponibles: aulas de examen ASIGNADAS al usuario (GET /api/incidencias/aulas-asignadas).
 *   Se puede registrar el día del examen o después.
 * - boolAulaFija: cuando se abre desde el control de ingreso de un examen, el
 *   examen/aula ya está decidido y se muestra como dato fijo (sin selector).
 * - estudianteInicial: viene de "Registrar incidencia" en el ingreso excepcional
 *   ({ nombreCompleto, ci, codSis, estado, horaIngresoPrevio }).
 */
export default function ModalIncidencia({
  boolAbierto,
  onCerrar,
  aulasDisponibles = [],
  aulaPreseleccionada = null,
  boolAulaFija = false,
  boolExamenActivo = true,
  estudianteInicial = null,
  onExito,
}) {
  // Clave de solicitud: una por apertura del formulario, para que un doble
  // clic no registre la incidencia dos veces.
  const [claveSolicitud, setClaveSolicitud] = useState("");

  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [severidadSeleccionada, setSeveridadSeleccionada] = useState(null);
  const [strDescripcion, setStrDescripcion] = useState("");
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [strFotoPreview, setStrFotoPreview] = useState(null);

  const [aulaSeleccionada, setAulaSeleccionada] = useState(null);

  const [strBusquedaEstudiante, setStrBusquedaEstudiante] = useState("");
  const [estudianteInvolucrado, setEstudianteInvolucrado] = useState(null);
  const [boolBuscandoEstudiante, setBoolBuscandoEstudiante] = useState(false);
  const [strErrorBusquedaEstudiante, setStrErrorBusquedaEstudiante] = useState("");
  const [strAvisoBusqueda, setStrAvisoBusqueda] = useState("");

  const [boolGuardando, setBoolGuardando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strExito, setStrExito] = useState("");
  const [strHoraActual, setStrHoraActual] = useState("");
  const [boolOffline, setBoolOffline] = useState(false);
  const [retirarEstudiante, setRetirarEstudiante] = useState(false);
  const [boolEsExpulsion, setBoolEsExpulsion] = useState(false);
  const [strOtroDetalle, setStrOtroDetalle] = useState("");
  const [strOtroDetalleAccion, setStrOtroDetalleAccion] = useState("");
  const [accionSeleccionada, setAccionSeleccionada] = useState(null);
  const [strPuntajeReducir, setStrPuntajeReducir] = useState("");
  const [boolCerrandoExpulsion, setBoolCerrandoExpulsion] = useState(false);

  // Se reinicia SOLO al abrir. Antes dependía también de las listas que manda
  // la sección (que se recrean en cada render) y el formulario se borraba solo
  // mientras el usuario escribía, cambiando además la clave de solicitud.
  useEffect(() => {
    if (!boolAbierto) return;

    setClaveSolicitud(nuevaClaveSolicitud());
    setStrHoraActual(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setTipoSeleccionado(null);
    setSeveridadSeleccionada(null);
    setStrDescripcion("");
    setArchivoFoto(null);
    setStrFotoPreview(null);
    setStrError("");
    setStrExito("");
    setStrErrorBusquedaEstudiante("");
    setStrAvisoBusqueda("");
    setBoolGuardando(false);
    setRetirarEstudiante(false);
    setBoolEsExpulsion(false);
    setStrOtroDetalle("");
    setStrOtroDetalleAccion("");
    setAccionSeleccionada(null);
    setStrPuntajeReducir("");
    setBoolCerrandoExpulsion(false);

    setAulaSeleccionada(aulaPreseleccionada || aulasDisponibles[0] || null);

    // Sin conexión el formulario trabaja con la nómina descargada y deja el
    // registro en la cola local (HU21).
    setBoolOffline(false);
    estaOfflineIncidencia()
      .then((offline) => setBoolOffline(offline))
      .catch(() => { });

    if (estudianteInicial) {
      setEstudianteInvolucrado(estudianteInicial);
      setStrBusquedaEstudiante(estudianteInicial.ci || String(estudianteInicial.codSis || ""));
      // Si el estudiante inicial ya fue retirado, no se puede expulsar de nuevo.
      if (estudianteInicial.estado === "RETIRADO") {
        setBoolEsExpulsion(false);
        setRetirarEstudiante(false);
      }
    } else {
      setEstudianteInvolucrado(null);
      setStrBusquedaEstudiante("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolAbierto]);

  // Cerrar con ESC, igual que "Cancelar".
  useEffect(() => {
    if (!boolAbierto) return;
    const fnTecla = (e) => {
      if (e.key === "Escape" && !boolGuardando) {
        e.preventDefault();
        if (onCerrar) onCerrar();
      }
    };
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, boolGuardando, onCerrar]);

  if (!boolAbierto) return null;

  const idAmbienteActual = aulaSeleccionada?.idAmbiente ?? null;

  // Determina si un examen está "en curso" (fecha hoy y hora entre inicio y fin).
  // Usa la fecha/hora LOCAL del navegador para evitar desajustes de zona horaria (UTC).
  const esExamenEnCurso = (aula) => {
    if (!aula?.fechaExamen || !aula?.horaInicio || !aula?.horaFin) return false;
    const ahora = new Date();
    const hoyLocal = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fechaExamenLocal = new Date(String(aula.fechaExamen) + "T00:00:00");
    if (fechaExamenLocal.getTime() !== hoyLocal.getTime()) return false;
    const [hI, mI] = String(aula.horaInicio).split(":").map(Number);
    const [hF, mF] = String(aula.horaFin).split(":").map(Number);
    const inicio = new Date(ahora); inicio.setHours(hI, mI, 0, 0);
    const fin = new Date(ahora); fin.setHours(hF, mF, 0, 0);
    return ahora >= inicio && ahora <= fin;
  };

  // Cuando se marca "Expulsar", solo se muestran exámenes en curso.
  const aulasDisponiblesFiltradas = boolEsExpulsion
    ? aulasDisponibles.filter(esExamenEnCurso)
    : aulasDisponibles;

  const estudianteYaRetirado = estudianteInvolucrado?.estado === "RETIRADO";
  const descripcionValida = strDescripcion.trim().length >= DESCRIPCION_MIN;
  const otroValido = strOtroDetalle.trim().length > 0;
  const strDetalleOtro = strOtroDetalle.trim();
  const strDetalleOtroCapitalizado = strDetalleOtro
    ? strDetalleOtro.charAt(0).toUpperCase() + strDetalleOtro.slice(1)
    : "";
  const strDetalleOtroAccion = strOtroDetalleAccion.trim();
  const strDetalleOtroAccionCapitalizado = strDetalleOtroAccion
    ? strDetalleOtroAccion.charAt(0).toUpperCase() + strDetalleOtroAccion.slice(1)
    : "";
  const maxDescripcion = DESCRIPCION_MAX;
  const strDescripcionFinal = strDescripcion.trim();
    const faltantes = [
      !idAmbienteActual && "el aula del examen",
      !tipoSeleccionado && "el tipo",
      !accionSeleccionada && "la acción",
      !severidadSeleccionada && "la severidad",
      accionSeleccionada === "DESCUENTO_PUNTAJE" && !strPuntajeReducir && "el puntaje a reducir",
      tipoSeleccionado === "OTRO" && !otroValido && "la especificación del tipo Otro",
      accionSeleccionada === "OTRO" && !strOtroDetalleAccion.trim() && "la especificación de la acción Otro",
      !estudianteInvolucrado && "el estudiante involucrado",
      !descripcionValida && `una descripción de al menos ${DESCRIPCION_MIN} caracteres`,
      retirarEstudiante && !estudianteInvolucrado && "el estudiante a retirar",
      retirarEstudiante && estudianteYaRetirado && "no se puede expulsar a un estudiante ya retirado",
      retirarEstudiante && boolAulaFija && !boolExamenActivo && "el examen debe estar en curso para registrar una expulsión",
      retirarEstudiante && boolAulaFija && aulasDisponiblesFiltradas.length === 0 &&
        "un examen en curso para registrar la expulsión",
    ].filter(Boolean);
  const puedeRegistrar =
    faltantes.length === 0 && !boolGuardando && !strExito && !estudianteYaRetirado && !strErrorBusquedaEstudiante &&
    !(boolEsExpulsion && aulasDisponiblesFiltradas.length === 0);

  const fnCambiarAula = (strIdAmbiente) => {
    const encontrada = aulasDisponibles.find((a) => String(a.idAmbiente) === strIdAmbiente);
    setAulaSeleccionada(encontrada || null);
    // El estado del estudiante (si ingresó o no) depende del examen: se vuelve a buscar.
    setEstudianteInvolucrado(null);
    setStrErrorBusquedaEstudiante("");
    setBoolEsExpulsion(false);
    setRetirarEstudiante(false);
  };

  const fnBuscarEstudianteInvolucrado = async (e) => {
    if (e) e.preventDefault();
    const query = strBusquedaEstudiante.trim();
    if (!query || !idAmbienteActual) return;

    const idExamen = aulaSeleccionada?.idExamen ?? null;
    const buscarEnNominaLocal = () =>
      buscarEstudianteIncidenciaLocal({ idExamen, consulta: query });

    setBoolBuscandoEstudiante(true);
    setStrErrorBusquedaEstudiante("");
    setStrAvisoBusqueda("");
    setEstudianteInvolucrado(null);
    setBoolEsExpulsion(false);
    setRetirarEstudiante(false);

    try {
      let data;
      let origenLocal = false;

      if (await estaOfflineIncidencia()) {
        // Sin conexión: se consulta directo a la nómina guardada en el equipo.
        data = await buscarEnNominaLocal();
        origenLocal = true;
      } else {
        try {
          data = await consultarEstudianteIncidencia(idAmbienteActual, query);
        } catch (errServidor) {
          // Servidor inalcanzable (timeout o red caída): respaldo local.
          if (errServidor?.offline) {
            data = await buscarEnNominaLocal();
            origenLocal = true;
          } else {
            throw errServidor;
          }
        }
      }

      if (origenLocal && data?.estado !== "SIN_NOMINA") {
        setStrAvisoBusqueda("Sin conexión: se usó la nómina descargada en este equipo.");
      }
      if (data?.estado === "SIN_NOMINA") {
        setStrErrorBusquedaEstudiante(
          data.mensaje || "Sin conexión y sin nómina descargada para este examen."
        );
        return;
      }

      if (data && data.estado !== "NO_ENCONTRADO" && data.estado !== "NO_INSCRITO" && data.estado !== "SIN_INGRESO") {
        setEstudianteInvolucrado({
          nombreCompleto: data.nombreCompleto,
          ci: data.ci,
          codSis: data.codSis,
          estado: data.estado,
          horaIngresoPrevio: data.horaIngresoPrevio,
        });
        // Si ya fue expulsado no se puede volver a expulsar ni registrar más incidencias.
        if (data.estado === "RETIRADO") {
          setBoolEsExpulsion(false);
          setRetirarEstudiante(false);
        }
      } else {
        setStrErrorBusquedaEstudiante(
          data?.estado === "NO_INSCRITO"
            ? data.mensaje || "El estudiante no está inscrito en la materia de este examen."
            : data?.estado === "SIN_INGRESO"
            ? data.mensaje || "El estudiante no ha ingresado a este examen; no se puede registrar una incidencia para él."
            : data?.mensaje || "Estudiante no encontrado"
        );
      }
    } catch (err) {
      setStrErrorBusquedaEstudiante(err.message || "No se pudo buscar al estudiante.");
    } finally {
      setBoolBuscandoEstudiante(false);
    }
  };

  const fnSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const strErrorArchivo = validarImagen(file);
    if (strErrorArchivo) {
      setStrError(strErrorArchivo);
      return;
    }
    setArchivoFoto(file);
    setStrFotoPreview(URL.createObjectURL(file));
    setStrError("");
  };

  const fnLimpiarFoto = () => {
    setArchivoFoto(null);
    if (strFotoPreview) {
      URL.revokeObjectURL(strFotoPreview);
      setStrFotoPreview(null);
    }
  };

  const fnRegistrar = async (e) => {
    if (e) e.preventDefault();
    if (estudianteYaRetirado) {
      setStrError("Este estudiante ya fue expulsado de este examen; no se pueden registrar más incidencias para él.");
      return;
    }
    if (!puedeRegistrar) {
      if (faltantes.length) setStrError(`Falta ${faltantes.join(", ")}.`);
      return;
    }

    // Expulsión solo permitida si el examen está en curso (solo aplica en control de ingreso con aula fija).
    if (retirarEstudiante && boolAulaFija && !boolExamenActivo) {
      setStrError("No se puede registrar la expulsión: el examen no está en curso.");
      return;
    }

    setBoolGuardando(true);
    setStrError("");

    // Nunca volver a expulsar a un estudiante ya retirado (el backend también lo valida).
    const boolRetirarAhora = retirarEstudiante && !estudianteYaRetirado;

    const datosIncidencia = {
      idAmbiente: idAmbienteActual,
      idExamen: aulaSeleccionada?.idExamen ?? null,
      tipo: tipoSeleccionado,
      accion: accionSeleccionada,
      detalleTipoOtro: tipoSeleccionado === "OTRO" ? strDetalleOtroCapitalizado : null,
      detalleAccionOtro: accionSeleccionada === "OTRO" ? strDetalleOtroAccionCapitalizado : null,
      puntajeReducir: strPuntajeReducir ? parseFloat(strPuntajeReducir) : null,
      severidad: severidadSeleccionada,
      descripcion: strDescripcionFinal,
      codSisEstudiante: estudianteInvolucrado?.codSis || null,
      retirarEstudiante: boolRetirarAhora,
      registradoEn: new Date().toISOString(),
    };
    const guardarOffline = async () => {
      const usuario = obtenerUsuarioActual();
      const creadoPor = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.correo ?? null;
      const clientUuid = await incidenciaRepo.encolar({ ...datosIncidencia, creadoPor });
      if (boolRetirarAhora) {
        await incidenciaRepo.encolarExpulsion({
          incidenciaClientUuid: clientUuid,
          codSisEstudiante: estudianteInvolucrado?.codSis,
          examenId: aulaSeleccionada?.idExamen,
          idAmbiente: idAmbienteActual,
          motivo: strDescripcionFinal,
          registradoEn: datosIncidencia.registradoEn,
          reportadoPor: creadoPor,
          nombreEstudiante: estudianteInvolucrado?.nombreCompleto || null,
          detalleTipoOtro: tipoSeleccionado === "OTRO" ? strDetalleOtroCapitalizado : null,
          detalleAccionOtro: accionSeleccionada === "OTRO" ? strDetalleOtroAccionCapitalizado : null,
        });
      }
      // La foto se guarda como Blob en IndexedDB y se sube al sincronizar (CA11/CA25).
      let notaFoto = "";
      if (archivoFoto) {
        try {
          await evidenciaRepo.guardar(clientUuid, archivoFoto);
          notaFoto = " La foto de evidencia quedó guardada y se enviará junto con la incidencia.";
        } catch {
          notaFoto = " La foto de evidencia no se pudo guardar en el dispositivo.";
        }
      }
      setStrExito((boolRetirarAhora
        ? "Sin conexión. La expulsión se guardó en tu dispositivo y se enviará automáticamente al recuperar la señal."
        : "Sin conexión. La incidencia se guardó en tu dispositivo y se enviará automáticamente al recuperar la señal.") + notaFoto);
      notificarCambioIncidencias();
      setTimeout(() => {
        if (onExito) onExito({ clientUuid, offline: true });
        onCerrar();
      }, 1200);
    };

    try {
      if (await estaOfflineIncidencia()) {
        await guardarOffline();
        return;
      }

      const respuesta = await registrarIncidencia({
        claveSolicitud,
        ...datosIncidencia,
        evidencia: archivoFoto,
      });

      if (boolEsExpulsion && boolRetirarAhora) {
        setBoolCerrandoExpulsion(true);
        try {
          await cerrarIncidencia(respuesta.idIncidencia, strDescripcionFinal);
          setStrExito(`Expulsión ${respuesta?.codigo || ""} registrada y cerrada. El estudiante fue retirado del examen.`.replace("  ", " "));
        } catch (errCerrar) {
          setStrError(`Expulsión registrada pero no se pudo cerrar: ${errCerrar.message || "error desconocido"}.`);
          setBoolCerrandoExpulsion(false);
          return;
        } finally {
          setBoolCerrandoExpulsion(false);
        }
      } else {
        setStrExito(`Incidencia ${respuesta?.codigo || ""} registrada.`.replace("  ", " "));
      }

      notificarCambioIncidencias();
      setTimeout(() => {
        if (onExito) onExito(respuesta);
        onCerrar();
      }, 900);
    } catch (err) {
      const mensajeServidor = err.message || "";
      const esExamenCancelado = mensajeServidor.includes("Examen cancelado")
        || mensajeServidor.includes("Este examen fue cancelado");
      if (err?.offline || (await estaOfflineIncidencia())) {
        try {
          await guardarOffline();
        } catch (errorOffline) {
          setStrError(errorOffline.message || "No se pudo guardar la incidencia en el dispositivo.");
          setBoolGuardando(false);
        }
      } else if (esExamenCancelado) {
        setStrError(mensajeServidor);
        setBoolGuardando(false);
        setTimeout(() => {
          onCerrar();
        }, 600);
      } else {
        setStrError(mensajeServidor || "Ocurrió un error al registrar la incidencia.");
        setBoolGuardando(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto border border-[#CBD5E1] animate-in fade-in zoom-in-95 duration-200">

        {/* Cabecera */}
        <div className="p-5 border-b border-[#CBD5E1] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-[#F0F6FC] text-[#4A97D3] border border-[#B6D3EE] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-[#003770]">Registrar Incidencia</h3>
              {!boolAulaFija && (
                <p className="text-[11px] text-[#7A8BA0] font-bold flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Building className="w-3 h-3 text-[#9AA8BA] shrink-0" />
                  <span>
                    {aulaSeleccionada
                      ? `${aulaSeleccionada.aula} · ${aulaSeleccionada.asignatura} · ${formatearFecha(aulaSeleccionada.fechaExamen)}`
                      : "Sin aula seleccionada"}
                    {` · ${strHoraActual} (automático)`}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-[#9AA8BA] hover:text-[#64748B] p-1.5 rounded-full hover:bg-[#F1F5F9] transition cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={fnRegistrar} className="p-5 space-y-4">

          {boolOffline && (
            <div className="bg-[#FEF9E7] border border-[#FDE68A] text-[#92400E] rounded-xl px-3 py-2 text-[11px] font-bold flex items-start gap-2">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Sin conexión: el registro se guardará en este dispositivo y se enviará
                automáticamente al recuperar la señal.
              </span>
            </div>
          )}

          {/* Aula del examen (solo las asignadas) */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1.5">
              Examen y aula <span className="text-[#B91C1C]">*</span>
            </label>
            {aulasDisponiblesFiltradas.length === 0 ? (
              <p className={`rounded-xl p-3 text-xs font-bold ${boolEsExpulsion ? "bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C]" : "bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83]"}`}>
                {boolEsExpulsion
                  ? "No hay exámenes en curso para registrar expulsiones. La expulsión solo puede realizarse mientras el examen está en desarrollo."
                  : "No tienes exámenes asignados que ya se hayan tomado. Primero debe estar asignado el examen."}
              </p>
            ) : boolAulaFija ? (
              <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#08264A]">
                <Building className="w-3.5 h-3.5 text-[#9AA8BA] shrink-0" />
                <span className="min-w-0">{etiquetaAula(aulaSeleccionada)}</span>
                <span className="ml-auto shrink-0 text-[9.5px] uppercase tracking-wider text-[#9AA8BA]">
                  Examen actual
                </span>
              </div>
            ) : (
              <select
                value={idAmbienteActual ?? ""}
                onChange={(e) => fnCambiarAula(e.target.value)}
                className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#08264A] focus:outline-none focus:border-[#4A97D3] transition"
              >
                {aulasDisponiblesFiltradas.map((aula) => (
                  <option key={aula.idAmbiente} value={aula.idAmbiente}>
                    {etiquetaAula(aula)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1.5">
              Tipo <span className="text-[#B91C1C]">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATALOGO_TIPOS.map((tipo) => {
                const isSelected = tipoSeleccionado === tipo.codigo;
                return (
                  <button
                    key={tipo.codigo}
                    type="button"
                    onClick={() => setTipoSeleccionado(tipo.codigo)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                      isSelected
                        ? "bg-[#003770] border-[#003770] text-white shadow-xs"
                        : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {tipo.etiqueta}
                  </button>
                );
              })}
            </div>
            {tipoSeleccionado === "OTRO" && (
              <div className="mt-2 rounded-xl border border-[#B6D3EE] bg-[#F0F6FC] p-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#003770]">
                  <FileText className="w-3.5 h-3.5" />
                  Especifica el tipo <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  value={strOtroDetalle}
                  onChange={(e) => setStrOtroDetalle(e.target.value)}
                  maxLength={80}
                  placeholder="Describe brevemente el tipo de incidencia..."
                  className="mt-1.5 w-full bg-white border border-[#B6D3EE] rounded-xl px-3 py-2 text-xs font-semibold text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3] transition"
                />
              </div>
            )}
          </div>

          {/* Estudiante involucrado (opcional) */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1">
              Estudiante involucrado <span className="text-[#9AA8BA] font-normal">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#9AA8BA] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={strBusquedaEstudiante}
                  onChange={(e) => setStrBusquedaEstudiante(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fnBuscarEstudianteInvolucrado(e);
                  }}
                  placeholder="C.I. o Código SIS"
                  className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3]"
                />
              </div>
              <button
                type="button"
                onClick={fnBuscarEstudianteInvolucrado}
                disabled={boolBuscandoEstudiante || !strBusquedaEstudiante.trim() || !idAmbienteActual}
                className="bg-[#F0F6FC] hover:bg-[#D9E8F7] text-[#1860A3] border border-[#B6D3EE] font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition disabled:opacity-50 shrink-0"
              >
                {boolBuscandoEstudiante ? "Buscando..." : "Buscar"}
              </button>
            </div>

            {strErrorBusquedaEstudiante && (
              <p className="text-[11px] text-[#B91C1C] font-bold mt-1">{strErrorBusquedaEstudiante}</p>
            )}
            {strAvisoBusqueda && (
              <p className="text-[10.5px] text-[#124B83] font-bold mt-1">{strAvisoBusqueda}</p>
            )}

            {estudianteInvolucrado && (
              <div className="mt-2 bg-[#F0F6FC] border border-[#B6D3EE] rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#4A97D3] shrink-0" />
                  <span className="text-xs font-bold text-[#003770]">
                    {estudianteInvolucrado.nombreCompleto}
                    {estudianteInvolucrado.estado === "DESCONOCIDO"
                      ? " · estado de ingreso no comprobado"
                      : estudianteInvolucrado.estado === "RETIRADO"
                      ? " · ya fue expulsado de este examen"
                      : estudianteInvolucrado.horaIngresoPrevio
                      ? ` · ingresó ${formatearHora(estudianteInvolucrado.horaIngresoPrevio)}`
                      : " · no ingresó a este examen"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEstudianteInvolucrado(null);
                    setBoolEsExpulsion(false);
                    setRetirarEstudiante(false);
                  }}
                  className="text-[#124B83] hover:text-[#124B83] p-0.5 shrink-0"
                  title="Quitar estudiante"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {estudianteYaRetirado && (
              <p className="mt-2 bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] rounded-xl px-3 py-2 text-[11px] font-bold">
                Este estudiante ya fue expulsado de este examen. No se pueden registrar más incidencias para él.
              </p>
            )}

            <div
              className={`mt-3 rounded-xl border transition-colors ${
                boolEsExpulsion ? "border-[#B91C1C] bg-[#FEF2F2]" : "border-[#CBD5E1] bg-white"
              }`}
            >
              <label
                className={`flex items-start gap-3 p-3 ${
                  !estudianteInvolucrado || estudianteYaRetirado
                    ? "opacity-55 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={boolEsExpulsion}
                  disabled={!estudianteInvolucrado || estudianteYaRetirado}
                  onChange={(e) => {
                    const marcado = e.target.checked;
                    setBoolEsExpulsion(marcado);
                    setRetirarEstudiante(marcado);
                    if (marcado) {
                      setSeveridadSeleccionada("ALTA");
                    }
                  }}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                    boolEsExpulsion
                      ? "bg-[#B91C1C] border-[#B91C1C]"
                      : "bg-white border-[#CBD5E1]"
                  }`}
                >
                  {boolEsExpulsion && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserMinus
                      className={`w-3.5 h-3.5 shrink-0 ${
                        boolEsExpulsion ? "text-[#B91C1C]" : "text-[#9AA8BA]"
                      }`}
                    />
                    <span
                      className={`text-xs font-extrabold ${
                        boolEsExpulsion ? "text-[#B91C1C]" : "text-[#475569]"
                      }`}
                    >
                      Expulsar al estudiante del examen
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-[#7A8BA0] mt-0.5 leading-relaxed">
                    Acción definitiva: el estudiante no podrá reingresar y la incidencia se cerrará
                    inmediatamente usando la descripción como resolución.
                  </p>
                  {!estudianteInvolucrado && (
                    <p className="text-[10px] font-bold text-[#9AA8BA] mt-1">
                      Busca y selecciona un estudiante para habilitar esta opción.
                    </p>
                  )}
                  {estudianteYaRetirado && (
                    <p className="text-[10px] font-bold text-[#B91C1C] mt-1">
                      Este estudiante ya fue expulsado de este examen; no se puede volver a expulsar.
                    </p>
                  )}
                </div>
              </label>
            </div>
            </div>

          {/* Severidad */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1.5">
              Severidad <span className="text-[#B91C1C]">*</span>
            </label>
            <div className="grid grid-cols-3 border border-[#CBD5E1] rounded-xl overflow-hidden bg-[#F1F5F9] p-1 gap-1">
              {CATALOGO_SEVERIDADES.map((sev) => {
                const isSelected = severidadSeleccionada === sev.codigo;
                return (
                  <button
                    key={sev.codigo}
                    type="button"
                    onClick={() => setSeveridadSeleccionada(sev.codigo)}
                    className={`py-2 text-xs font-extrabold rounded-lg transition text-center cursor-pointer ${
                      isSelected ? sev.color + " shadow-xs" : "text-[#64748B] hover:text-[#08264A]"
                    }`}
                  >
                    {sev.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Acción */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1.5">
              Acción <span className="text-[#B91C1C]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATALOGO_ACCIONES.map((acc) => {
                const isSelected = accionSeleccionada === acc.codigo;
                return (
                  <button
                    key={acc.codigo}
                    type="button"
                    onClick={() => setAccionSeleccionada(acc.codigo)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                      isSelected
                        ? "bg-[#003770] border-[#003770] text-white shadow-xs"
                        : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {acc.etiqueta}
                  </button>
                );
              })}
            </div>
            {accionSeleccionada === "DESCUENTO_PUNTAJE" && (
              <div className="mt-2 rounded-xl border border-[#B6D3EE] bg-[#F0F6FC] p-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#003770]">
                  <BarChart2 className="w-3.5 h-3.5" />
                  Puntaje a reducir <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="number"
                  value={strPuntajeReducir}
                  onChange={(e) => setStrPuntajeReducir(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1.5 w-full bg-white border border-[#B6D3EE] rounded-xl px-3 py-2 text-xs font-semibold text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3] transition"
                />
                <p className="mt-1 text-[10px] text-[#7A8BA0] font-bold">
                  Se descontará este puntaje del resultado final del estudiante.
                </p>
              </div>
            )}
            {accionSeleccionada === "OTRO" && (
              <div className="mt-2 rounded-xl border border-[#B6D3EE] bg-[#F0F6FC] p-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#003770]">
                  <FileText className="w-3.5 h-3.5" />
                  Especifica la acción <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  value={strOtroDetalleAccion}
                  onChange={(e) => setStrOtroDetalleAccion(e.target.value)}
                  maxLength={80}
                  placeholder="Describe brevemente la acción..."
                  className="mt-1.5 w-full bg-white border border-[#B6D3EE] rounded-xl px-3 py-2 text-xs font-semibold text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3] transition"
                />
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <div className="flex justify-between items-center mb-1 gap-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Descripción <span className="text-[#B91C1C]">*</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${descripcionValida ? "text-[#9AA8BA]" : "text-[#B91C1C]"}`}>
                {strDescripcion.length}/{maxDescripcion} {!descripcionValida && `(mín. ${DESCRIPCION_MIN})`}
              </span>
            </div>
            <textarea
              value={strDescripcion}
              onChange={(e) => setStrDescripcion(e.target.value)}
              maxLength={maxDescripcion}
              placeholder="Describe qué ocurrió..."
              rows={3}
              className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-3 text-xs font-medium text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3] transition"
            />
          </div>

          {/* Foto de evidencia */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1">
              Foto de evidencia <span className="text-[#9AA8BA] font-normal">(opcional · JPG o PNG, hasta 5 MB)</span>
            </label>
            {strFotoPreview ? (
              <div className="relative border border-[#CBD5E1] rounded-xl p-2 bg-[#F1F5F9] flex items-center gap-3">
                <img src={strFotoPreview} alt="Evidencia" className="w-14 h-14 object-cover rounded-lg border border-[#CBD5E1]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#08264A] truncate">{archivoFoto?.name}</p>
                  <p className="text-[11px] text-[#9AA8BA] font-semibold">{(archivoFoto?.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={fnLimpiarFoto} className="text-[#B91C1C] hover:text-[#B91C1C] p-1.5 rounded-lg hover:bg-[#FEF2F2] transition" title="Quitar foto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border border-dashed border-[#CBD5E1] hover:border-[#4A97D3] rounded-xl p-3 bg-white flex items-center justify-between gap-3 transition cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-[#F1F5F9] text-[#7A8BA0] flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#475569]">Adjuntar foto de evidencia</span>
                </div>
                <span className="bg-[#F1F5F9] hover:bg-[#CBD5E1] text-[#475569] font-bold text-[11px] px-3 py-1.5 rounded-lg transition shrink-0">Examinar</span>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={fnSeleccionarArchivo} />
              </label>
            )}
          </div>

          {strError && (
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] p-2.5 rounded-xl text-xs font-bold">✕ {strError}</div>
          )}
          {strExito && (
            <div className="bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{strExito}</span>
            </div>
          )}
          {!strError && !strExito && faltantes.length > 0 && (
            <p className="text-[11px] text-[#7A8BA0] font-bold">Para registrar falta {faltantes.join(", ")}.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={boolGuardando}
              className="flex-1 bg-white hover:bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeRegistrar}
              className={`flex-[1.5] disabled:opacity-45 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer ${
                boolEsExpulsion
                  ? "bg-[#B91C1C] hover:bg-[#991B1B]"
                  : "bg-[#003770] hover:bg-[#08264A]"
              }`}
            >
              {boolGuardando || boolCerrandoExpulsion ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : boolEsExpulsion ? (
                <UserMinus className="w-4 h-4 text-white" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#D9E8F7]" />
              )}
              <span>{boolEsExpulsion ? "Registrar y cerrar expulsión" : "Registrar incidencia"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


