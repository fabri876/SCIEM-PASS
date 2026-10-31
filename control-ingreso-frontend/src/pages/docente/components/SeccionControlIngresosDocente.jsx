// Sección "Control de ingreso" del docente: lo operativo de cada examen
// (ayudantes, nómina para trabajar sin internet, entrar a controlar y revisar los ingresos).
// Orden: en curso, próximos (el más cercano primero) y finalizados (el más reciente primero).
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Check } from "lucide-react";
import { obtenerAsignacionIngreso } from "../../../services/asignacionOperadoresService";
import { useNominaLocal } from "../../../offline";
import PanelIngresosExamen from "../../control/ingreso/componentes/PanelIngresosExamen";
// "Seguridad de Sistemas · Primer Parcial · 24 oct" para el panel de ingresos
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function subtituloIngresos(strMateria, strTipo, strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  const strDia = m ? `${Number(m[3])} ${MESES_CORTOS[Number(m[2]) - 1]}` : "";
  return [strMateria, strTipo, strDia].filter(Boolean).join(" · ");
}

import { estadoExamen, esHoy, puedeControlarIngreso, marcaTiempo } from "../utilidadesExamenDocente";
import { textoGrupoExamen } from "../../../components/examenes/textoGrupoExamen";

const FILTROS = [
  { clave: "TODOS", etiqueta: "Todos" },
  { clave: "EN_CURSO", etiqueta: "En curso" },
  { clave: "PROXIMO", etiqueta: "Próximos" },
  { clave: "FINALIZADO", etiqueta: "Finalizados" },
];

const ORDEN_ESTADO = { EN_CURSO: 0, PROXIMO: 1, SIN_FECHA: 2, FINALIZADO: 3 };
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function partesFecha(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? { strDia: String(Number(m[3])), strMes: MESES[Number(m[2]) - 1] } : null;
}

