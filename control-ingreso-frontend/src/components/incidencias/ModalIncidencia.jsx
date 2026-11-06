import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
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
 * - estudianteInicial: viene de "Registrar incidencia" en el ingreso excepcional
 *   ({ nombreCompleto, ci, codSis, estado, horaIngresoPrevio }).
 */
export default function ModalIncidencia({
  boolAbierto,
  onCerrar,
  aulasDisponibles = [],
  aulaPreseleccionada = null,
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
  const [strResolucionExpulsion, setStrResolucionExpulsion] = useState("");
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
    setStrResolucionExpulsion("");
    setBoolCerrandoExpulsion(false);

    setAulaSeleccionada(aulaPreseleccionada || aulasDisponibles[0] || null);

    if (estudianteInicial) {
      setEstudianteInvolucrado(estudianteInicial);
      setStrBusquedaEstudiante(estudianteInicial.ci || String(estudianteInicial.codSis || ""));
    } else {
      setEstudianteInvolucrado(null);
      setStrBusquedaEstudiante("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolAbierto]);

  if (!boolAbierto) return null;

  const idAmbienteActual = aulaSeleccionada?.idAmbiente ?? null;
  const descripcionValida = strDescripcion.trim().length >= DESCRIPCION_MIN;
  const resolucionValida = strResolucionExpulsion.trim().length > 0;
  const faltantes = [
    !idAmbienteActual && "el aula del examen",
    !tipoSeleccionado && "el tipo",
    !severidadSeleccionada && "la severidad",
    !descripcionValida && `una descripción de al menos ${DESCRIPCION_MIN} caracteres`,
    retirarEstudiante && !estudianteInvolucrado && "el estudiante a retirar",
    boolEsExpulsion && !resolucionValida && "la resolución de la expulsión",
  ].filter(Boolean);
  const puedeRegistrar = faltantes.length === 0 && !boolGuardando && !strExito;

  const fnCambiarAula = (strIdAmbiente) => {
    const encontrada = aulasDisponibles.find((a) => String(a.idAmbiente) === strIdAmbiente);
    setAulaSeleccionada(encontrada || null);
    // El estado del estudiante (si ingresó o no) depende del examen: se vuelve a buscar.
    setEstudianteInvolucrado(null);
    setStrErrorBusquedaEstudiante("");
  };

  const fnBuscarEstudianteInvolucrado = async (e) => {
    if (e) e.preventDefault();
    const query = strBusquedaEstudiante.trim();
    if (!query || !idAmbienteActual) return;

    setBoolBuscandoEstudiante(true);
    setStrErrorBusquedaEstudiante("");
    setEstudianteInvolucrado(null);

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

    setBoolGuardando(true);
    setStrError("");

    const datosIncidencia = {
      idAmbiente: idAmbienteActual,
      tipo: tipoSeleccionado,
      severidad: severidadSeleccionada,
      descripcion: strDescripcion.trim(),
      codSisEstudiante: estudianteInvolucrado?.codSis || null,
      retirarEstudiante,
      registradoEn: new Date().toISOString(),
    };
    const guardarOffline = async () => {
      const clientUuid = await incidenciaRepo.encolar(datosIncidencia);
      if (retirarEstudiante) {
        await incidenciaRepo.encolarExpulsion({
          incidenciaClientUuid: clientUuid,
          codSisEstudiante: estudianteInvolucrado?.codSis,
          examenId: aulaSeleccionada?.idExamen,
        });
      }
      setStrExito("Sin conexión. La incidencia se guardó en tu dispositivo y se enviará automáticamente al recuperar la señal.");
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

      if (boolEsExpulsion) {
        setBoolCerrandoExpulsion(true);
        try {
          await cerrarIncidencia(respuesta.idIncidencia, strResolucionExpulsion.trim());
          setStrExito(`Expulsión ${respuesta?.codigo || ""} registrada y cerrada.`.replace("  ", " "));
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
              <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Building className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  {aulaSeleccionada
                    ? `${aulaSeleccionada.aula} · ${aulaSeleccionada.asignatura} · ${formatearFecha(aulaSeleccionada.fechaExamen)}`
                    : "Sin aula seleccionada"}
                  {` · ${strHoraActual} (automático)`}
                </span>
              </p>
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
          </div>

          {/* Severidad */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Severidad <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1 gap-1">
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
                  }}
                  className="text-emerald-700 hover:text-emerald-900 p-0.5 shrink-0"
                  title="Quitar estudiante"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={boolEsExpulsion}
                  disabled={!estudianteInvolucrado}
                  onChange={(e) => {
                    setBoolEsExpulsion(e.target.checked);
                    if (e.target.checked) {
                      setRetirarEstudiante(true);
                      setSeveridadSeleccionada("ALTA");
                    }
                  }}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1 text-xs font-bold text-rose-800">
                    <span>🚫</span>
                    <span>Expulsar al estudiante del examen</span>
                  </div>
                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5 leading-relaxed">
                    Acción definitiva: el estudiante quedará bloqueado para reingresar y la incidencia se cerrará inmediatamente. Requiere resolución obligatoria.
                  </p>
                </div>
              </label>
              {boolEsExpulsion && (
                <div className="mt-2.5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                    Resolución de la expulsión <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    value={strResolucionExpulsion}
                    onChange={(e) => setStrResolucionExpulsion(e.target.value)}
                    placeholder="Justifique la expulsión..."
                    rows={2}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
                  />
                  {!resolucionValida && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1">La resolución es obligatoria para expulsar.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <div className="flex justify-between items-center mb-1 gap-2">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Descripción <span className="text-rose-600">*</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${descripcionValida ? "text-slate-400" : "text-rose-600"}`}>
                {strDescripcion.length}/{DESCRIPCION_MAX} {!descripcionValida && `(mín. ${DESCRIPCION_MIN})`}
              </span>
            </div>
            <textarea
              value={strDescripcion}
              onChange={(e) => setStrDescripcion(e.target.value)}
              maxLength={DESCRIPCION_MAX}
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
                <span className="w-4 h-4 text-rose-500">🚫</span>
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
