import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  UserCheck,
  AlertTriangle,
  Upload,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  X,
  ArrowLeft,
  Clock
} from "lucide-react";
import { obtenerUsuarioActual } from "../../services/authService";
import {
  consultarEstudianteExcepcional,
  autorizarIngresoExcepcional
} from "../../services/ingresoExcepcionalService";
import { notificarCambioIncidencias } from "../../services/incidenciaService";
import { formatearHora, validarImagen, etiquetaAula, textoAforo } from "./utilidadesIncidencias";

const MOTIVOS_EXCEPCION = [
  { codigo: "SIN_CARNET_QR", titulo: "Sin carnet o QR", descripcion: "Identidad verificada con CI físico" },
  { codigo: "NO_FIGURA_EN_LISTA", titulo: "No figura en la lista", descripcion: "Error de habilitación con respaldo" },
  { codigo: "LLEGADA_TARDIA", titulo: "Llegada tardía", descripcion: "Fuera de la tolerancia por causa justificada" },
  { codigo: "TRASLADO_AULA", titulo: "Traslado desde otra aula", descripcion: "Reasignación autorizada por capacidad" },
];

const OBSERVACION_MIN = 20;
const OBSERVACION_MAX = 500;

const ETIQUETA_ESTADO = {
  NO_EN_LISTA: "No figura en la lista",
  INHABILITADO: "Inhabilitado",
  NO_ENCONTRADO: "No encontrado",
  DUPLICADO: "Ya ingresó",
  RETIRADO: "Retirado",
  HABILITADO: "Habilitado",
};

/**
 * Ingreso excepcional (HU06). Solo docente asignado al examen o administrador.
 *
 * - aulasDisponibles: aulas de HOY con el ingreso abierto (GET /api/incidencias/ambientes).
 *   El ingreso excepcional solo se autoriza durante el examen; el backend también lo valida.
 */