// "Aula 690B" o "Aulas 691A y 691B"
function textoAulas(examen) {
  const list = (examen.ambientes || [])
    .map((a) => String(a.nombreAmbiente || a.nombreAula || "").replace(/^aula\s*/i, "").trim())
    .filter(Boolean);
  if (list.length === 0) return examen.aulaNombre && examen.aulaNombre !== "Aula por definir" ? examen.aulaNombre : "Aula por definir";
  if (list.length === 1) return `Aula ${list[0]}`;
  return `Aulas ${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

const BOTON = "w-full inline-flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap";
const BOTON_PRINCIPAL = BOTON + " bg-[#003770] hover:bg-[#124B83] text-white";
const BOTON_SECUNDARIO = BOTON + " bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#1A365D]";

function TarjetaControlDocente({ examen, objAsig, dateAhora, onAsignarOperadores, onVerIngresos }) {
  const navigate = useNavigate();
  const nomina = useNominaLocal(examen.idExamen);

  const strEstado = estadoExamen(examen, dateAhora);
  const boolEnCurso = strEstado === "EN_CURSO";
  const boolFinalizado = strEstado === "FINALIZADO";
  const boolHoy = esHoy(examen, dateAhora);
  const boolControl = puedeControlarIngreso(examen, dateAhora);
  const objFecha = partesFecha(examen.fechaExamen);

  const numResponsables = objAsig?.responsables || 0;
  const boolHayAsignacion = Boolean(objAsig?.hay) && numResponsables > 0;
  const boolNominaLista = Boolean(nomina.estado?.lista);

  const objBadge = boolEnCurso
    ? { strTexto: "● En curso", strClase: "bg-[#003770] text-white" }
    : strEstado === "PROXIMO"
      ? { strTexto: boolHoy ? "Hoy" : "Próximo", strClase: "bg-[#E8F1FB] text-[#003770]" }
      : boolFinalizado
        ? { strTexto: "Finalizado", strClase: "bg-[#F1F5F9] text-[#64748B]" }
        : null;

  const strGrupo = textoGrupoExamen(examen.grupo);
  const strDetalle = [strGrupo, examen.horario, textoAulas(examen)].filter(Boolean).join(" · ");

  const fnDescargar = () => {
    nomina.descargar({ completa: true }).catch(() => {});
  };

  // Antes del examen se puede asignar/editar; después solo ver (la pantalla queda en solo lectura)
  const strBotonAyudantes = boolEnCurso || boolFinalizado ? "Ver ayudantes" : boolHayAsignacion ? "Editar ayudantes" : "Asignar ayudantes";

  return (
    <article
      className={
        "border rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap transition max-md:px-4 " +
        (boolFinalizado ? "bg-[#FBFCFE] " : "bg-white ") +
        (boolEnCurso ? "border-[#003770] shadow-[0_4px_14px_rgba(0,55,112,.08)]" : "border-[#CBD5E1]")
      }
    >
      <div className={"w-14 h-14 rounded-[10px] flex flex-col items-center justify-center shrink-0 " + (boolFinalizado || !objFecha ? "bg-[#F1F5F9]" : "bg-[#E8F1FB]")}>
        {objFecha ? (
          <>
            <b className={"text-xl leading-none font-black " + (boolFinalizado ? "text-[#64748B]" : "text-[#003770]")}>{objFecha.strDia}</b>
            <span className={"mt-0.5 text-[10px] font-extrabold " + (boolFinalizado ? "text-[#64748B]" : "text-[#003770]")}>{objFecha.strMes}</span>
          </>
        ) : (
          <b className="text-base text-[#94A3B8]">—</b>
        )}
      </div>

      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="m-0 font-black text-sm text-[#08264A] uppercase">{examen.nombreExamen}</h4>
          {objBadge && <span className={"text-[10px] font-extrabold px-2 py-0.5 rounded-full " + objBadge.strClase}>{objBadge.strTexto}</span>}
        </div>
        <p className="mt-0.5 text-xs font-bold text-[#64748B]">
          {examen.tipoExamen && <span className="text-[#124B83]">{examen.tipoExamen}</span>}
          {examen.tipoExamen && strDetalle ? " · " : ""}
          {strDetalle}
        </p>
        <p className={"mt-1 text-xs " + (boolHayAsignacion ? "text-[#475569]" : "font-bold text-[#B91C1C]")}>
          {boolHayAsignacion
            ? `${numResponsables} ${numResponsables === 1 ? "ayudante asignado" : "ayudantes asignados"}`
            : "Sin ayudantes asignados"}
        </p>
      </div>

      {/* Botones apilados */}
      <div className="flex flex-col gap-2 w-48 max-md:w-full">
        {boolControl && (
          <button
            type="button"
            onClick={() => navigate(`/home/docente/examenes/${examen.idExamen}/control-ingreso`, { state: { menuOrigen: "control-ingresos", examen } })}
            className={BOTON_PRINCIPAL}
          >
            Registrar ingreso
          </button>
        )}
        {boolFinalizado && (
          <button type="button" onClick={() => onVerIngresos(examen)} className={BOTON_SECUNDARIO}>
            Ver ingresos
          </button>
        )}
        {onAsignarOperadores && (
          <button
            type="button"
            onClick={() => onAsignarOperadores(examen.idExamen)}
            className={!boolControl && !boolFinalizado && !boolHayAsignacion ? BOTON_PRINCIPAL : BOTON_SECUNDARIO}
          >
            {strBotonAyudantes}
          </button>
        )}
        {!boolFinalizado && (boolNominaLista ? (
          <span className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E8F1FB] text-[#1860A3] text-xs font-extrabold py-2.5 px-4">
            <Check className="w-3.5 h-3.5" strokeWidth={3} /> Nómina descargada
          </span>
        ) : (
          <button type="button" onClick={fnDescargar} disabled={nomina.descargando} className={BOTON_SECUNDARIO + " disabled:opacity-50 disabled:cursor-not-allowed"}>
            <Download className="w-3.5 h-3.5" />
            {nomina.descargando ? "Descargando…" : "Descargar nómina"}
          </button>
        ))}
      </div>
    </article>
  );
}

export default function SeccionControlIngresosDocente({ examenes = [], boolCargando = false, onAsignarOperadores }) {
  const listExamenes = useMemo(() => (examenes || []).filter((ex) => ex.esExamenReal !== false), [examenes]);
  const [strFiltro, setStrFiltro] = useState("TODOS");
  const [objExamenLista, setObjExamenLista] = useState(null);

  // Hora actual: se actualiza cada 30 s para que los botones aparezcan y desaparezcan solos
  const [dateAhora, setDateAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const [objAsignaciones, setObjAsignaciones] = useState({});
  const strIdsExamenes = listExamenes.map((ex) => ex.idExamen).join(",");
  useEffect(() => {
    let cancel = false;
    Promise.all(
      listExamenes.map((ex) =>
        obtenerAsignacionIngreso(ex.idExamen)
          .then((a) => [ex.idExamen, { cargada: true, responsables: a ? (a.responsables || []).length : 0, hay: Boolean(a) }])
          .catch(() => [ex.idExamen, { cargada: true, responsables: 0, hay: false }])
      )
    ).then((pares) => { if (!cancel) setObjAsignaciones(Object.fromEntries(pares)); });
    return () => { cancel = true; };
  }, [strIdsExamenes]); // eslint-disable-line react-hooks/exhaustive-deps

  const listVisibles = useMemo(() => listExamenes
    .map((e) => ({ examen: e, strEstado: estadoExamen(e, dateAhora) }))
    .filter(({ strEstado }) => strFiltro === "TODOS" || strEstado === strFiltro)
    .sort((a, b) => {
      if (ORDEN_ESTADO[a.strEstado] !== ORDEN_ESTADO[b.strEstado]) return ORDEN_ESTADO[a.strEstado] - ORDEN_ESTADO[b.strEstado];
      return a.strEstado === "FINALIZADO"
        ? marcaTiempo(b.examen) - marcaTiempo(a.examen)
        : marcaTiempo(a.examen) - marcaTiempo(b.examen);
    })
    .map(({ examen }) => examen), [listExamenes, strFiltro, dateAhora]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1A365D]">Control de ingreso</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Selecciona el examen para gestionar el ingreso de los estudiantes.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            type="button"
            onClick={() => setStrFiltro(f.clave)}
            aria-pressed={strFiltro === f.clave}
            className={`px-4 h-9 rounded-full text-xs font-bold border transition cursor-pointer ${strFiltro === f.clave
              ? "bg-[#003770] text-white border-[#003770]"
              : "bg-white text-[#1A365D] border-slate-300 hover:bg-slate-50"}`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {boolCargando ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold animate-pulse bg-white rounded-2xl border border-slate-200">
            Cargando exámenes del docente...
          </div>
        ) : listVisibles.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-white rounded-2xl border border-slate-200">
            {listExamenes.length === 0
              ? "No tienes exámenes registrados para controlar ingresos."
              : "No hay exámenes que coincidan con el filtro."}
          </div>
        ) : (
          listVisibles.map((examen) => (
            <TarjetaControlDocente
              key={examen.idExamen}
              examen={examen}
              objAsig={objAsignaciones[examen.idExamen]}
              dateAhora={dateAhora}
              onAsignarOperadores={onAsignarOperadores}
              onVerIngresos={setObjExamenLista}
            />
          ))
        )}
      </div>

      {/* "Ver ingresos" de un examen finalizado: todos los estudiantes con su estado, hora y quién registró */}
      <PanelIngresosExamen
        boolAbierto={Boolean(objExamenLista)}
        onCerrar={() => setObjExamenLista(null)}
        idExamen={objExamenLista ? Number(objExamenLista.idExamen) : null}
        strSubtitulo={objExamenLista ? subtituloIngresos(objExamenLista.nombreExamen, objExamenLista.tipoExamen, objExamenLista.fechaExamen) : ""}
      />
    </div>
  );
}
