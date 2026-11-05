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
  Upload,
  CheckCircle2,
} from "lucide-react";
import { registrarExpulsion, buscarEstudiante } from "../../../services/expulsionService";
import { obtenerMisExamenes } from "../../../services/examenService";
import { validarImagen, formatearHora } from "../../../components/incidencias/utilidadesIncidencias";
import { estadoExamen } from "../utilidadesExamenDocente";

const DESCRIPCION_MIN = 15;
const DESCRIPCION_MAX = 500;

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
      const todos = data || [];
      // Eliminar duplicados por idExamen (puede venir repetido por múltiples ambientes/horarios)
      const idsVistos = new Set();
      const unicos = todos.filter((e) => {
        const id = e.idExamen || e.id;
        if (idsVistos.has(id)) return false;
        idsVistos.add(id);
        return true;
      });
      // Solo se puede expulsar de un examen que esté EN CURSO (no de uno pasado).
      const enCurso = unicos.filter((e) => estadoExamen(e) === "EN_CURSO");
      setExamenes(enCurso);
      if (enCurso.length === 0 && todos.length > 0) {
        setStrErrorExamenes(
          "No tiene exámenes en curso actualmente. Solo se puede registrar expulsión en exámenes activos."
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

      await registrarExpulsion(idExamen, datos, archivoFoto);

      setStrMensajeExito(
        "Expulsión registrada y autorizada correctamente."
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
              <h3 className="font-bold text-slate-600">No tiene exámenes en curso</h3>
              <p className="text-slate-500 text-sm">
                Solo se puede registrar expulsión en exámenes que estén activos actualmente.
              </p>
            </div>
          )}

          {!boolCargandoExamenes && examenes.length > 0 && (
            <div className="divide-y divide-slate-100">
              {examenes.map((examen) => (
                <button
                  key={examen.idExamen || examen.id}
                  onClick={() => fnSeleccionarExamen(examen)}
                  className="w-full flex items-center justify-between px-6 py-4 transition hover:bg-[#F8FAFC] hover:border-[#1A365D]/50 border border-transparent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-[#08264A] text-sm">
                        {obtenerNombreExamen(examen)}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                        EN CURSO
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {examen.codigo || ""} · {examen.fecha || ""} · {examen.hora || ""} ·
                      {examen.aula || ""}
                      <span className="ml-2 text-[10px] text-[#1A365D] font-bold">
                        ID: {examen.idExamen || examen.id}
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
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
      <div className="bg-[#1A365D] text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-center min-h-[140px]">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 flex items-center gap-2">
          Registrar Expulsión
          <span className="bg-white text-[#1A365D] px-2 py-0.5 rounded text-xs font-bold">
            {nombreExamenSeleccionado || "Examen #" + idExamen}
          </span>
        </h2>
        <p className="text-xs md:text-sm opacity-90 max-w-2xl font-medium">
          Busque al estudiante, seleccione el motivo y registre la expulsión. Quedará en estado PENDIENTE hasta que el Docente la autorice.
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
      <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs p-6">
        <h3 className="font-bold text-[#08264A] text-lg mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" /> Buscar Estudiante
        </h3>

        <form onSubmit={fnBuscarEstudiante} className="flex flex-wrap gap-3 max-w-md">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              C.I. o Código SIS
            </label>
            <input
              type="text"
              value={strQuery}
              onChange={(e) => setStrQuery(e.target.value)}
              placeholder="Ej. 1234567 o 202300123"
              className="w-full px-4 py-3 rounded-xl border border-[#CBD5E1] text-sm focus:border-[#1A365D] focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20"
            />
          </div>
          <button
            type="submit"
            disabled={boolBuscando}
            className="bg-[#1A365D] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#2563EB] transition disabled:bg-slate-300 flex items-center gap-2 whitespace-nowrap"
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
        <div className="bg-[#F0F4F8] border border-[#CBD5E1] rounded-2xl p-6 relative overflow-hidden">
          {/* Badge de identificado */}
          <div className="absolute top-4 right-4 bg-[#DC2626] text-white px-3 py-1 rounded-full text-xs font-bold">
            ESTUDIANTE IDENTIFICADO
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar del estudiante */}
            <div className="w-20 h-20 rounded-2xl bg-[#1A365D] text-white font-black text-2xl flex items-center justify-center shrink-0">
              {estudiante.nombre.charAt(0)}{estudiante.ci.charAt(estudiante.ci.length - 1)}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-black text-[#08264A] text-xl">{estudiante.nombre}</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p><span className="font-bold text-[#1A365D]">C.I.:</span> {estudiante.ci}</p>
                <p><span className="font-bold text-[#1A365D]">Código SIS:</span> {estudiante.sis}</p>
                <p><span className="font-bold text-[#1A365D]">Aula:</span> {estudiante.aula}</p>
                <p><span className="font-bold text-[#1A365D]">Examen:</span> {estudiante.examen}</p>
                <p>
                  <span className="font-bold text-[#1A365D]">Hora de ingreso:</span>{" "}
                  {estudiante.horaIngreso ? formatearHora(estudiante.horaIngreso) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de detalle de la expulsión */}
      {estudiante && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-xs p-6">
          <h3 className="font-bold text-[#08264A] text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#DC2626]" /> Detalle de la Expulsión
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Motivo */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">
                Motivo de Expulsión <span className="text-[#DC2626]">*</span>
              </label>
              <div className="space-y-2">
                {MOTIVOS_EXPULSION.map((motivo) => (
                  <button
                    key={motivo.valor}
                    type="button"
                    onClick={() => fnSeleccionarMotivo(motivo.valor)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      strMotivo === motivo.valor
                        ? "bg-[#1A365D] text-white border-[#1A365D]"
                        : "bg-white text-slate-700 border-[#CBD5E1] hover:border-[#1A365D]/50"
                    }`}
                  >
                    {motivo.etiqueta}
                  </button>
                ))}
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

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-xs text-slate-500">
              La hora de expulsión se registra automáticamente con la hora oficial del servidor.
            </span>
            <button
              type="button"
              onClick={fnRegistroExpulsion}
              disabled={boolGuardando}
              className="bg-[#DC2626] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#B91C1C] transition disabled:bg-slate-400 flex items-center gap-2"
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
        <div className="bg-[#F0F4F8] border border-[#CBD5E1] rounded-2xl p-6 text-center">
          <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-slate-600 mb-2">Busque un estudiante para continuar</h4>
          <p className="text-sm text-slate-500">
            Ingrese la C.I. o Código SIS del estudiante a expulsar en {nombreExamenSeleccionado || "el examen #" + idExamen}.
          </p>
        </div>
      )}
    </div>
  );
}
