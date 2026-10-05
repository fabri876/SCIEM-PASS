import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
  X,
  Search,
  Building,
  Image as ImageIcon,
  UserX,
  ShieldAlert
} from "lucide-react";
import { obtenerUsuarioActual } from "../../services/authService";
import {
  consultarEstudianteIncidencia,
  registrarIncidencia
} from "../../services/incidenciaService";

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

export default function ModalIncidencia({
  boolAbierto,
  onCerrar,
  examenSeleccionado,
  aulasDisponibles = [],
  aulaPreseleccionada = null,
  estudianteInicial = null,
  onExito,
}) {
  const usuarioSesion = obtenerUsuarioActual();

  // Clave de solicitud idempotente (UUID v4)
  const [claveSolicitud, setClaveSolicitud] = useState("");

  // Campos del formulario
  const [tipoSeleccionado, setTipoSeleccionado] = useState("OBJETO_PROHIBIDO");
  const [severidadSeleccionada, setSeveridadSeleccionada] = useState("MEDIA");
  const [strDescripcion, setStrDescripcion] = useState("");
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [strFotoPreview, setStrFotoPreview] = useState(null);
  const [boolRetirarEstudiante, setBoolRetirarEstudiante] = useState(false);

  // Aula seleccionada
  const [aulaSeleccionada, setAulaSeleccionada] = useState(null);

  // Estudiante involucrado (opcional)
  const [strBusquedaEstudiante, setStrBusquedaEstudiante] = useState("");
  const [estudianteInvolucrado, setEstudianteInvolucrado] = useState(null);
  const [boolBuscandoEstudiante, setBoolBuscandoEstudiante] = useState(false);
  const [strErrorBusquedaEstudiante, setStrErrorBusquedaEstudiante] = useState("");

  // Estados de proceso
  const [boolGuardando, setBoolGuardando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strExito, setStrExito] = useState("");

  // Hora actual del sistema
  const [strHoraActual, setStrHoraActual] = useState("");

  useEffect(() => {
    if (boolAbierto) {
      // Generar clave única para esta apertura
      setClaveSolicitud(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9)
      );

      const ahora = new Date();
      setStrHoraActual(
        ahora.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );

      setTipoSeleccionado("OBJETO_PROHIBIDO");
      setSeveridadSeleccionada("MEDIA");
      setStrDescripcion("");
      setArchivoFoto(null);
      setStrFotoPreview(null);
      setBoolRetirarEstudiante(false);
      setStrError("");
      setStrExito("");
      setStrErrorBusquedaEstudiante("");

      const aula = aulaPreseleccionada || (aulasDisponibles.length > 0 ? aulasDisponibles[0] : null);
      setAulaSeleccionada(aula);

      if (estudianteInicial) {
        setEstudianteInvolucrado(estudianteInicial);
        setStrBusquedaEstudiante(
          estudianteInicial.ci || String(estudianteInicial.codSis || "")
        );
        if (estudianteInicial.yaIngreso) {
          setBoolRetirarEstudiante(false);
        }
      } else {
        setEstudianteInvolucrado(null);
        setStrBusquedaEstudiante("");
      }
    }
  }, [boolAbierto, aulaPreseleccionada, aulasDisponibles, estudianteInicial]);

  if (!boolAbierto) return null;

  const idAmbienteActual =
    aulaSeleccionada?.idAmbiente ||
    aulaSeleccionada?.id ||
    aulasDisponibles[0]?.idAmbiente ||
    1;

  // Consulta real al backend de estudiante en el aula
  const fnBuscarEstudianteInvolucrado = async (e) => {
    if (e) e.preventDefault();
    const query = strBusquedaEstudiante.trim();
    if (!query) return;

    setBoolBuscandoEstudiante(true);
    setStrErrorBusquedaEstudiante("");

    try {
      const data = await consultarEstudianteIncidencia(idAmbienteActual, query);
      if (data && data.estado !== "NO_ENCONTRADO") {
        setEstudianteInvolucrado({
          nombre: data.nombreCompleto,
          nombreCompleto: data.nombreCompleto,
          ci: data.ci,
          codSis: data.codSis,
          estado: data.estado,
          horaIngreso: data.horaIngresoPrevio
            ? new Date(data.horaIngresoPrevio).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "07:41",
          puedeRetirar: data.puedeRetirar,
        });
      } else {
        setEstudianteInvolucrado(null);
        setStrErrorBusquedaEstudiante(data?.mensaje || "Estudiante no encontrado en el sistema.");
      }
    } catch (err) {
      console.error("Error al consultar estudiante para incidencia:", err);
      setStrErrorBusquedaEstudiante(err.message || "Error al buscar estudiante.");
    } finally {
      setBoolBuscandoEstudiante(false);
    }
  };

  const fnSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStrError("La foto de evidencia no puede superar los 5 MB.");
        return;
      }
      setArchivoFoto(file);
      const url = URL.createObjectURL(file);
      setStrFotoPreview(url);
      setStrError("");
    }
  };

  const fnLimpiarFoto = () => {
    setArchivoFoto(null);
    if (strFotoPreview) {
      URL.revokeObjectURL(strFotoPreview);
      setStrFotoPreview(null);
    }
  };

  // Registro real en el backend de Marcela
  const fnRegistrar = async (e) => {
    if (e) e.preventDefault();

    if (strDescripcion.trim().length < 15) {
      setStrError("La descripción es obligatoria y debe tener al menos 15 caracteres.");
      return;
    }

    setBoolGuardando(true);
    setStrError("");

    try {
      await registrarIncidencia({
        claveSolicitud,
        idAmbiente: idAmbienteActual,
        tipo: tipoSeleccionado,
        severidad: severidadSeleccionada,
        descripcion: strDescripcion.trim(),
        codSisEstudiante: estudianteInvolucrado?.codSis || null,
        retirarEstudiante: boolRetirarEstudiante,
        evidencia: archivoFoto,
      });

      setStrExito("¡Incidencia registrada y auditada correctamente!");
      setTimeout(() => {
        if (onExito) onExito();
        onCerrar();
      }, 1000);
    } catch (err) {
      console.error("Error al registrar incidencia:", err);
      setStrError(err.message || "Ocurrió un error al registrar la incidencia.");
    } finally {
      setBoolGuardando(false);
    }
  };

  const nombreAulaActual = aulaSeleccionada?.aula || aulaSeleccionada?.nombre || "Aula 601";
  const nombreExamenActual =
    examenSeleccionado?.nombreExamen ||
    examenSeleccionado?.asignatura ||
    "Cálculo I";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del modal */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#003770]">
                Registrar Incidencia
              </h3>
              <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                <Building className="w-3 h-3 text-slate-400" />
                <span>{nombreAulaActual} · {nombreExamenActual} · {strHoraActual} (automático)</span>
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={fnRegistrar} className="p-5 space-y-4">
          
          {/* Tipo de incidencia en Chips (Mockup 06-C) */}
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

          {/* Severidad (Segmented Control) */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Severidad <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1 gap-1">
              {CATALOGO_SEVERIDADES.map((sev) => {
                const isSelected = severidadSeleccionada === sev.codigo;
                return (
                  <button
                    key={sev.codigo}
                    type="button"
                    onClick={() => setSeveridadSeleccionada(sev.codigo)}
                    className={`py-2 text-xs font-extrabold rounded-lg transition text-center cursor-pointer ${
                      isSelected
                        ? sev.color + " shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {sev.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estudiante Involucrado (Opcional) */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
              Estudiante involucrado <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={strBusquedaEstudiante}
                  onChange={(e) => setStrBusquedaEstudiante(e.target.value)}
                  placeholder="Buscar por CI o SIS (ej: 1234567)"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <button
                type="button"
                onClick={fnBuscarEstudianteInvolucrado}
                disabled={boolBuscandoEstudiante || !strBusquedaEstudiante.trim()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition disabled:opacity-50"
              >
                {boolBuscandoEstudiante ? "Buscando..." : "Asignar"}
              </button>
            </div>

            {strErrorBusquedaEstudiante && (
              <p className="text-[11px] text-rose-600 font-bold mt-1">
                {strErrorBusquedaEstudiante}
              </p>
            )}

            {/* Estudiante asignado con check verde */}
            {estudianteInvolucrado && (
              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900">
                    {estudianteInvolucrado.nombreCompleto || estudianteInvolucrado.nombre}
                    {estudianteInvolucrado.horaIngreso && ` · ingresó ${estudianteInvolucrado.horaIngreso}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEstudianteInvolucrado(null);
                    setBoolRetirarEstudiante(false);
                  }}
                  className="text-emerald-700 hover:text-emerald-900 p-0.5"
                  title="Quitar estudiante"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Descripción obligatoria (15 a 500 caracteres) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Descripción <span className="text-rose-600">*</span>
              </label>
              <span
                className={`text-[10px] font-mono font-bold ${
                  strDescripcion.length < 15 ? "text-rose-600" : "text-slate-400"
                }`}
              >
                {strDescripcion.length}/500 {strDescripcion.length < 15 && "(mín. 15 car.)"}
              </span>
            </div>
            <textarea
              value={strDescripcion}
              onChange={(e) => setStrDescripcion(e.target.value)}
              maxLength={500}
              placeholder="Celular encendido debajo de la hoja de respuestas. Se retiró el equipo y se dejó continuar..."
              rows={3}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
            />
          </div>

          {/* Adjuntar foto de evidencia */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
              Adjuntar foto de evidencia <span className="text-slate-400 font-normal">(JPG o PNG, hasta 5 MB)</span>
            </label>
            {strFotoPreview ? (
              <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center gap-3">
                <img
                  src={strFotoPreview}
                  alt="Evidencia"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {archivoFoto?.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {(archivoFoto?.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fnLimpiarFoto}
                  className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border border-dashed border-slate-300 hover:border-[#2563EB] rounded-xl p-3 bg-white flex items-center justify-between gap-3 transition cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      Adjuntar foto de evidencia
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      JPG o PNG, hasta 5 MB
                    </span>
                  </div>
                </div>
                <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg transition">
                  Examinar
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={fnSeleccionarArchivo}
                />
              </label>
            )}
          </div>

          {/* Toggle para Retirar al estudiante del examen (CA-08) */}
          <div
            className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
              estudianteInvolucrado
                ? boolRetirarEstudiante
                  ? "bg-rose-50 border-rose-300"
                  : "bg-slate-50 border-slate-200"
                : "bg-slate-50 border-slate-200 opacity-60"
            }`}
          >
            <div>
              <span className="text-xs font-extrabold text-slate-800 block">
                Retirar al estudiante del examen
              </span>
              <span className="text-[10.5px] text-slate-500 block font-semibold">
                Registra expulsión y lo descuenta de presentes
              </span>
            </div>
            <button
              type="button"
              disabled={!estudianteInvolucrado}
              onClick={() => setBoolRetirarEstudiante(!boolRetirarEstudiante)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                boolRetirarEstudiante ? "bg-rose-600" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  boolRetirarEstudiante ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Mensajes de error o éxito del backend */}
          {strError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">
              ✕ {strError}
            </div>
          )}
          {strExito && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{strExito}</span>
            </div>
          )}

          {/* Botones de acción */}
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
              disabled={boolGuardando || strDescripcion.trim().length < 15}
              className="flex-1.5 bg-[#1A365D] hover:bg-[#132743] disabled:opacity-45 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              {boolGuardando ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span>Registrar incidencia</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
