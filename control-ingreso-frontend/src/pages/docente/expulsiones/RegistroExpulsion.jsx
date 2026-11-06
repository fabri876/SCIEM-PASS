import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  User,
  AlertTriangle,
  Loader2,
  Save,
  X,
  ChevronRight,
  Clock,
  Calendar,
  MapPin,
  BookOpen,
  Upload,
  CheckCircle2,
  Check,
  BadgeCheck,
  IdCard,
  GraduationCap,
} from "lucide-react";
import { registrarExpulsion, buscarEstudiante } from "../../../services/expulsionService";
import { obtenerMisExamenes } from "../../../services/examenService";
import { validarImagen, formatearHora } from "../../../components/incidencias/utilidadesIncidencias";
import { estadoExamen, esHoy, puedeControlarIngreso } from "../utilidadesExamenDocente";

const DESCRIPCION_MIN = 15;
const DESCRIPCION_MAX = 500;

/**
 * `mis-examenes` no trae horaInicio/horaFin en el nivel superior: los horarios
 * viven dentro de `ambientes[]`. Sin esto, estadoExamen() recibe horaFin=null,
 * asume "fin del dia" (23:59) y muestra como EN_CURSO examenes ya terminados.
 * Si hay varios ambientes, se toma el inicio mas temprano y el fin mas tardio.
 */
function normalizarHorarioExamen(examen) {
  const ambientes = Array.isArray(examen?.ambientes) ? examen.ambientes : [];
  const horasInicio = ambientes.map((a) => a?.horaInicio).filter(Boolean).sort();
  const horasFin = ambientes.map((a) => a?.horaFin).filter(Boolean).sort();

  return {
    ...examen,
    horaInicio: examen?.horaInicio || horasInicio[0] || null,
    horaFin: examen?.horaFin || horasFin[horasFin.length - 1] || null,
  };
}

const MOTIVOS_EXPULSION = [
  { valor: "USO_CELULAR", etiqueta: "Uso de teléfono celular" },
  { valor: "INTENTO_COPIA", etiqueta: "Intento de copia" },
  { valor: "COMPORTAMIENTO_DISRUPTIVO", etiqueta: "Comportamiento disruptivo" },
  { valor: "DOCUMENTACION_FALSA", etiqueta: "Documentación falsa" },
  { valor: "AGRESION", etiqueta: "Agresión verbal o física" },
  { valor: "OTRO", etiqueta: "Otro" },
];

