import { useRef, useState } from "react";
import {
  User,
  BookOpen,
  LayoutGrid,
  ListChecks,
  CalendarRange,
  MapPin,
  Calendar,
  Clock,
  Upload,
  FileText,
  Save,
  X,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

/**
 * CargaExamenesPasados.jsx
 *
 * Sección del panel de Administrador para registrar un examen ya realizado
 * y adjuntar su PDF. Se muestra cuando activeMenu === "Carga de Exámenes Pasados"
 * (ver AdminSidebar). No incluye header, sidebar ni título: esos ya los pone
 * AdminDashboard (el título es el nombre de la sección activa).
 *
 * Los catálogos de los selects (docentes, asignaturas, etc.) son datos de
 * prueba definidos acá arriba. Para conectar con el backend hay dos bloques
 * marcados con "TODO BACKEND": uno al cargar catálogos y otro al guardar.
 * Detalle de campos: docs/CARGA-EXAMENES-PASADOS.md
 */

// ───────────── Datos de prueba (catálogos) ─────────────
const arrDocentesMock = [
  { intId: 1, strNombre: "Ing. Carla Mendoza" },
  { intId: 2, strNombre: "Ing. Marco Quiroga" },
  { intId: 3, strNombre: "Lic. Rosa Villarroel" },
  { intId: 4, strNombre: "Ing. Daniel Rojas" },
];

const arrAsignaturasMock = [
  { intId: 1, strNombre: "Programación II" },
  { intId: 2, strNombre: "Física II" },
  { intId: 3, strNombre: "Cálculo I" },
  { intId: 4, strNombre: "Álgebra Lineal" },
];

// Cada grupo pertenece a una asignatura (intIdAsignatura)
const arrGruposMock = [
  { intId: 11, intIdAsignatura: 1, strNombre: "Grupo A" },
  { intId: 12, intIdAsignatura: 1, strNombre: "Grupo B" },
  { intId: 21, intIdAsignatura: 2, strNombre: "Grupo A" },
  { intId: 22, intIdAsignatura: 2, strNombre: "Grupo B" },
  { intId: 31, intIdAsignatura: 3, strNombre: "Grupo A" },
  { intId: 32, intIdAsignatura: 3, strNombre: "Grupo C" },
  { intId: 41, intIdAsignatura: 4, strNombre: "Grupo A" },
];

const arrTiposExamenMock = [
  { intId: 1, strNombre: "Primer parcial" },
  { intId: 2, strNombre: "Segundo parcial" },
  { intId: 3, strNombre: "Examen final" },
  { intId: 4, strNombre: "Segunda instancia" },
];

const arrPeriodosMock = [
  { intId: 1, strNombre: "2026 - Semestre II" },
  { intId: 2, strNombre: "2026 - Semestre I" },
  { intId: 3, strNombre: "2025 - Semestre II" },
];

const arrAmbientesMock = [
  { intId: 1, strNombre: "Aula 612 - Bloque F" },
  { intId: 2, strNombre: "Aula 305 - Bloque C" },
  { intId: 3, strNombre: "Aula 410 - Bloque A" },
  { intId: 4, strNombre: "Aula 208 - Bloque D" },
];

const INT_TAMANO_MAXIMO_MB = 10;

const objFormularioInicial = {
  strIdDocente: "",
  strIdAsignatura: "",
  strIdGrupo: "",
  strIdTipoExamen: "",
  strIdPeriodo: "",
  strIdAmbiente: "",
  strFecha: "",
  strHoraInicio: "",
  strHoraFin: "",
  strObservaciones: "",
};

// Fecha de hoy en formato YYYY-MM-DD usando la hora local (para bloquear fechas futuras)
function fnFechaHoyLocal() {
  const fechaHoy = new Date();
  const strMes = String(fechaHoy.getMonth() + 1).padStart(2, "0");
  const strDia = String(fechaHoy.getDate()).padStart(2, "0");
  return `${fechaHoy.getFullYear()}-${strMes}-${strDia}`;
}

function fnFormatearTamano(intBytes) {
  return `${(intBytes / 1024 / 1024).toFixed(2)} MB`;
}

const strClaseControl =
  "w-full h-10 rounded-[10px] border bg-white text-[13px] text-[#123F7B] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed";

function Seccion({ intNumero, strTitulo, children }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2563EB] text-white text-[11px] font-extrabold">
          {intNumero}
        </span>
        <h2 className="text-sm font-extrabold text-[#123F7B]">{strTitulo}</h2>
      </div>
      {children}
    </section>
  );
}

