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
import { buscarEstudianteExcepcionalLocal, estaOfflineIncidencia } from "../../offline/incidenciaOffline";
import { ingresoExcepcionalRepo } from "../../offline/ingresoExcepcionalRepo";
import { formatearHora, validarImagen, etiquetaAula, textoAforo } from "./utilidadesIncidencias";

const MOTIVOS_EXCEPCION = [
  { codigo: "SIN_CARNET_QR", titulo: "Sin carnet o QR", descripcion: "Identidad verificada con CI físico" },
  { codigo: "NO_FIGURA_EN_LISTA", titulo: "No figura en la lista", descripcion: "Error de habilitación con respaldo" },
  { codigo: "LLEGADA_TARDIA", titulo: "Llegada tardía", descripcion: "Fuera de la tolerancia por causa justificada" },
  { codigo: "TRASLADO_AULA", titulo: "Traslado desde otra aula", descripcion: "Reasignación autorizada por capacidad" },
  { codigo: "FALLO_FACIAL", titulo: "Fallo en reconocimiento facial", descripcion: "Se agotaron los intentos de verificación biométrica" },
  { codigo: "SIN_ENROLAMIENTO_FACIAL", titulo: "Sin enrolamiento facial", descripcion: "El estudiante no cuenta con rostro registrado" },
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
 * Ingreso excepcional (HU06). Docente asignado al examen, administrador y, en el
 * flujo facial del control de ingreso, el operador.
 *
 * - aulasDisponibles: aulas de HOY asignadas (GET /api/incidencias/ambientes). Si el ingreso ya
 *   cerró, la búsqueda lo explica y el backend registra el intento en auditoría.
 *   El ingreso excepcional solo se autoriza durante el examen; el backend también lo valida.
 * - boolSoloFacial: el operador solo autoriza los motivos faciales
 *   (FALLO_FACIAL y SIN_ENROLAMIENTO_FACIAL).
 */
export default function ModalIngresoExcepcional({
  boolAbierto,
  onCerrar,
  aulasDisponibles = [],
  aulaPreseleccionada = null,
  motivoPreseleccionado = null,
  observacionSugerida = "",
  idAmbienteBloqueado = null,
  estudiantePreseleccionado = null,
  boolSoloFacial = false,
  onExito,
  onAbrirIncidenciaConEstudiante,
}) {
  const usuarioSesion = obtenerUsuarioActual();
  const strNombreAutoriza = `${usuarioSesion?.nombre || ""} ${usuarioSesion?.apellido || ""}`.trim();
  const inputBusquedaRef = useRef(null);

  // El operador autoriza únicamente desde el flujo facial: no debe poder
  // elegir motivos que el backend le va a rechazar.
  const listMotivos = boolSoloFacial
    ? MOTIVOS_EXCEPCION.filter((mot) => mot.codigo === "FALLO_FACIAL" || mot.codigo === "SIN_ENROLAMIENTO_FACIAL")
    : MOTIVOS_EXCEPCION;

  // Paso 1: búsqueda y verificación. Paso 2: formulario de ingreso.
  const [paso, setPaso] = useState(1);

  const [strBusqueda, setStrBusqueda] = useState("");
  const [boolBuscando, setBoolBuscando] = useState(false);
  const [strErrorBusqueda, setStrErrorBusqueda] = useState("");
  const [strAvisoBusqueda, setStrAvisoBusqueda] = useState("");
  const [boolOffline, setBoolOffline] = useState(false);
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

    setPaso(estudiantePreseleccionado ? 2 : 1);
    setStrBusqueda("");
    setConsultaResultado(estudiantePreseleccionado ? {
      codSis: estudiantePreseleccionado.codsisEstudiante,
      nombreCompleto: estudiantePreseleccionado.nombreCompleto,
      estado: "HABILITADO",
    } : null);
    setStrErrorBusqueda("");
    setStrAvisoBusqueda("");
    setStrErrorGuardado("");
    setStrExitoMensaje("");
    setStrObservacion(observacionSugerida || "");
    setArchivoRespaldo(null);
    setMotivoSeleccionado(motivoPreseleccionado || null);
    setBoolGuardando(false);

    // Sin conexión el formulario trabaja con la nómina descargada y deja el
    // registro en la cola local (HU21).
    setBoolOffline(false);
    estaOfflineIncidencia()
      .then((offline) => setBoolOffline(offline))
      .catch(() => { });

    const aulaBloqueada = idAmbienteBloqueado != null
      ? aulasDisponibles.find((item) => Number(item.idAmbiente) === Number(idAmbienteBloqueado))
      : null;
    const aula = aulaBloqueada || aulaPreseleccionada || aulasDisponibles[0] || null;
    setAulaSeleccionada(aula);
    setAforoActual(aula?.aforo || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boolAbierto]);

  // Cerrar con ESC, igual que la "X" de la cabecera.
  useEffect(() => {
    if (!boolAbierto) return undefined;
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

    const idExamenActual = aulaSeleccionada?.idExamen ?? null;
    const buscarEnNominaLocal = () =>
      buscarEstudianteExcepcionalLocal({ idExamen: idExamenActual, consulta: query });

    setBoolBuscando(true);
    setStrErrorBusqueda("");
    setStrAvisoBusqueda("");
    setConsultaResultado(null);

    try {
      let data;
      if (await estaOfflineIncidencia()) {
        data = await buscarEnNominaLocal();
        setBoolOffline(true);
        if (data?.estado !== "SIN_NOMINA") {
          setStrAvisoBusqueda("Sin conexión: se usó la nómina descargada en este equipo.");
        }
      } else {
        try {
          data = await consultarEstudianteExcepcional(idAmbienteActual, query);
        } catch (err) {
          // Servidor inalcanzable a mitad de la búsqueda: respaldo local.
          if (err?.offline || /conectar|conexi[oó]n|Failed to fetch|timeout/i.test(err?.message || "")) {
            data = await buscarEnNominaLocal();
            setBoolOffline(true);
            setStrAvisoBusqueda("Sin conexión: se usó la nómina descargada en este equipo.");
          } else {
            throw err;
          }
        }
      }
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

  const guardarOffline = async () => {
    const usuario = obtenerUsuarioActual();
    const autorizadoPor = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.correo ?? null;
    try {
      await ingresoExcepcionalRepo.encolar({
        idExamen: aulaSeleccionada?.idExamen ?? null,
        idAmbiente: idAmbienteActual,
        codSis: consultaResultado.codSis,
        motivo: motivoSeleccionado,
        observacion: strObservacion.trim(),
        respaldo: archivoRespaldo,
        registradoEn: new Date().toISOString(),
        autorizadoPor,
        nombreEstudiante: consultaResultado.nombreCompleto,
        aula: aulaSeleccionada?.aula || null,
        asignatura: aulaSeleccionada?.asignatura || null,
      });
    } catch {
      setStrErrorGuardado("No se pudo guardar el ingreso excepcional en el dispositivo.");
      setBoolGuardando(false);
      return;
    }
    setStrExitoMensaje(
      "Sin conexión. El ingreso excepcional quedó guardado en el dispositivo y se enviará automáticamente al recuperar la señal."
    );
    notificarCambioIncidencias();
    setTimeout(() => {
      if (onExito) onExito({ offline: true, codSis: consultaResultado.codSis, motivo: motivoSeleccionado });
      onCerrar();
    }, 1400);
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
      if (await estaOfflineIncidencia()) {
        await guardarOffline();
        return;
      }

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
      const mensajeServidor = err.message || "";
      const esExamenCancelado = mensajeServidor.includes("Examen cancelado")
        || mensajeServidor.includes("Este examen fue cancelado");
      if (err?.offline || /conectar|conexi[oó]n|Failed to fetch|timeout/i.test(mensajeServidor)) {
        await guardarOffline();
        return;
      } else if (esExamenCancelado) {
        setStrErrorGuardado(mensajeServidor);
        setBoolGuardando(false);
        setTimeout(() => {
          onCerrar();
        }, 600);
        return;
      }
      setStrErrorGuardado(mensajeServidor || "No se pudo autorizar el ingreso.");
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto border border-[#CBD5E1] animate-in fade-in zoom-in-95 duration-200">

        {/* PASO 1: BÚSQUEDA Y VERIFICACIÓN */}
        {paso === 1 && (
          <div className="flex flex-col">
            <div className="bg-gradient-to-r from-[#08264A] via-[#003770] to-[#1860A3] text-white p-5 relative">
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
              {boolOffline && (
                <div className="bg-[#FEF9E7] border border-[#FDE68A] text-[#92400E] rounded-xl p-3 text-xs font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Sin conexión: se usa la nómina descargada en este equipo. El ingreso se guardará
                    en el dispositivo y se enviará automáticamente al recuperar la señal.
                  </span>
                </div>
              )}
              {aulasDisponibles.length === 0 ? (
                <p className="bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] rounded-xl p-3 text-xs font-bold">
                  El ingreso excepcional solo se autoriza el día del examen: hoy no tienes exámenes asignados.
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1">Aula</label>
                    <select
                      value={idAmbienteActual ?? ""}
                      disabled={idAmbienteBloqueado != null}
                      onChange={(e) => {
                        const encontrada = aulasDisponibles.find((a) => String(a.idAmbiente) === e.target.value);
                        setAulaSeleccionada(encontrada || null);
                        setAforoActual(encontrada?.aforo || null);
                        setConsultaResultado(null);
                      }}
                      className="w-full bg-[var(--color-bg-app)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-text-title)] focus:outline-none focus:border-[var(--color-primary-blue)] transition disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {aulasDisponibles.map((aula) => (
                        <option key={aula.idAmbiente} value={aula.idAmbiente}>
                          {etiquetaAula(aula)} · {aula.ingresoCerrado ? "ingreso cerrado" : textoAforo(aula.aforo)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={fnBuscarEstudiante} className="space-y-2">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
                      Buscar estudiante (CI o Código SIS)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Search className="w-4 h-4 text-[#9AA8BA] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          ref={inputBusquedaRef}
                          type="text"
                          value={strBusqueda}
                          onChange={(e) => setStrBusqueda(e.target.value)}
                          placeholder="CI o Código SIS"
                          className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3] transition"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={boolBuscando}
                        className="bg-[#003770] hover:bg-[#124B83] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {boolBuscando ? (
                          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>Buscar</span>
                      </button>
                    </div>
                    {strErrorBusqueda && <p className="text-[11px] text-[#B91C1C] font-bold">{strErrorBusqueda}</p>}
                    {strAvisoBusqueda && (
                      <p className="text-[10.5px] text-[#124B83] font-bold">{strAvisoBusqueda}</p>
                    )}
                  </form>
                </>
              )}

              {consultaResultado && (
                <div
                  className={`p-4 rounded-2xl border transition-all ${consultaResultado.estado === "DUPLICADO"
                      ? "bg-[#F1F5F9] border-[#CBD5E1]"
                      : consultaResultado.estado === "HABILITADO"
                        ? "bg-[#F0F6FC] border-[#B6D3EE]"
                        : "bg-[#FEF2F2] border-[#FEE2E2]"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#83B7E2] to-[#4A97D3] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {iniciales}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-[#003770]">
                          {consultaResultado.nombreCompleto || "Estudiante no registrado"}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${consultaResultado.estado === "DUPLICADO"
                              ? "bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]"
                              : consultaResultado.estado === "HABILITADO"
                                ? "bg-[#1860A3] text-white"
                                : "bg-[#B91C1C] text-white"
                            }`}
                        >
                          {consultaResultado.estado === "DUPLICADO" ? <Clock className="w-3 h-3" />
                            : consultaResultado.estado === "HABILITADO" ? <CheckCircle2 className="w-3 h-3" />
                              : <XCircle className="w-3 h-3" />}
                          <span>{ETIQUETA_ESTADO[consultaResultado.estado] || consultaResultado.estado}</span>
                        </span>
                      </div>
                      {consultaResultado.estado !== "NO_ENCONTRADO" && (
                        <p className="text-xs text-[#64748B] font-bold mt-0.5">
                          CI {consultaResultado.ci || "-"} · SIS {consultaResultado.codSis || "-"}
                        </p>
                      )}
                      <div
                        className={`mt-2.5 pt-2 border-t border-[#CBD5E1]/80 text-[11.5px] font-extrabold ${consultaResultado.estado === "HABILITADO"
                            ? "text-[#1860A3]"
                            : consultaResultado.estado === "DUPLICADO"
                              ? "text-[#64748B]"
                              : "text-[#B91C1C]"
                          }`}
                      >
                        {consultaResultado.mensaje}
                      </div>
                    </div>
                  </div>

                  {/* Botones según los flags del backend */}
                  <div className="mt-4 pt-3 border-t border-[#CBD5E1]/60 flex flex-col sm:flex-row gap-2">
                    {consultaResultado.puedeAutorizarExcepcional && (
                      <button
                        onClick={() => setPaso(2)}
                        className="flex-1 bg-[#003770] hover:bg-[#124B83] text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Autorizar ingreso excepcional</span>
                      </button>
                    )}
                    {/* El botón solo se muestra si hay a quién abrir el formulario de
                        incidencia: el operador (ayudante) no registra incidencias
                        y no recibe ese callback. */}
                    {onAbrirIncidenciaConEstudiante && consultaResultado.puedeRegistrarIncidencia && usuarioSesion.rol === "DOCENTE" && (
                      <button
                        onClick={fnDerivarAIncidencia}
                        className="bg-[#F0F6FC] hover:bg-[#D9E8F7] text-[#124B83] border border-[#B6D3EE] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-[#4A97D3]" />
                        <span>Registrar incidencia</span>
                      </button>
                    )}
                    {consultaResultado.estado !== "DUPLICADO" && consultaResultado.estado !== "RETIRADO" && (
                      <button type="button" onClick={fnLimpiarResultado} className="text-[#64748B] hover:text-[#475569] font-bold text-xs px-3 py-2">
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
            <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setPaso(1)} disabled={boolGuardando} className="p-1.5 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] transition cursor-pointer" title="Volver">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black text-[#003770]">Ingreso Excepcional</h3>
              </div>
              <button onClick={onCerrar} disabled={boolGuardando} className="text-[#9AA8BA] hover:text-[#64748B] p-1 rounded-full hover:bg-[#F1F5F9] transition cursor-pointer" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Estudiante */}
            <div className="bg-[#F1F5F9] border border-[#CBD5E1] rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#B6D3EE] text-[#003770] font-black text-xs flex items-center justify-center shrink-0">{iniciales}</div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-xs text-[#003770] truncate">{consultaResultado.nombreCompleto}</p>
                <p className="text-[11px] text-[#64748B] font-bold">
                  SIS {consultaResultado.codSis} · {ETIQUETA_ESTADO[consultaResultado.estado] || consultaResultado.estado}
                </p>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${motivoSeleccionado ? "text-[#64748B]" : "text-[#B91C1C]"}`}>
                Motivo <span className="text-[#B91C1C]">* {!motivoSeleccionado && "(obligatorio)"}</span>
              </label>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl ${motivoSeleccionado ? "" : "ring-2 ring-rose-200 p-1"}`}>
                {listMotivos.map((mot) => {
                  const isChecked = motivoSeleccionado === mot.codigo;
                  return (
                    <button
                      type="button"
                      key={mot.codigo}
                      onClick={() => setMotivoSeleccionado(mot.codigo)}
                      className={`p-3 rounded-xl border text-xs text-left cursor-pointer transition flex items-start gap-2.5 ${isChecked ? "bg-[#F0F6FC] border-[#003770] text-[#003770] shadow-xs" : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]"
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${isChecked ? "border-[#003770] bg-[#003770]" : "border-[#CBD5E1]"}`}>
                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="font-extrabold block text-xs leading-snug">{mot.titulo}</span>
                        <span className="text-[10px] text-[#64748B] block leading-tight mt-0.5">{mot.descripcion}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Autorizador: siempre el usuario de la sesión */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1">Docente que autoriza</label>
              <input
                type="text"
                value={strNombreAutoriza}
                readOnly
                disabled
                className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#475569] cursor-not-allowed"
              />
            </div>

            {/* Observación */}
            <div>
              <div className="flex justify-between items-center mb-1 gap-2">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
                  Observación <span className="text-[#B91C1C]">*</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${observacionValida ? "text-[#9AA8BA]" : "text-[#B91C1C]"}`}>
                  {strObservacion.length}/{OBSERVACION_MAX} {!observacionValida && `(mín. ${OBSERVACION_MIN})`}
                </span>
              </div>
              <textarea
                value={strObservacion}
                onChange={(e) => setStrObservacion(e.target.value)}
                maxLength={OBSERVACION_MAX}
                placeholder="Explica por qué se autoriza el ingreso y qué respaldo presentó..."
                rows={3}
                className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-3 text-xs font-medium text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3] transition"
              />
            </div>

            {/* Respaldo */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-1">
                Respaldo <span className="text-[#9AA8BA] font-normal">(opcional · JPG o PNG, máx. 5 MB)</span>
              </label>
              <div className="border border-dashed border-[#CBD5E1] hover:border-[#4A97D3] rounded-xl p-3 bg-white flex items-center justify-between gap-3 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#475569] truncate">{archivoRespaldo ? archivoRespaldo.name : "Sin archivo"}</p>
                    <p className="text-[10px] text-[#9AA8BA]">
                      {archivoRespaldo ? `${(archivoRespaldo.size / 1024 / 1024).toFixed(2)} MB` : "Adjuntar es opcional"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {archivoRespaldo && (
                    <button type="button" onClick={() => setArchivoRespaldo(null)} className="text-[#B91C1C] hover:bg-[#FEF2F2] p-1.5 rounded-lg" title="Quitar archivo">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <label className="bg-[#F1F5F9] hover:bg-[#CBD5E1] text-[#475569] font-bold text-[11px] px-3 py-1.5 rounded-lg cursor-pointer transition">
                    {archivoRespaldo ? "Cambiar" : "Examinar"}
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={fnSeleccionarRespaldo} />
                  </label>
                </div>
              </div>
            </div>

            {/* Aforo */}
            <div className="bg-[#F1F5F9] p-3 rounded-xl border border-[#CBD5E1]">
              <div className="flex justify-between items-center text-xs font-bold text-[#475569] mb-1 gap-2">
                <span>Aforo {aulaSeleccionada?.aula}</span>
                <span className={porcentajeOcupacion >= 90 ? "text-[#B91C1C]" : "text-[#124B83]"}>
                  {aforoActual ? textoAforo(aforoActual) : (boolOffline ? "Sin conexión" : "Sin dato")}
                </span>
              </div>
              {capacidad != null && (
                <div className="w-full bg-[#CBD5E1] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${porcentajeOcupacion >= 90 ? "bg-[#B91C1C]" : porcentajeOcupacion >= 70 ? "bg-[#4A97D3]" : "bg-[#1860A3]"
                      }`}
                    style={{ width: `${porcentajeOcupacion}%` }}
                  />
                </div>
              )}
            </div>

            <div className="bg-[#F0F6FC] border border-[#B6D3EE] rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-[#124B83] font-bold">
              <ShieldCheck className="w-4 h-4 text-[#4A97D3] shrink-0 mt-0.5" />
              <span>
                {boolOffline
                  ? "Quedará en la cola del dispositivo con tu usuario y la hora en que se autorizó; se auditará al sincronizar."
                  : "Quedará en el historial de auditoría con tu usuario, la fecha y hora oficiales y tu IP."}
              </span>
            </div>

            {strErrorGuardado && (
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#B91C1C] p-2.5 rounded-xl text-xs font-bold">✕ {strErrorGuardado}</div>
            )}
            {strExitoMensaje && (
              <div className="bg-[#F0F6FC] border border-[#B6D3EE] text-[#124B83] p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{strExitoMensaje}</span>
              </div>
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
                type="button"
                onClick={fnConfirmarIngreso}
                disabled={!puedeConfirmar}
                className="flex-[1.6] bg-[#003770] hover:bg-[#124B83] disabled:opacity-45 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                {boolGuardando ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
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