export default function RegistroExpulsion({ idExamenProp }) {
  const [strQuery, setStrQuery] = useState("");
  const [estudiante, setEstudiante] = useState(null);
  const [boolBuscando, setBoolBuscando] = useState(false);
  const [strMensajeError, setStrMensajeError] = useState("");
  const [strMensajeExito, setStrMensajeExito] = useState("");

  // Formulario de expulsión
  const [strMotivo, setStrMotivo] = useState("");
  const [strObservacion, setStrObservacion] = useState("");
  const [boolGuardando, setBoolGuardando] = useState(false);

  // Foto de evidencia (rescatada de HU06: JPG/PNG hasta 5 MB, opcional)
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [strFotoPreview, setStrFotoPreview] = useState(null);
  const [strErrorFoto, setStrErrorFoto] = useState("");

  // Pantalla de selección de examen
  const [examenes, setExamenes] = useState([]);
  const [boolCargandoExamenes, setBoolCargandoExamenes] = useState(false);
  const [strErrorExamenes, setStrErrorExamenes] = useState("");

  // ID de examen (prop o seleccionado de la lista)
  const [idExamen, setIdExamen] = useState(idExamenProp || null);
  const [nombreExamenSeleccionado, setNombreExamenSeleccionado] = useState(
    idExamenProp ? "" : ""
  );

  const [boolMostrarSeleccionExamen, setBoolMostrarSeleccionExamen] = useState(!idExamenProp && !idExamen);

  // Cargar exámenes al entrar si no hay idExamen
  useEffect(() => {
    if (!idExamenProp && !idExamen) {
      cargarExamenes();
    }
  }, []);

  // Liberar la URL del preview de la evidencia al desmontar o reemplazarla.
  useEffect(() => {
    return () => {
      if (strFotoPreview) URL.revokeObjectURL(strFotoPreview);
    };
  }, [strFotoPreview]);

  async function cargarExamenes() {
    setBoolCargandoExamenes(true);
    setStrErrorExamenes("");
    try {
      const data = await obtenerMisExamenes();
      const todos = Array.isArray(data) ? data : [];

      // Un examen puede venir repetido (una fila por ambiente/horario).
      // Se agrupa por idExamen y se fusionan los ambientes para no perder horarios.
      const porId = new Map();
      todos.forEach((e) => {
        const id = e.idExamen || e.id;
        if (id == null) return;
        const previo = porId.get(id);
        if (!previo) {
          porId.set(id, e);
          return;
        }
        porId.set(id, {
          ...previo,
          ...e,
          ambientes: [...(previo.ambientes || []), ...(e.ambientes || [])],
        });
      });

      // Solo se puede expulsar de un examen activo. Se usa la misma regla que
      // el resto del sistema (puedeControlarIngreso): se habilita 15 minutos
      // antes del inicio y se cierra al terminar. Asi, un examen que esta por
      // comenzar ya aparece, pero uno ya finalizado nunca aparece.
      // Se normalizan los horarios desde ambientes[] antes de calcular el estado.
      const ahora = new Date();
      const enCurso = Array.from(porId.values())
        .map(normalizarHorarioExamen)
        .filter((e) => esHoy(e, ahora) && puedeControlarIngreso(e, ahora));

      setExamenes(enCurso);
      if (enCurso.length === 0 && todos.length > 0) {
        setStrErrorExamenes(
          "No tiene exámenes activos ni próximos a iniciar. El registro se habilita 15 minutos antes del inicio del examen."
        );
      }
    } catch (err) {
      setStrErrorExamenes(err.message || "No se pudieron cargar los exámenes.");
    } finally {
      setBoolCargandoExamenes(false);
    }
  }

  // Función auxiliar para obtener el nombre de la materia de un examen
  const obtenerNombreExamen = (examen) => {
    return (
      examen?.asignatura ||
      examen?.nombre ||
      examen?.materia ||
      examen?.nombreMateria ||
      examen?.nombreAsignatura ||
      "Examen " + (examen?.idExamen || examen?.id)
    );
  };

  function fnSeleccionarExamen(examen) {
    setIdExamen(examen.idExamen || examen.id);
    setNombreExamenSeleccionado(obtenerNombreExamen(examen));
    setBoolMostrarSeleccionExamen(false);
    setStrMensajeError("");
    setStrMensajeExito("");
  }

  const fnBuscarEstudiante = useCallback(async (e) => {
    e.preventDefault();
    if (!strQuery.trim()) return;
    if (!idExamen) {
      setStrMensajeError("Debe seleccionar un examen primero.");
      return;
    }

    setBoolBuscando(true);
    setStrMensajeError("");
    setEstudiante(null);

    try {
      const estudiante = await buscarEstudiante(idExamen, strQuery.trim());
      setEstudiante({
        idIngreso: estudiante.idIngreso,
        ci: estudiante.ci,
        sis: estudiante.codSis?.toString() || "",
        nombre: estudiante.nombreCompleto,
        aula: estudiante.aula,
        horaIngreso: estudiante.horaIngreso,
        examen: nombreExamenSeleccionado || "Examen #" + idExamen,
      });
    } catch (err) {
      setStrMensajeError(err.message || "Error al buscar estudiante.");
    } finally {
      setBoolBuscando(false);
    }
  }, [strQuery, idExamen]);

  const fnSeleccionarMotivo = (valor) => {
    setStrMotivo(valor);
  };

  const fnSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const strErrorArchivo = validarImagen(file);
    if (strErrorArchivo) {
      setStrErrorFoto(strErrorArchivo);
      return;
    }
    if (strFotoPreview) URL.revokeObjectURL(strFotoPreview);
    setArchivoFoto(file);
    setStrFotoPreview(URL.createObjectURL(file));
    setStrErrorFoto("");
  };

  const fnLimpiarFoto = () => {
    if (strFotoPreview) URL.revokeObjectURL(strFotoPreview);
    setArchivoFoto(null);
    setStrFotoPreview(null);
    setStrErrorFoto("");
  };

  const boolDescripcionValida =
    strObservacion.trim().length >= DESCRIPCION_MIN &&
    strObservacion.trim().length <= DESCRIPCION_MAX;

  const fnRegistroExpulsion = async (e) => {
    e.preventDefault();
    if (!estudiante) {
      setStrMensajeError("Debe buscar y seleccionar un estudiante primero.");
      return;
    }
    if (!idExamen) {
      setStrMensajeError("Debe seleccionar un examen.");
      return;
    }
    if (!strMotivo) {
      setStrMensajeError("Debe seleccionar un motivo de expulsión.");
      return;
    }
    if (!boolDescripcionValida) {
      setStrMensajeError(
        `La descripción debe tener entre ${DESCRIPCION_MIN} y ${DESCRIPCION_MAX} caracteres.`
      );
      return;
    }

    setBoolGuardando(true);
    setStrMensajeExito("");
    setStrMensajeError("");

    try {
      const datos = {
        idIngreso: estudiante.idIngreso || estudiante.ci,
        motivoExpulsion: strMotivo,
        observacion: strObservacion.trim(),
      };

      const respuesta = await registrarExpulsion(idExamen, datos, archivoFoto);

      const idIncidencia = respuesta?.idIncidencia;
      setStrMensajeExito(
        idIncidencia
          ? `Expulsión registrada y autorizada correctamente. También se registró en Incidencias como INC-${String(idIncidencia).padStart(3, "0")}.`
          : "Expulsión registrada y autorizada correctamente."
      );
      setEstudiante(null);
      setStrMotivo("");
      setStrObservacion("");
      setStrQuery("");
      fnLimpiarFoto();
    } catch (err) {
      setStrMensajeError(err.message || "No se pudo registrar la expulsión.");
    } finally {
      setBoolGuardando(false);
    }
  };

  // =========================================================================
  // PANTALLA 1: SELECCIONAR EXAMEN
  // =========================================================================
  if (boolMostrarSeleccionExamen && !idExamen) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Encabezado del módulo */}
        <div className="bg-[#1A365D] text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[140px]">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
            Registrar Expulsión
          </h2>
          <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
            Seleccione el examen en el que se registrará la expulsión del estudiante.
          </p>
        </div>

        {/* Error al cargar exámenes */}
        {strErrorExamenes && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {strErrorExamenes}
          </div>
        )}

        {/* Lista de exámenes */}
        <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs overflow-hidden">
          {boolCargandoExamenes && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#1A365D]" />
              <p className="mt-3 text-slate-600 text-sm">Cargando exámenes...</p>
            </div>
          )}

          {!boolCargandoExamenes && examenes.length === 0 && (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-600">No hay exámenes activos</h3>
              <p className="text-slate-500 text-sm">
                El registro de expulsiones se habilita 15 minutos antes del inicio del examen.
              </p>
            </div>
          )}

          {!boolCargandoExamenes && examenes.length > 0 && (
            <div className="p-4 md:p-6 space-y-3 bg-[#F8FAFC]">
              {examenes.map((examen) => {
                const enCurso = estadoExamen(examen) === "EN_CURSO";
                const aulas =
                  (examen.ambientes || [])
                    .map((a) => a?.nombreAmbiente || a?.nombreAula)
                    .filter(Boolean)
                    .join(" + ") || "Aula por definir";
                const horario =
                  examen.horaInicio && examen.horaFin
                    ? `${String(examen.horaInicio).substring(0, 5)} - ${String(examen.horaFin).substring(0, 5)}`
                    : "Horario por definir";

                return (
                  <button
                    key={examen.idExamen || examen.id}
                    onClick={() => fnSeleccionarExamen(examen)}
                    className="group w-full text-left bg-white border border-[#CBD5E1] rounded-2xl px-4 md:px-5 py-4 transition-all hover:border-[#1A365D] hover:shadow-md hover:-translate-y-0.5 flex items-center gap-4"
                  >
                    {/* Icono de materia */}
                    <div className="w-12 h-12 rounded-xl bg-[#E8EEF7] text-[#1A365D] flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#1A365D] group-hover:text-white">
                      <BookOpen className="w-6 h-6" />
                    </div>

                    {/* Datos del examen */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[#08264A] text-sm md:text-base truncate">
                          {obtenerNombreExamen(examen)}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${
                            enCurso
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : "bg-[#FEF3C7] text-[#92400E]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              enCurso ? "bg-[#16A34A]" : "bg-[#F59E0B]"
                            }`}
                          />
                          {enCurso ? "EN CURSO" : "POR INICIAR"}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#1A365D]" />
                          {examen.fechaExamen || "Fecha por definir"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#1A365D]" />
                          {horario}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#1A365D]" />
                          {aulas}
                        </span>
                      </div>
                    </div>

                    {/* Flecha */}
                    <div className="w-9 h-9 rounded-full border border-[#CBD5E1] text-slate-400 flex items-center justify-center shrink-0 transition-colors group-hover:border-[#1A365D] group-hover:text-[#1A365D] group-hover:bg-[#F1F5F9]">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // PANTALLA 2: REGISTRO DE EXPULSIÓN (ya se seleccionó el examen)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Encabezado del módulo */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1A365D] via-[#1E3A63] to-[#0F2544] text-white p-6 md:p-8 rounded-3xl shadow-lg">
        <div className="pointer-events-none absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-white/5" />

        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60 mb-2">
          <BookOpen className="w-3.5 h-3.5" /> Examen seleccionado
        </span>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
          Registrar Expulsión
        </h2>
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold mb-3">
          <GraduationCap className="w-4 h-4" />
          {nombreExamenSeleccionado || "Examen #" + idExamen}
        </div>
        <p className="text-xs md:text-sm text-white/75 max-w-2xl font-medium leading-relaxed">
          Busque al estudiante, seleccione el motivo y registre la expulsión. Al autorizarla, el estudiante quedará bloqueado para volver a ingresar a este examen.
        </p>
      </div>

      {/* Mensajes de feedback */}
      {strMensajeError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {strMensajeError}
        </div>
      )}
      {strMensajeExito && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {strMensajeExito}
        </div>
      )}

      {/* Sección: Búsqueda de estudiante */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#E8EEF7] text-[#1A365D] flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#08264A] text-lg leading-tight">Buscar Estudiante</h3>
            <p className="text-xs text-slate-500">
              Ingrese la C.I. o el Código SIS para identificarlo.
            </p>
          </div>
        </div>

        <form
          onSubmit={fnBuscarEstudiante}
          className="flex flex-col sm:flex-row gap-3 max-w-2xl sm:items-end"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              C.I. o Código SIS
            </label>
            <div className="relative">
              <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={strQuery}
                onChange={(e) => setStrQuery(e.target.value)}
                placeholder="Ej. 1234567 o 202300123"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#CBD5E1] text-sm bg-white focus:border-[#1A365D] focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20 transition"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={boolBuscando}
            className="bg-[#1A365D] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-[#2563EB] hover:shadow-md transition disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {boolBuscando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
              </>
            ) : (
              <>
                <User className="w-4 h-4" /> Buscar
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tarjeta del estudiante encontrado */}
      {estudiante && (
        <div className="relative overflow-hidden bg-gradient-to-br from-white to-[#F0F4F8] border border-[#CBD5E1] rounded-2xl shadow-sm p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#1A365D]/5" />

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar del estudiante */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#1A365D] to-[#2563EB] text-white font-black text-xl md:text-2xl flex items-center justify-center shrink-0 shadow-md">
              {estudiante.nombre.charAt(0)}
              {estudiante.ci.charAt(estudiante.ci.length - 1)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-[#08264A] text-lg md:text-xl">
                  {estudiante.nombre}
                </h3>
                <span className="inline-flex items-center gap-1 bg-[#DCFCE7] text-[#166534] px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide">
                  <BadgeCheck className="w-3.5 h-3.5" /> IDENTIFICADO
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-[#1A365D] shrink-0" />
                  <span className="font-bold text-[#1A365D]">C.I.:</span> {estudiante.ci}
                </p>
                <p className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#1A365D] shrink-0" />
                  <span className="font-bold text-[#1A365D]">Código SIS:</span> {estudiante.sis}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#1A365D] shrink-0" />
                  <span className="font-bold text-[#1A365D]">Aula:</span> {estudiante.aula}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1A365D] shrink-0" />
                  <span className="font-bold text-[#1A365D]">Hora de ingreso:</span>{" "}
                  {estudiante.horaIngreso ? formatearHora(estudiante.horaIngreso) : "—"}
                </p>
                <p className="flex items-center gap-2 sm:col-span-2">
                  <BookOpen className="w-4 h-4 text-[#1A365D] shrink-0" />
                  <span className="font-bold text-[#1A365D]">Examen:</span> {estudiante.examen}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de detalle de la expulsión */}
      {estudiante && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#DC2626] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#08264A] text-lg leading-tight">
                Detalle de la Expulsión
              </h3>
              <p className="text-xs text-slate-500">
                Estos datos quedarán registrados en el historial y en Incidencias.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Motivo */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">
                Motivo de Expulsión <span className="text-[#DC2626]">*</span>
              </label>
              <div className="space-y-2">
                {MOTIVOS_EXPULSION.map((motivo) => {
                  const seleccionado = strMotivo === motivo.valor;
                  return (
                    <button
                      key={motivo.valor}
                      type="button"
                      onClick={() => fnSeleccionarMotivo(motivo.valor)}
                      className={`group w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        seleccionado
                          ? "bg-[#1A365D] text-white border-[#1A365D] shadow-sm"
                          : "bg-white text-slate-700 border-[#CBD5E1] hover:border-[#1A365D]/60 hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          seleccionado
                            ? "border-white bg-white text-[#1A365D]"
                            : "border-slate-300 text-transparent group-hover:border-[#1A365D]/50"
                        }`}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      {motivo.etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Descripción / justificación (rescatada de HU06) */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex justify-between items-center gap-2">
                <label className="block text-xs font-bold text-slate-600">
                  Descripción de la expulsión <span className="text-[#DC2626]">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    boolDescripcionValida ? "text-slate-400" : "text-[#DC2626]"
                  }`}
                >
                  {strObservacion.length}/{DESCRIPCION_MAX}
                  {!boolDescripcionValida && ` (mín. ${DESCRIPCION_MIN})`}
                </span>
              </div>
              <textarea
                value={strObservacion}
                onChange={(e) => setStrObservacion(e.target.value)}
                maxLength={DESCRIPCION_MAX}
                placeholder="Describe qué ocurrió durante el examen..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] text-sm focus:border-[#1A365D] focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20"
              />
            </div>

            {/* Foto de evidencia (rescatada de HU06) */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-bold text-slate-600">
                Foto de evidencia{" "}
                <span className="text-slate-400 font-normal">
                  (opcional · JPG o PNG, hasta 5 MB)
                </span>
              </label>

              {strFotoPreview ? (
                <div className="border border-[#CBD5E1] rounded-xl p-2 bg-[#F8FAFC] flex items-center gap-3">
                  <img
                    src={strFotoPreview}
                    alt="Evidencia"
                    className="w-14 h-14 object-cover rounded-lg border border-[#CBD5E1]"
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
                    className="text-[#DC2626] hover:text-[#B91C1C] p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Quitar foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border border-dashed border-[#CBD5E1] hover:border-[#1A365D] rounded-xl p-3 bg-white flex items-center justify-between gap-3 transition cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Adjuntar foto de evidencia
                    </span>
                  </div>
                  <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-lg transition shrink-0">
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

              {strErrorFoto && (
                <p className="text-[11px] text-[#DC2626] font-bold">{strErrorFoto}</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              La hora de expulsión se registra automáticamente con la hora oficial del servidor.
            </span>
            <button
              type="button"
              onClick={fnRegistroExpulsion}
              disabled={boolGuardando}
              className="w-full sm:w-auto bg-[#1A365D] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-[#2563EB] hover:shadow-md transition disabled:bg-slate-400 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {boolGuardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Autorizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Autorizar Expulsión
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mensaje si no hay estudiante pero ya se seleccionó examen */}
      {!estudiante && idExamen && (
        <div className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] to-white border border-dashed border-[#CBD5E1] rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#E8EEF7] text-[#1A365D] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Search className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-[#08264A] mb-1">Busque un estudiante para continuar</h4>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Ingrese la C.I. o Código SIS del estudiante a expulsar en{" "}
            <span className="font-bold text-[#1A365D]">
              {nombreExamenSeleccionado || "el examen #" + idExamen}
            </span>
            .
          </p>
        </div>
      )}
    </div>
  );
}
