import React, { useState, useEffect } from "react";
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

const MOTIVOS_EXCEPCION = [
  {
    codigo: "SIN_CARNET_QR",
    titulo: "Sin carnet o QR",
    descripcion: "Identidad verificada con CI físico",
  },
  {
    codigo: "NO_FIGURA_EN_LISTA",
    titulo: "No figura en la lista",
    descripcion: "Error de habilitación con respaldo",
  },
  {
    codigo: "LLEGADA_TARDIA",
    titulo: "Llegada tardía",
    descripcion: "Fuera de la tolerancia por causa justificada",
  },
  {
    codigo: "TRASLADO_AULA",
    titulo: "Traslado desde otra aula",
    descripcion: "Reasignación autorizada por capacidad",
  },
];

export default function ModalIngresoExcepcional({
  boolAbierto,
  onCerrar,
  examenSeleccionado,
  aulasDisponibles = [],
  aulaPreseleccionada = null,
  onExito,
  onAbrirIncidenciaConEstudiante,
}) {
  const usuarioSesion = obtenerUsuarioActual();

  // Paso 1: Búsqueda y verificación. Paso 2: Formulario de ingreso
  const [paso, setPaso] = useState(1);

  // Estados de búsqueda
  const [strBusqueda, setStrBusqueda] = useState("");
  const [boolBuscando, setBoolBuscando] = useState(false);
  const [strErrorBusqueda, setStrErrorBusqueda] = useState("");
  const [consultaResultado, setConsultaResultado] = useState(null);

  // Estados del formulario
  const [aulaSeleccionada, setAulaSeleccionada] = useState(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState("NO_FIGURA_EN_LISTA");
  const [strObservacion, setStrObservacion] = useState("");
  const [archivoRespaldo, setArchivoRespaldo] = useState(null);
  const [boolGuardando, setBoolGuardando] = useState(false);
  const [strErrorGuardado, setStrErrorGuardado] = useState("");
  const [strExitoMensaje, setStrExitoMensaje] = useState("");
  const [aforoActual, setAforoActual] = useState(null);

  useEffect(() => {
    if (boolAbierto) {
      setPaso(1);
      setStrBusqueda("");
      setConsultaResultado(null);
      setStrErrorBusqueda("");
      setStrErrorGuardado("");
      setStrExitoMensaje("");
      setStrObservacion("");
      setArchivoRespaldo(null);
      setMotivoSeleccionado("NO_FIGURA_EN_LISTA");

      const aula = aulaPreseleccionada || (aulasDisponibles.length > 0 ? aulasDisponibles[0] : null);
      setAulaSeleccionada(aula);
      if (aula?.aforo) {
        setAforoActual(aula.aforo);
      } else {
        setAforoActual({
          ocupados: aula?.ocupados ?? 0,
          capacidad: aula?.capacidad ?? 60,
          disponibles: (aula?.capacidad ?? 60) - (aula?.ocupados ?? 0),
        });
      }
    }
  }, [boolAbierto, aulaPreseleccionada, aulasDisponibles]);

  if (!boolAbierto) return null;

  const idAmbienteActual =
    aulaSeleccionada?.idAmbiente ||
    aulaSeleccionada?.id ||
    aulasDisponibles[0]?.idAmbiente ||
    1;

  // Búsqueda real en el backend de Marcela
  const fnBuscarEstudiante = async (e) => {
    if (e) e.preventDefault();
    const query = strBusqueda.trim();
    if (!query) {
      setStrErrorBusqueda("Ingresa el CI o Código SIS del estudiante.");
      return;
    }

    setBoolBuscando(true);
    setStrErrorBusqueda("");
    setConsultaResultado(null);

    try {
      const data = await consultarEstudianteExcepcional(idAmbienteActual, query);
      setConsultaResultado(data);
      if (data?.aforo) {
        setAforoActual(data.aforo);
      }
    } catch (err) {
      console.error("Error en consulta de estudiante:", err);
      setStrErrorBusqueda(err.message || "No se pudo consultar al estudiante.");
    } finally {
      setBoolBuscando(false);
    }
  };

  const fnContinuarAFormulario = () => {
    if (!consultaResultado || !consultaResultado.puedeAutorizarExcepcional) return;
    setPaso(2);
  };

  const fnDerivarAIncidencia = () => {
    onCerrar();
    if (onAbrirIncidenciaConEstudiante && consultaResultado) {
      onAbrirIncidenciaConEstudiante(
        {
          nombre: consultaResultado.nombreCompleto,
          nombreCompleto: consultaResultado.nombreCompleto,
          ci: consultaResultado.ci,
          codSis: consultaResultado.codSis,
          yaIngreso: consultaResultado.estado === "DUPLICADO",
          horaIngreso: consultaResultado.horaIngresoPrevio,
          aulaIngreso: consultaResultado.aulaIngresoPrevio,
        },
        aulaSeleccionada
      );
    }
  };

  const fnConfirmarIngreso = async () => {
    if (!motivoSeleccionado) {
      setStrErrorGuardado("Debes seleccionar un motivo para el ingreso excepcional.");
      return;
    }

    if (strObservacion.trim().length < 20) {
      setStrErrorGuardado("La observación debe tener al menos 20 caracteres.");
      return;
    }

    if (!consultaResultado?.codSis) {
      setStrErrorGuardado("No se tiene el Código SIS del estudiante.");
      return;
    }

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

      if (respuesta?.aforo) {
        setAforoActual(respuesta.aforo);
      }

      setStrExitoMensaje("¡Ingreso excepcional registrado y auditado con éxito!");
      setTimeout(() => {
        if (onExito) onExito();
        onCerrar();
      }, 1000);
    } catch (err) {
      console.error("Error al registrar ingreso excepcional:", err);
      setStrErrorGuardado(err.message || "No se pudo autorizar el ingreso.");
    } finally {
      setBoolGuardando(false);
    }
  };

  // Cálculo de aforo
  const ocupados = aforoActual?.ocupados ?? aulaSeleccionada?.ocupados ?? 0;
  const capacidad = aforoActual?.capacidad ?? aulaSeleccionada?.capacidad ?? 60;
  const disponibles = aforoActual?.disponibles ?? Math.max(0, capacidad - ocupados);
  const porcentajeOcupacion =
    capacidad > 0 ? Math.min(100, Math.round((ocupados / capacidad) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ================================================================= */}
        {/* PASO 1: BÚSQUEDA Y VERIFICACIÓN (Mockup 06-A) */}
        {/* ================================================================= */}
        {paso === 1 && (
          <div className="flex flex-col">
            <div className="bg-gradient-to-r from-[#1A365D] via-[#2563EB] to-[#DC2626] text-white p-5 relative">
              <button
                onClick={onCerrar}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3 h-3" />
                <span>DOCENTE · INGRESO EXCEPCIONAL</span>
              </div>
              <h3 className="text-lg font-black tracking-tight">
                {examenSeleccionado?.nombreExamen || examenSeleccionado?.asignatura || "Cálculo I · Primer Parcial"}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {usuarioSesion?.nombre} {usuarioSesion?.apellido} · {aulaSeleccionada?.aula || aulaSeleccionada?.nombre || "Aula 601"}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Selector de Aula */}
              {aulasDisponibles.length > 0 && (
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Aula
                  </label>
                  <select
                    value={aulaSeleccionada?.idAmbiente || ""}
                    onChange={(e) => {
                      const encontrada = aulasDisponibles.find(
                        (a) => String(a.idAmbiente) === e.target.value
                      );
                      if (encontrada) {
                        setAulaSeleccionada(encontrada);
                        if (encontrada.aforo) setAforoActual(encontrada.aforo);
                      }
                    }}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] transition"
                  >
                    {aulasDisponibles.map((aula, idx) => (
                      <option key={aula.idAmbiente || idx} value={aula.idAmbiente}>
                        {aula.aula || aula.nombre || `Aula ${idx + 1}`} · {aula.aforo?.ocupados ?? 0} / {aula.aforo?.capacidad ?? 60}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Formulario de Búsqueda */}
              <form onSubmit={fnBuscarEstudiante} className="space-y-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Buscar Estudiante (CI o Código SIS)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={strBusqueda}
                      onChange={(e) => setStrBusqueda(e.target.value)}
                      placeholder="Ej: 9988776 o 202409112"
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={boolBuscando}
                    className="bg-[#1A365D] hover:bg-[#132743] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {boolBuscando ? (
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>
                {strErrorBusqueda && (
                  <p className="text-[11px] text-rose-600 font-bold">{strErrorBusqueda}</p>
                )}
              </form>

              {/* Resultado de la Verificación según ConsultaEstudianteDto */}
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
                      {consultaResultado.nombreCompleto
                        ?.split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("") || "ES"}
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
                          {consultaResultado.estado === "DUPLICADO" ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>
                            {consultaResultado.estado === "NO_EN_LISTA"
                              ? "Denegado"
                              : consultaResultado.estado === "DUPLICADO"
                              ? "Duplicado"
                              : consultaResultado.estado === "INHABILITADO"
                              ? "Inhabilitado"
                              : consultaResultado.estado === "RETIRADO"
                              ? "Retirado"
                              : consultaResultado.estado}
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold mt-0.5">
                        CI {consultaResultado.ci || "-"} · SIS {consultaResultado.codSis || "-"}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11.5px] font-extrabold text-rose-700">
                        {consultaResultado.mensaje}
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción controlados por los flags del backend */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row gap-2">
                    {consultaResultado.puedeAutorizarExcepcional && (
                      <button
                        onClick={fnContinuarAFormulario}
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

                    <button
                      type="button"
                      onClick={() => setConsultaResultado(null)}
                      className="text-slate-500 hover:text-slate-700 font-bold text-xs px-3 py-2"
                    >
                      Rechazar y continuar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PASO 2: FORMULARIO DE INGRESO EXCEPCIONAL (Mockup 06-B) */}
        {/* ================================================================= */}
        {paso === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaso(1)}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  title="Volver"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black text-[#003770]">
                  Ingreso Excepcional
                </h3>
              </div>
              <button
                onClick={onCerrar}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen del estudiante */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-300 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                {consultaResultado?.nombreCompleto
                  ?.split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("") || "CR"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-xs text-[#003770] truncate">
                  {consultaResultado?.nombreCompleto}
                </p>
                <p className="text-[11px] text-slate-500 font-bold">
                  SIS {consultaResultado?.codSis} · {consultaResultado?.mensaje?.slice(0, 40)}...
                </p>
              </div>
            </div>

            {/* Selector de Motivo */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Motivo <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MOTIVOS_EXCEPCION.map((mot) => {
                  const isChecked = motivoSeleccionado === mot.codigo;
                  return (
                    <div
                      key={mot.codigo}
                      onClick={() => setMotivoSeleccionado(mot.codigo)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                        isChecked
                          ? "bg-blue-50/70 border-[#2563EB] text-[#003770] shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          isChecked ? "border-[#2563EB] bg-[#2563EB]" : "border-slate-300"
                        }`}
                      >
                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="font-extrabold block text-xs leading-snug">
                          {mot.titulo}
                        </span>
                        <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                          {mot.descripcion}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observación requerida (20 a 500 caracteres) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  Observación <span className="text-rose-600">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    strObservacion.length < 20 ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {strObservacion.length}/500 {strObservacion.length < 20 && "(mín. 20 car.)"}
                </span>
              </div>
              <textarea
                value={strObservacion}
                onChange={(e) => setStrObservacion(e.target.value)}
                maxLength={500}
                placeholder="Presenta boleta de inscripción 2/2026 sellada. Falta cargarlo en la lista del grupo 3..."
                rows={3}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] transition"
              />
            </div>

            {/* Respaldo / Adjunto opcional */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                Respaldo opcional <span className="text-slate-400 font-normal">(JPG o PNG, máx. 5 MB)</span>
              </label>
              <div className="border border-dashed border-slate-300 hover:border-[#2563EB] rounded-xl p-3 bg-white flex items-center justify-between gap-3 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {archivoRespaldo ? archivoRespaldo.name : "boleta_inscripcion.jpg"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {archivoRespaldo
                        ? `${(archivoRespaldo.size / 1024 / 1024).toFixed(2)} MB`
                        : "Respaldo opcional"}
                    </p>
                  </div>
                </div>
                <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer transition shrink-0">
                  {archivoRespaldo ? "Cambiar" : "Examinar"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setArchivoRespaldo(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Barra de Aforo Dinámico */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                <span>Aforo {aulaSeleccionada?.aula || aulaSeleccionada?.nombre || "Aula"}</span>
                <span className={porcentajeOcupacion >= 90 ? "text-rose-600" : "text-amber-700"}>
                  {ocupados} / {capacidad} · quedan {disponibles}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    porcentajeOcupacion >= 90
                      ? "bg-rose-500"
                      : porcentajeOcupacion >= 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${porcentajeOcupacion}%` }}
                />
              </div>
            </div>

            {/* Nota de Auditoría */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-blue-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <span>
                Autoriza: <b className="text-[#1A365D]">{usuarioSesion?.nombre} {usuarioSesion?.apellido}</b> (tu usuario). Quedará en auditoría con fecha, hora e IP.
              </span>
            </div>

            {strErrorGuardado && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">
                ✕ {strErrorGuardado}
              </div>
            )}
            {strExitoMensaje && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{strExitoMensaje}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaso(1)}
                disabled={boolGuardando}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={fnConfirmarIngreso}
                disabled={boolGuardando || strObservacion.trim().length < 20 || !motivoSeleccionado}
                className="flex-1.6 bg-[#1A365D] hover:bg-[#132743] disabled:opacity-45 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
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