function Campo({ strId, strEtiqueta, boolObligatorio = false, strError, children }) {
  return (
    <div>
      <label htmlFor={strId} className="block mb-1.5 text-[11px] font-bold text-[#123F7B]">
        {strEtiqueta}
        {boolObligatorio && <span className="ml-0.5 text-[#D93856]">*</span>}
      </label>
      {children}
      {strError && (
        <p className="mt-1 text-[11px] font-semibold text-[#D93856]" role="alert">
          {strError}
        </p>
      )}
    </div>
  );
}

function CampoSelect({
  strId,
  strEtiqueta,
  strNombreCampo,
  strPlaceholder,
  arrOpciones,
  IconoCampo,
  strValor,
  objErrores,
  boolDeshabilitado = false,
  fnAlCambiar,
}) {
  return (
    <Campo strId={strId} strEtiqueta={strEtiqueta} boolObligatorio strError={objErrores[strNombreCampo]}>
      <div className="relative">
        {IconoCampo && (
          <IconoCampo className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#123F7B] pointer-events-none" />
        )}
        <select
          id={strId}
          value={strValor}
          disabled={boolDeshabilitado}
          onChange={(evento) => fnAlCambiar(strNombreCampo, evento.target.value)}
          className={`${strClaseControl} appearance-none cursor-pointer pr-9 ${IconoCampo ? "pl-9" : "pl-3"} ${
            objErrores[strNombreCampo] ? "border-[#D93856]" : "border-[#D6DFEF]"
          } ${strValor === "" ? "text-[#94A3B8]" : ""}`}
        >
          <option value="">{strPlaceholder}</option>
          {arrOpciones.map((opcion) => (
            <option key={opcion.intId} value={opcion.intId}>
              {opcion.strNombre}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
      </div>
    </Campo>
  );
}

export default function CargaExamenesPasados() {
  const [objForm, setObjForm] = useState(objFormularioInicial);
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [objErrores, setObjErrores] = useState({});
  const [boolArrastrando, setBoolArrastrando] = useState(false);
  const [boolGuardando, setBoolGuardando] = useState(false);
  const [strMensajeExito, setStrMensajeExito] = useState("");
  const [strErrorGeneral, setStrErrorGeneral] = useState("");
  const refInputArchivo = useRef(null);

  // ───────────── TODO BACKEND (catálogos) ─────────────
  // Hoy los selects usan los arreglos mock de arriba. Cuando haya endpoints,
  // cargar cada catálogo en un useEffect (GET /docentes, /asignaturas, /grupos,
  // /tipos-examen, /periodos, /ambientes), guardarlos en estado y usarlos en
  // lugar de arrDocentesMock, arrAsignaturasMock, etc.
  // ────────────────────────────────────────────────────

  const arrGruposFiltrados = arrGruposMock.filter(
    (grupo) => String(grupo.intIdAsignatura) === objForm.strIdAsignatura
  );

  const fnCambiarCampo = (strCampo, strValor) => {
    setStrMensajeExito("");
    setStrErrorGeneral("");
    setObjErrores((objPrev) => ({ ...objPrev, [strCampo]: undefined }));
    setObjForm((objPrev) => {
      const objNuevo = { ...objPrev, [strCampo]: strValor };
      // Si cambia la asignatura, el grupo elegido deja de ser válido
      if (strCampo === "strIdAsignatura") objNuevo.strIdGrupo = "";
      return objNuevo;
    });
  };

  const fnElegirArchivo = (archivo) => {
    if (!archivo) return;
    setStrMensajeExito("");
    setStrErrorGeneral("");

    const boolEsPdf = archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
    if (!boolEsPdf) {
      setArchivoPdf(null);
      setObjErrores((objPrev) => ({ ...objPrev, archivo: "El archivo debe ser un PDF." }));
      return;
    }
    if (archivo.size > INT_TAMANO_MAXIMO_MB * 1024 * 1024) {
      setArchivoPdf(null);
      setObjErrores((objPrev) => ({
        ...objPrev,
        archivo: `El archivo supera el máximo de ${INT_TAMANO_MAXIMO_MB} MB.`,
      }));
      return;
    }
    setObjErrores((objPrev) => ({ ...objPrev, archivo: undefined }));
    setArchivoPdf(archivo);
  };

  const fnAlSoltarArchivo = (evento) => {
    evento.preventDefault();
    setBoolArrastrando(false);
    fnElegirArchivo(evento.dataTransfer.files?.[0]);
  };

  const fnQuitarArchivo = () => {
    setArchivoPdf(null);
    if (refInputArchivo.current) refInputArchivo.current.value = "";
  };

  const fnValidar = () => {
    const strObligatorio = "Este campo es obligatorio.";
    const objNuevosErrores = {};

    [
      "strIdDocente",
      "strIdAsignatura",
      "strIdGrupo",
      "strIdTipoExamen",
      "strIdPeriodo",
      "strIdAmbiente",
      "strFecha",
      "strHoraInicio",
      "strHoraFin",
    ].forEach((strCampo) => {
      if (!objForm[strCampo]) objNuevosErrores[strCampo] = strObligatorio;
    });

    if (objForm.strFecha && objForm.strFecha > fnFechaHoyLocal()) {
      objNuevosErrores.strFecha = "La fecha no puede ser futura: es un examen ya realizado.";
    }
    if (objForm.strHoraInicio && objForm.strHoraFin && objForm.strHoraFin <= objForm.strHoraInicio) {
      objNuevosErrores.strHoraFin = "Debe ser posterior a la hora de inicio.";
    }
    if (!archivoPdf) {
      objNuevosErrores.archivo = "Adjunta el PDF del examen.";
    }

    setObjErrores(objNuevosErrores);
    return Object.keys(objNuevosErrores).length === 0;
  };

  const fnLimpiarFormulario = () => {
    setObjForm(objFormularioInicial);
    setObjErrores({});
    setStrErrorGeneral("");
    fnQuitarArchivo();
  };

  const fnGuardar = async (evento) => {
    evento.preventDefault();
    setStrMensajeExito("");
    setStrErrorGeneral("");
    if (!fnValidar()) return;

    setBoolGuardando(true);
    try {
      const objDatos = new FormData();
      objDatos.append("intIdDocente", objForm.strIdDocente);
      objDatos.append("intIdAsignatura", objForm.strIdAsignatura);
      objDatos.append("intIdGrupo", objForm.strIdGrupo);
      objDatos.append("intIdTipoExamen", objForm.strIdTipoExamen);
      objDatos.append("intIdPeriodo", objForm.strIdPeriodo);
      objDatos.append("intIdAmbiente", objForm.strIdAmbiente);
      objDatos.append("strFecha", objForm.strFecha);
      objDatos.append("strHoraInicio", objForm.strHoraInicio);
      objDatos.append("strHoraFin", objForm.strHoraFin);
      objDatos.append("strObservaciones", objForm.strObservaciones.trim());
      objDatos.append("archivoPdf", archivoPdf);

      // ───────────── TODO BACKEND (guardar) ─────────────
      // Reemplazar la línea de espera de abajo (simula el guardado) por:
      //
      //   const respuesta = await fetch(`${import.meta.env.VITE_API_URL}/examenes/pasados`, {
      //     method: "POST",
      //     headers: { Authorization: `Bearer ${obtenerToken()}` }, // sin Content-Type: lo pone el navegador
      //     body: objDatos,
      //   });
      //   if (!respuesta.ok) throw new Error("No se pudo guardar el examen pasado.");
      //
      // (importar obtenerToken desde "../../../services/authService")
      await new Promise((fnResolver) => setTimeout(fnResolver, 900));
      // ──────────────────────────────────────────────────

      fnLimpiarFormulario();
      setStrMensajeExito("El examen pasado se guardó correctamente.");
    } catch (error) {
      setStrErrorGeneral(error.message || "Ocurrió un error inesperado. Intenta nuevamente.");
    } finally {
      setBoolGuardando(false);
    }
  };

  return (
    <div className="w-full">
      <p className="text-xs text-[#64748B]">
        Registra un examen ya realizado y adjunta su PDF para que quede guardado en el sistema.
      </p>

      <form
        onSubmit={fnGuardar}
        noValidate
        className="mt-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 md:px-7 md:py-6 shadow-[0_1px_4px_rgba(30,64,175,0.05)]"
      >
        {strMensajeExito && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#ECFDF3] border border-[#B7EBCB] text-sm font-semibold text-[#15803D]"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {strMensajeExito}
          </div>
        )}
        {strErrorGeneral && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 rounded-xl bg-[#FDEEF1] border border-[#F5C6CF] text-sm font-semibold text-[#D93856]"
          >
            {strErrorGeneral}
          </div>
        )}

        <Seccion intNumero={1} strTitulo="Datos del examen">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
            <CampoSelect
              strId="docente"
              strEtiqueta="Docente"
              strNombreCampo="strIdDocente"
              strPlaceholder="Selecciona un docente"
              arrOpciones={arrDocentesMock}
              IconoCampo={User}
              strValor={objForm.strIdDocente}
              objErrores={objErrores}
              fnAlCambiar={fnCambiarCampo}
            />
            <CampoSelect
              strId="asignatura"
              strEtiqueta="Asignatura"
              strNombreCampo="strIdAsignatura"
              strPlaceholder="Selecciona una asignatura"
              arrOpciones={arrAsignaturasMock}
              IconoCampo={BookOpen}
              strValor={objForm.strIdAsignatura}
              objErrores={objErrores}
              fnAlCambiar={fnCambiarCampo}
            />
            <CampoSelect
              strId="grupo"
              strEtiqueta="Grupo"
              strNombreCampo="strIdGrupo"
              strPlaceholder={objForm.strIdAsignatura ? "Selecciona un grupo" : "Primero elige la asignatura"}
              arrOpciones={arrGruposFiltrados}
              IconoCampo={LayoutGrid}
              strValor={objForm.strIdGrupo}
              objErrores={objErrores}
              boolDeshabilitado={!objForm.strIdAsignatura}
              fnAlCambiar={fnCambiarCampo}
            />
            <CampoSelect
              strId="tipo-examen"
              strEtiqueta="Tipo de examen"
              strNombreCampo="strIdTipoExamen"
              strPlaceholder="Selecciona el tipo"
              arrOpciones={arrTiposExamenMock}
              IconoCampo={ListChecks}
              strValor={objForm.strIdTipoExamen}
              objErrores={objErrores}
              fnAlCambiar={fnCambiarCampo}
            />
            <CampoSelect
              strId="periodo"
              strEtiqueta="Gestión / Periodo"
              strNombreCampo="strIdPeriodo"
              strPlaceholder="Selecciona el periodo"
              arrOpciones={arrPeriodosMock}
              IconoCampo={CalendarRange}
              strValor={objForm.strIdPeriodo}
              objErrores={objErrores}
              fnAlCambiar={fnCambiarCampo}
            />
            <CampoSelect
              strId="ambiente"
              strEtiqueta="Ambiente"
              strNombreCampo="strIdAmbiente"
              strPlaceholder="Selecciona un ambiente"
              arrOpciones={arrAmbientesMock}
              IconoCampo={MapPin}
              strValor={objForm.strIdAmbiente}
              objErrores={objErrores}
              fnAlCambiar={fnCambiarCampo}
            />
          </div>
        </Seccion>

        <Seccion intNumero={2} strTitulo="Fecha y hora en que se tomó el examen">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
            <Campo strId="fecha" strEtiqueta="Fecha del examen" boolObligatorio strError={objErrores.strFecha}>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#123F7B] pointer-events-none" />
                <input
                  id="fecha"
                  type="date"
                  max={fnFechaHoyLocal()}
                  value={objForm.strFecha}
                  onChange={(evento) => fnCambiarCampo("strFecha", evento.target.value)}
                  className={`${strClaseControl} pl-9 pr-3 ${objErrores.strFecha ? "border-[#D93856]" : "border-[#D6DFEF]"}`}
                />
              </div>
            </Campo>
            <Campo strId="hora-inicio" strEtiqueta="Hora de inicio" boolObligatorio strError={objErrores.strHoraInicio}>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#123F7B] pointer-events-none" />
                <input
                  id="hora-inicio"
                  type="time"
                  value={objForm.strHoraInicio}
                  onChange={(evento) => fnCambiarCampo("strHoraInicio", evento.target.value)}
                  className={`${strClaseControl} pl-9 pr-3 ${objErrores.strHoraInicio ? "border-[#D93856]" : "border-[#D6DFEF]"}`}
                />
              </div>
            </Campo>
            <Campo strId="hora-fin" strEtiqueta="Hora de fin" boolObligatorio strError={objErrores.strHoraFin}>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#123F7B] pointer-events-none" />
                <input
                  id="hora-fin"
                  type="time"
                  value={objForm.strHoraFin}
                  onChange={(evento) => fnCambiarCampo("strHoraFin", evento.target.value)}
                  className={`${strClaseControl} pl-9 pr-3 ${objErrores.strHoraFin ? "border-[#D93856]" : "border-[#D6DFEF]"}`}
                />
              </div>
            </Campo>
          </div>
        </Seccion>

        <Seccion intNumero={3} strTitulo="Documento del examen">
          <input
            ref={refInputArchivo}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(evento) => fnElegirArchivo(evento.target.files?.[0])}
          />

          {!archivoPdf ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => refInputArchivo.current?.click()}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                  evento.preventDefault();
                  refInputArchivo.current?.click();
                }
              }}
              onDragOver={(evento) => {
                evento.preventDefault();
                setBoolArrastrando(true);
              }}
              onDragLeave={() => setBoolArrastrando(false)}
              onDrop={fnAlSoltarArchivo}
              className={`flex flex-col items-center justify-center text-center px-4 py-10 rounded-[18px] border-2 border-dashed cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
                boolArrastrando
                  ? "border-[#2563EB] bg-[#E3ECFF]"
                  : objErrores.archivo
                  ? "border-[#D93856] bg-[#FFF7F8]"
                  : "border-[#A9C1EE] bg-[#F5F8FF] hover:bg-[#EEF3FF]"
              }`}
            >
              <div className="flex items-center justify-center w-[46px] h-[46px] rounded-full bg-white shadow-[0_3px_10px_rgba(30,64,175,0.15)]">
                <Upload className="w-[22px] h-[22px] text-[#2563EB]" />
              </div>
              <p className="mt-3.5 text-[13px] font-extrabold text-[#123F7B]">
                Arrastra y suelta el PDF del examen aquí
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">o haz clic para seleccionar</p>
              <span className="mt-3 inline-flex items-center h-[22px] px-3 rounded-md bg-[#D93856] text-white text-[10px] font-bold">
                .PDF
              </span>
              <p className="mt-3 text-[11px] text-[#94A3B8]">
                Tamaño máximo por archivo: <b className="text-[#64748B]">{INT_TAMANO_MAXIMO_MB} MB</b>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-[#B9CDF5] bg-[#F5F8FF]">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#D93856] shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-[#123F7B] truncate">{archivoPdf.name}</p>
                <p className="text-[11px] text-[#64748B]">{fnFormatearTamano(archivoPdf.size)}</p>
              </div>
              <button
                type="button"
                onClick={fnQuitarArchivo}
                aria-label="Quitar archivo"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#64748B] transition-colors duration-200 hover:bg-white hover:text-[#D93856] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {objErrores.archivo && (
            <p className="mt-2 text-[11px] font-semibold text-[#D93856]" role="alert">
              {objErrores.archivo}
            </p>
          )}
        </Seccion>

        <div className="mb-7">
          <label htmlFor="observaciones" className="block mb-1.5 text-[11px] font-bold text-[#123F7B]">
            Observaciones <span className="font-semibold text-[#94A3B8]">(Opcional)</span>
          </label>
          <textarea
            id="observaciones"
            rows={3}
            maxLength={500}
            value={objForm.strObservaciones}
            onChange={(evento) => fnCambiarCampo("strObservaciones", evento.target.value)}
            placeholder="Agrega alguna nota sobre este examen..."
            className="w-full px-3 py-3 rounded-[10px] border border-[#D6DFEF] bg-white text-[13px] text-[#123F7B] placeholder:text-[#94A3B8] resize-none transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
          />
          <p className="mt-1 text-right text-[10px] text-[#94A3B8]">{objForm.strObservaciones.length}/500</p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-5 border-t border-[#EEF1F8]">
          <button
            type="button"
            onClick={fnLimpiarFormulario}
            disabled={boolGuardando}
            className="inline-flex items-center justify-center h-10 px-[22px] rounded-[10px] border border-[#D6DFEF] bg-white text-xs font-extrabold text-[#123F7B] transition-colors duration-200 hover:bg-[#F5F8FF] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={boolGuardando}
            className="inline-flex items-center justify-center gap-2 h-10 px-[22px] rounded-[10px] bg-[#123F7B] text-white text-xs font-extrabold transition-colors duration-200 hover:bg-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            <Save className="w-4 h-4" />
            {boolGuardando ? "Guardando..." : "Guardar examen pasado"}
          </button>
        </div>
      </form>
    </div>
  );
}