export default function ModalIngresoExcepcional({
  boolAbierto,
  onCerrar,
  aulasDisponibles = [],
  aulaPreseleccionada = null,
  onExito,
  onAbrirIncidenciaConEstudiante,
}) {
  const usuarioSesion = obtenerUsuarioActual();
  const strNombreAutoriza = `${usuarioSesion?.nombre || ""} ${usuarioSesion?.apellido || ""}`.trim();
  const inputBusquedaRef = useRef(null);

  // Paso 1: búsqueda y verificación. Paso 2: formulario de ingreso.
  const [paso, setPaso] = useState(1);

  const [strBusqueda, setStrBusqueda] = useState("");
  const [boolBuscando, setBoolBuscando] = useState(false);
  const [strErrorBusqueda, setStrErrorBusqueda] = useState("");
  const [consultaResultado, setConsultaResultado] = useState(null);

  const [aulaSeleccionada, setAulaSeleccionada] = useState(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(null);
  const [strObservacion, setStrObservacion] = useState("");
  const [archivoRespaldo, setArchivoRespaldo] = useState(null);
  const [boolGuardando, setBoolGuardando] = useState(false);
  const [strErrorGuardado, setStrErrorGuardado] = useState("");
  const [strExitoMensaje, setStrExitoMensaje] = useState("");
  const [aforoActual, setAforoActual] = useState(null);

  // Se reinicia SOLO al abrir (antes se reiniciaba en cada render de la sección
  // y el modal volvía al paso 1 mientras se llenaba el formulario).
  useEffect(() => {
    if (!boolAbierto) return;

    setPaso(1);
    setStrBusqueda("");
    setConsultaResultado(null);
    setStrErrorBusqueda("");
    setStrErrorGuardado("");
    setStrExitoMensaje("");
    setStrObservacion("");
    setArchivoRespaldo(null);
    setMotivoSeleccionado(null);
    setBoolGuardando(false);

    const aula = aulaPreseleccionada || aulasDisponibles[0] || null;
    setAulaSeleccionada(aula);
    setAforoActual(aula?.aforo || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolAbierto]);

  if (!boolAbierto) return null;

  const idAmbienteActual = aulaSeleccionada?.idAmbiente ?? null;
  const observacionValida = strObservacion.trim().length >= OBSERVACION_MIN;
  const puedeConfirmar = Boolean(motivoSeleccionado) && observacionValida && !boolGuardando && !strExitoMensaje;

  const fnLimpiarResultado = () => {
    setConsultaResultado(null);
    setStrBusqueda("");
    setStrErrorBusqueda("");
    setTimeout(() => inputBusquedaRef.current?.focus(), 0);
  };

  const fnBuscarEstudiante = async (e) => {
    if (e) e.preventDefault();
    const query = strBusqueda.trim();
    if (!query) {
      setStrErrorBusqueda("Ingresa el CI o Código SIS del estudiante.");
      return;
    }
    if (!idAmbienteActual) return;

    setBoolBuscando(true);
    setStrErrorBusqueda("");
    setConsultaResultado(null);

    try {
      const data = await consultarEstudianteExcepcional(idAmbienteActual, query);
      setConsultaResultado(data);
      if (data?.aforo) setAforoActual(data.aforo);
    } catch (err) {
      setStrErrorBusqueda(err.message || "No se pudo consultar al estudiante.");
    } finally {
      setBoolBuscando(false);
    }
  };

  const fnDerivarAIncidencia = () => {
    const estudiante = consultaResultado && consultaResultado.estado !== "NO_ENCONTRADO"
      ? {
          nombreCompleto: consultaResultado.nombreCompleto,
          ci: consultaResultado.ci,
          codSis: consultaResultado.codSis,
          estado: consultaResultado.estado,
          horaIngresoPrevio: consultaResultado.horaIngresoPrevio,
        }
      : null;
    onCerrar();
    if (onAbrirIncidenciaConEstudiante) onAbrirIncidenciaConEstudiante(estudiante, aulaSeleccionada);
  };

  const fnSeleccionarRespaldo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const strErrorArchivo = validarImagen(file);
    if (strErrorArchivo) {
      setStrErrorGuardado(strErrorArchivo);
      return;
    }
    setArchivoRespaldo(file);
    setStrErrorGuardado("");
  };

  const fnConfirmarIngreso = async () => {
    if (!motivoSeleccionado) {
      setStrErrorGuardado("El motivo es obligatorio.");
      return;
    }
    if (!observacionValida) {
      setStrErrorGuardado(`La observación debe tener al menos ${OBSERVACION_MIN} caracteres.`);
      return;
    }
    if (boolGuardando) return;

    setBoolGuardando(true);
    setStrErrorGuardado("");

    try {
      const respuesta = await autorizarIngresoExcepcional({
        idAmbiente: idAmbienteActual,
        codSis: consultaResultado.codSis,
        motivo: motivoSeleccionado,
        observacion: strObservacion.trim(),
        respaldo: archivoRespaldo,
      });

      if (respuesta?.aforo) setAforoActual(respuesta.aforo);
      setStrExitoMensaje(
        `Ingreso registrado a las ${formatearHora(respuesta?.horaIngreso)} · autorizó ${respuesta?.autorizadoPor || strNombreAutoriza}.`
      );
      notificarCambioIncidencias();
      setTimeout(() => {
        if (onExito) onExito(respuesta);
        onCerrar();
      }, 1200);
    } catch (err) {
      setStrErrorGuardado(err.message || "No se pudo autorizar el ingreso.");
      setBoolGuardando(false);
    }
  };

  const ocupados = aforoActual?.ocupados ?? 0;
  const capacidad = aforoActual?.capacidad ?? null;
  const porcentajeOcupacion = capacidad ? Math.min(100, Math.round((ocupados / capacidad) * 100)) : 0;
  const iniciales = (consultaResultado?.nombreCompleto || "")
    .split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("") || "ES";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

        {/* PASO 1: BÚSQUEDA Y VERIFICACIÓN */}
        {paso === 1 && (
          <div className="flex flex-col">
            <div className="bg-gradient-to-r from-[#1A365D] via-[#2563EB] to-[#DC2626] text-white p-5 relative">
              <button onClick={onCerrar} className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3 h-3" />
                <span>INGRESO EXCEPCIONAL</span>
              </div>
              <h3 className="text-lg font-black tracking-tight pr-8">
                {aulaSeleccionada ? aulaSeleccionada.asignatura : "Sin examen en curso"}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {strNombreAutoriza}{aulaSeleccionada ? ` · ${aulaSeleccionada.aula}` : ""}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {aulasDisponibles.length === 0 ? (
                <p className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-bold">
                  El ingreso excepcional solo se autoriza durante el examen: hoy no tienes aulas con el ingreso abierto.
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Aula</label>
                    <select
                      value={idAmbienteActual ?? ""}
                      onChange={(e) => {
                        const encontrada = aulasDisponibles.find((a) => String(a.idAmbiente) === e.target.value);
                        setAulaSeleccionada(encontrada || null);
                        setAforoActual(encontrada?.aforo || null);
                        setConsultaResultado(null);
                      }}
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] transition"
                    >
                      {aulasDisponibles.map((aula) => (
                        <option key={aula.idAmbiente} value={aula.idAmbiente}>
                          {etiquetaAula(aula)} · {textoAforo(aula.aforo)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={fnBuscarEstudiante} className="space-y-2">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Buscar estudiante (CI o Código SIS)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          ref={inputBusquedaRef}
                          type="text"
                          value={strBusqueda}
                          onChange={(e) => setStrBusqueda(e.target.value)}
                          placeholder="CI o Código SIS"
                          className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={boolBuscando}
                        className="bg-[#1A365D] hover:bg-[#132743] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {boolBuscando ? (
                          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>Buscar</span>
                      </button>
                    </div>
                    {strErrorBusqueda && <p className="text-[11px] text-rose-600 font-bold">{strErrorBusqueda}</p>}
                  </form>
                </>
              )}

              {consultaResultado && (
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    consultaResultado.estado === "DUPLICADO"
                      ? "bg-amber-50/70 border-amber-200"
                      : consultaResultado.estado === "HABILITADO"
                      ? "bg-emerald-50/70 border-emerald-200"
                      : "bg-rose-50/70 border-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {iniciales}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-[#003770]">
                          {consultaResultado.nombreCompleto || "Estudiante no registrado"}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            consultaResultado.estado === "DUPLICADO"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : consultaResultado.estado === "HABILITADO"
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {consultaResultado.estado === "DUPLICADO" ? <Clock className="w-3 h-3" />
                            : consultaResultado.estado === "HABILITADO" ? <CheckCircle2 className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />}
                          <span>{ETIQUETA_ESTADO[consultaResultado.estado] || consultaResultado.estado}</span>
                        </span>
                      </div>
                      {consultaResultado.estado !== "NO_ENCONTRADO" && (
                        <p className="text-xs text-slate-600 font-bold mt-0.5">
                          CI {consultaResultado.ci || "-"} · SIS {consultaResultado.codSis || "-"}
                        </p>
                      )}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11.5px] font-extrabold text-rose-700">
                        {consultaResultado.mensaje}
                      </div>
                    </div>
                  </div>

                  {/* Botones según los flags del backend */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row gap-2">
                    {consultaResultado.puedeAutorizarExcepcional && (
                      <button
                        onClick={() => setPaso(2)}
                        className="flex-1 bg-[#1A365D] hover:bg-[#132743] text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Autorizar ingreso excepcional</span>
                      </button>
                    )}
                    {consultaResultado.puedeRegistrarIncidencia && (
                      <button
                        onClick={fnDerivarAIncidencia}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Registrar incidencia</span>
                      </button>
                    )}
                    {consultaResultado.estado !== "DUPLICADO" && consultaResultado.estado !== "RETIRADO" && (
                      <button type="button" onClick={fnLimpiarResultado} className="text-slate-500 hover:text-slate-700 font-bold text-xs px-3 py-2">
                        Rechazar y continuar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 2: FORMULARIO */}
        {paso === 2 && consultaResultado && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setPaso(1)} disabled={boolGuardando} className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer" title="Volver">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black text-[#003770]">Ingreso Excepcional</h3>
              </div>
              <button onClick={onCerrar} disabled={boolGuardando} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Estudiante */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-300 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">{iniciales}</div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-xs text-[#003770] truncate">{consultaResultado.nombreCompleto}</p>
                <p className="text-[11px] text-slate-500 font-bold">
                  SIS {consultaResultado.codSis} · {ETIQUETA_ESTADO[consultaResultado.estado] || consultaResultado.estado}
                </p>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${motivoSeleccionado ? "text-slate-600" : "text-rose-600"}`}>
                Motivo <span className="text-rose-600">* {!motivoSeleccionado && "(obligatorio)"}</span>
              </label>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl ${motivoSeleccionado ? "" : "ring-2 ring-rose-200 p-1"}`}>
                {MOTIVOS_EXCEPCION.map((mot) => {
                  const isChecked = motivoSeleccionado === mot.codigo;
                  return (
                    <button
                      type="button"
                      key={mot.codigo}
                      onClick={() => setMotivoSeleccionado(mot.codigo)}
                      className={`p-3 rounded-xl border text-xs text-left cursor-pointer transition flex items-start gap-2.5 ${
                        isChecked ? "bg-blue-50/70 border-[#2563EB] text-[#003770] shadow-xs" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${isChecked ? "border-[#2563EB] bg-[#2563EB]" : "border-slate-300"}`}>
                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="font-extrabold block text-xs leading-snug">{mot.titulo}</span>
                        <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{mot.descripcion}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Docente que autoriza: siempre el usuario de la sesión */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">Docente que autoriza</label>
              <input
                type="text"
                value={strNombreAutoriza}
                readOnly
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed"
              />
            </div>

            {/* Observación */}
            <div>
              <div className="flex justify-between items-center mb-1 gap-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Observación <span className="text-rose-600">*</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${observacionValida ? "text-slate-400" : "text-rose-600"}`}>
                  {strObservacion.length}/{OBSERVACION_MAX} {!observacionValida && `(mín. ${OBSERVACION_MIN})`}
                </span>
              </div>
              <textarea
                value={strObservacion}
                onChange={(e) => setStrObservacion(e.target.value)}
                maxLength={OBSERVACION_MAX}
                placeholder="Explica por qué se autoriza el ingreso y qué respaldo presentó..."
                rows={3}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
              />
            </div>

            {/* Respaldo */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                Respaldo <span className="text-slate-400 font-normal">(opcional · JPG o PNG, máx. 5 MB)</span>
              </label>
              <div className="border border-dashed border-slate-300 hover:border-[#2563EB] rounded-xl p-3 bg-white flex items-center justify-between gap-3 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{archivoRespaldo ? archivoRespaldo.name : "Sin archivo"}</p>
                    <p className="text-[10px] text-slate-400">
                      {archivoRespaldo ? `${(archivoRespaldo.size / 1024 / 1024).toFixed(2)} MB` : "Adjuntar es opcional"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {archivoRespaldo && (
                    <button type="button" onClick={() => setArchivoRespaldo(null)} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg" title="Quitar archivo">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer transition">
                    {archivoRespaldo ? "Cambiar" : "Examinar"}
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={fnSeleccionarRespaldo} />
                  </label>
                </div>
              </div>
            </div>

            {/* Aforo */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1 gap-2">
                <span>Aforo {aulaSeleccionada?.aula}</span>
                <span className={porcentajeOcupacion >= 90 ? "text-rose-600" : "text-amber-700"}>{textoAforo(aforoActual)}</span>
              </div>
              {capacidad != null && (
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      porcentajeOcupacion >= 90 ? "bg-rose-500" : porcentajeOcupacion >= 70 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${porcentajeOcupacion}%` }}
                  />
                </div>
              )}
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-blue-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <span>Quedará en el historial de auditoría con tu usuario, la fecha y hora oficiales y tu IP.</span>
            </div>

            {strErrorGuardado && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">✕ {strErrorGuardado}</div>
            )}
            {strExitoMensaje && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{strExitoMensaje}</span>
              </div>
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
                type="button"
                onClick={fnConfirmarIngreso}
                disabled={!puedeConfirmar}
                className="flex-[1.6] bg-[#1A365D] hover:bg-[#132743] disabled:opacity-45 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                {boolGuardando ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>Confirmar ingreso</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
