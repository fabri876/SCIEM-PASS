import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
  Check,
  UserMinus,
  FileText,
  X,
  Search,
  Building,
} from "lucide-react";
import {
  consultarEstudianteIncidencia,
  registrarIncidencia,
  cerrarIncidencia,
  notificarCambioIncidencias,
} from "../../services/incidenciaService";
import { formatearFecha, formatearHora, validarImagen, etiquetaAula } from "./utilidadesIncidencias";
import { incidenciaRepo } from "../../offline/incidenciaRepo";

const CATALOGO_TIPOS = [
  { codigo: "SUPLANTACION", etiqueta: "Suplantación" },
  { codigo: "OBJETO_PROHIBIDO", etiqueta: "Objeto prohibido" },
  { codigo: "CONDUCTA_INAPROPIADA", etiqueta: "Conducta inapropiada" },
  { codigo: "FALLA_TECNICA", etiqueta: "Falla técnica" },
  { codigo: "PROBLEMA_AULA", etiqueta: "Problema del aula" },
  { codigo: "OTRO", etiqueta: "Otro" },
];

const CATALOGO_SEVERIDADES = [
  { codigo: "BAJA", etiqueta: "Baja", color: "bg-emerald-500 text-white" },
  { codigo: "MEDIA", etiqueta: "Media", color: "bg-amber-500 text-white" },
  { codigo: "ALTA", etiqueta: "Alta", color: "bg-rose-600 text-white" },
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

  const [boolGuardando, setBoolGuardando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strExito, setStrExito] = useState("");
  const [strHoraActual, setStrHoraActual] = useState("");
  const [retirarEstudiante, setRetirarEstudiante] = useState(false);
  const [boolEsExpulsion, setBoolEsExpulsion] = useState(false);
  const [strOtroDetalle, setStrOtroDetalle] = useState("");
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
    setBoolGuardando(false);
    setRetirarEstudiante(false);
    setBoolEsExpulsion(false);
    setStrOtroDetalle("");
    setBoolCerrandoExpulsion(false);

    setAulaSeleccionada(aulaPreseleccionada || aulasDisponibles[0] || null);

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
  const estudianteYaRetirado = estudianteInvolucrado?.estado === "RETIRADO";
  const descripcionValida = strDescripcion.trim().length >= DESCRIPCION_MIN;
  const otroValido = strOtroDetalle.trim().length > 0;
  const strDetalleOtro = strOtroDetalle.trim();
  const strDetalleOtroCapitalizado = strDetalleOtro
    ? strDetalleOtro.charAt(0).toUpperCase() + strDetalleOtro.slice(1)
    : "";
  const prefijoOtro =
    tipoSeleccionado === "OTRO" && strDetalleOtroCapitalizado
      ? `${strDetalleOtroCapitalizado}. `
      : "";
  const maxDescripcion = Math.max(DESCRIPCION_MIN, DESCRIPCION_MAX - prefijoOtro.length);
  const strDescripcionFinal = `${prefijoOtro}${strDescripcion.trim()}`;
  const faltantes = [
    !idAmbienteActual && "el aula del examen",
    !tipoSeleccionado && "el tipo",
    tipoSeleccionado === "OTRO" && !otroValido && "la especificación del tipo Otro",
    !severidadSeleccionada && "la severidad",
    !descripcionValida && `una descripción de al menos ${DESCRIPCION_MIN} caracteres`,
    retirarEstudiante && !estudianteInvolucrado && "el estudiante a retirar",
    retirarEstudiante && estudianteYaRetirado && "no se puede expulsar a un estudiante ya retirado",
    retirarEstudiante && boolAulaFija && !boolExamenActivo && "el examen debe estar en curso para registrar una expulsión",
  ].filter(Boolean);
  const puedeRegistrar = faltantes.length === 0 && !boolGuardando && !strExito;

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

    setBoolBuscandoEstudiante(true);
    setStrErrorBusquedaEstudiante("");
    setEstudianteInvolucrado(null);
    setBoolEsExpulsion(false);
    setRetirarEstudiante(false);

    try {
      const data = await consultarEstudianteIncidencia(idAmbienteActual, query);
      if (data && data.estado !== "NO_ENCONTRADO") {
        setEstudianteInvolucrado({
          nombreCompleto: data.nombreCompleto,
          ci: data.ci,
          codSis: data.codSis,
          estado: data.estado,
          horaIngresoPrevio: data.horaIngresoPrevio,
        });
        // Si ya fue retirado no se puede volver a expulsar.
        if (data.estado === "RETIRADO") {
          setBoolEsExpulsion(false);
          setRetirarEstudiante(false);
        }
      } else {
        setStrErrorBusquedaEstudiante("Estudiante no encontrado");
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
      tipo: tipoSeleccionado,
      severidad: severidadSeleccionada,
      descripcion: strDescripcionFinal,
      codSisEstudiante: estudianteInvolucrado?.codSis || null,
      retirarEstudiante: boolRetirarAhora,
      registradoEn: new Date().toISOString(),
    };
    const guardarOffline = async () => {
      const clientUuid = await incidenciaRepo.encolar(datosIncidencia);
      if (boolRetirarAhora) {
        await incidenciaRepo.encolarExpulsion({
          incidenciaClientUuid: clientUuid,
          codSisEstudiante: estudianteInvolucrado?.codSis,
          examenId: aulaSeleccionada?.idExamen,
        });
      }
      setStrExito(boolRetirarAhora
        ? "Sin conexión. La expulsión se guardó en tu dispositivo y se enviará automáticamente al recuperar la señal."
        : "Sin conexión. La incidencia se guardó en tu dispositivo y se enviará automáticamente al recuperar la señal.");
      notificarCambioIncidencias();
      setTimeout(() => {
        if (onExito) onExito({ clientUuid, offline: true });
        onCerrar();
      }, 1200);
    };

    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
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
      if (err.message?.includes("No se pudo conectar") || (typeof navigator !== "undefined" && navigator.onLine === false)) {
        try {
          await guardarOffline();
        } catch (errorOffline) {
          setStrError(errorOffline.message || "No se pudo guardar la incidencia en el dispositivo.");
          setBoolGuardando(false);
        }
      } else {
        setStrError(err.message || "Ocurrió un error al registrar la incidencia.");
        setBoolGuardando(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

        {/* Cabecera */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-[#003770]">Registrar Incidencia</h3>
              {!boolAulaFija && (
                <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Building className="w-3 h-3 text-slate-400 shrink-0" />
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
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={fnRegistrar} className="p-5 space-y-4">

          {/* Aula del examen (solo las asignadas) */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Examen y aula <span className="text-rose-600">*</span>
            </label>
            {aulasDisponibles.length === 0 ? (
              <p className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-bold">
                No tienes exámenes asignados que ya se hayan tomado. Primero debe estar asignado el examen.
              </p>
            ) : boolAulaFija ? (
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="min-w-0">{etiquetaAula(aulaSeleccionada)}</span>
                <span className="ml-auto shrink-0 text-[9.5px] uppercase tracking-wider text-slate-400">
                  Examen actual
                </span>
              </div>
            ) : (
              <select
                value={idAmbienteActual ?? ""}
                onChange={(e) => fnCambiarAula(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] transition"
              >
                {aulasDisponibles.map((aula) => (
                  <option key={aula.idAmbiente} value={aula.idAmbiente}>
                    {etiquetaAula(aula)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Tipo <span className="text-rose-600">*</span>
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
                        ? "bg-[#1A365D] border-[#1A365D] text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {tipo.etiqueta}
                  </button>
                );
              })}
            </div>
            {tipoSeleccionado === "OTRO" && (
              <div className="mt-2 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#1A365D]">
                  <FileText className="w-3.5 h-3.5" />
                  Especifica el tipo <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={strOtroDetalle}
                  onChange={(e) => setStrOtroDetalle(e.target.value)}
                  maxLength={80}
                  placeholder="Describe brevemente el tipo de incidencia..."
                  className="mt-1.5 w-full bg-white border border-[#BFDBFE] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Severidad <span className="text-rose-600">*</span>
            </label>            <div className="grid grid-cols-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1 gap-1">
              {CATALOGO_SEVERIDADES.map((sev) => {
                const isSelected = severidadSeleccionada === sev.codigo;
                const esExpulsion = boolEsExpulsion && sev.codigo !== "ALTA";
                return (
                  <button
                    key={sev.codigo}
                    type="button"
                    onClick={() => setSeveridadSeleccionada(sev.codigo)}
                    disabled={esExpulsion}
                    className={`py-2 text-xs font-extrabold rounded-lg transition text-center cursor-pointer ${
                      isSelected ? sev.color + " shadow-xs" : "text-slate-600 hover:text-slate-900"
                    } ${esExpulsion ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {sev.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estudiante involucrado (opcional) */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
              Estudiante involucrado <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={strBusquedaEstudiante}
                  onChange={(e) => setStrBusquedaEstudiante(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fnBuscarEstudianteInvolucrado(e);
                  }}
                  placeholder="C.I. o Código SIS"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <button
                type="button"
                onClick={fnBuscarEstudianteInvolucrado}
                disabled={boolBuscandoEstudiante || !strBusquedaEstudiante.trim() || !idAmbienteActual}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition disabled:opacity-50 shrink-0"
              >
                {boolBuscandoEstudiante ? "Buscando..." : "Buscar"}
              </button>
            </div>

            {strErrorBusquedaEstudiante && (
              <p className="text-[11px] text-rose-600 font-bold mt-1">{strErrorBusquedaEstudiante}</p>
            )}

            {estudianteInvolucrado && (
              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900">
                    {estudianteInvolucrado.nombreCompleto}
                    {estudianteInvolucrado.estado === "RETIRADO"
                      ? " · ya fue retirado"
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
                  className="text-emerald-700 hover:text-emerald-900 p-0.5 shrink-0"
                  title="Quitar estudiante"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div
              className={`mt-3 rounded-xl border transition-colors ${
                boolEsExpulsion ? "border-[#1A365D] bg-[#EFF6FF]" : "border-slate-200 bg-white"
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
                      ? "bg-[#1A365D] border-[#1A365D]"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {boolEsExpulsion && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserMinus
                      className={`w-3.5 h-3.5 shrink-0 ${
                        boolEsExpulsion ? "text-[#DC2626]" : "text-slate-400"
                      }`}
                    />
                    <span
                      className={`text-xs font-extrabold ${
                        boolEsExpulsion ? "text-[#1A365D]" : "text-slate-700"
                      }`}
                    >
                      Expulsar al estudiante del examen
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5 leading-relaxed">
                    Acción definitiva: el estudiante no podrá reingresar y la incidencia se cerrará
                    inmediatamente usando la descripción como resolución.
                  </p>
                  {!estudianteInvolucrado && (
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      Busca y selecciona un estudiante para habilitar esta opción.
                    </p>
                  )}
                  {estudianteYaRetirado && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1">
                      Este estudiante ya fue retirado de este examen; no se puede volver a expulsar.
                    </p>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <div className="flex justify-between items-center mb-1 gap-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Descripción <span className="text-rose-600">*</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${descripcionValida ? "text-slate-400" : "text-rose-600"}`}>
                {strDescripcion.length}/{maxDescripcion} {!descripcionValida && `(mín. ${DESCRIPCION_MIN})`}
              </span>
            </div>
            <textarea
              value={strDescripcion}
              onChange={(e) => setStrDescripcion(e.target.value)}
              maxLength={maxDescripcion}
              placeholder="Describe qué ocurrió..."
              rows={3}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          {/* Foto de evidencia */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
              Foto de evidencia <span className="text-slate-400 font-normal">(opcional · JPG o PNG, hasta 5 MB)</span>
            </label>
            {strFotoPreview ? (
              <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center gap-3">
                <img src={strFotoPreview} alt="Evidencia" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{archivoFoto?.name}</p>
                  <p className="text-[11px] text-slate-400 font-semibold">{(archivoFoto?.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={fnLimpiarFoto} className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition" title="Quitar foto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border border-dashed border-slate-300 hover:border-[#2563EB] rounded-xl p-3 bg-white flex items-center justify-between gap-3 transition cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Adjuntar foto de evidencia</span>
                </div>
                <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg transition shrink-0">Examinar</span>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={fnSeleccionarArchivo} />
              </label>
            )}
          </div>

          {strError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">✕ {strError}</div>
          )}
          {strExito && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{strExito}</span>
            </div>
          )}
          {!strError && !strExito && faltantes.length > 0 && (
            <p className="text-[11px] text-slate-500 font-bold">Para registrar falta {faltantes.join(", ")}.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={boolGuardando}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeRegistrar}
              className="flex-[1.5] bg-[#1A365D] hover:bg-[#132743] disabled:opacity-45 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              {boolGuardando || boolCerrandoExpulsion ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : boolEsExpulsion ? (
                <UserMinus className="w-4 h-4 text-white" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span>{boolEsExpulsion ? "Registrar y cerrar expulsión" : "Registrar incidencia"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
