// "Mis exámenes" del ayudante: todos los exámenes donde registra el ingreso (como "Mis exámenes" del docente).
// Botones por estado:
// - En curso (o desde 15 min antes): "Registrar ingreso".
// - Antes de terminar: "Modo sin conexión" de Yuri (descargar nómina / forzar), abajo a lo ancho, sin cambiar su función.
// - Finalizado: sin botones.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerExamenesAsignados } from "../../../services/ingresoService";
import { FilaNominaSinConexion } from "../ingreso/componentes/ListaExamenesHoy";
import { ordenarExamenes, esHoyAyudante, puedeRegistrar, aperturaRegistro, horaCorta, textoAula, textoGrupo } from "../utilidadesAyudante";

const FILTROS = [
  { clave: "TODOS", etiqueta: "Todos" },
  { clave: "EN_CURSO", etiqueta: "En curso" },
  { clave: "PROXIMO", etiqueta: "Próximos" },
  { clave: "FINALIZADO", etiqueta: "Finalizados" },
];
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function partesFecha(strFecha) {
  const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? { strDia: String(Number(m[3])), strMes: MESES[Number(m[2]) - 1] } : null;
}

function TarjetaExamenAyudante({ examen, strEstado, dateAhora, onRegistrar }) {
  const boolEnCurso = strEstado === "EN_CURSO";
  const boolFinalizado = strEstado === "FINALIZADO";
  const boolHoy = esHoyAyudante(examen, dateAhora);
  const boolRegistro = puedeRegistrar(examen, dateAhora);
  const dateApertura = aperturaRegistro(examen);
  const boolAviso = boolHoy && strEstado === "PROXIMO" && dateApertura && dateAhora < dateApertura;
  const objFecha = partesFecha(examen.fecha);

  const objBadge = boolEnCurso
    ? { strTexto: "● En curso", strClase: "bg-[#003770] text-white" }
    : boolFinalizado
      ? { strTexto: "Finalizado", strClase: "bg-[#F1F5F9] text-[#64748B]" }
      : { strTexto: boolHoy ? "Hoy" : "Próximo", strClase: "bg-[#E8F1FB] text-[#003770]" };

  const strDetalle = [
    textoGrupo(examen.grupo),
    examen.horaInicio && examen.horaFin ? `${examen.horaInicio} – ${examen.horaFin}` : examen.horaInicio,
    textoAula(examen.aula),
  ].filter(Boolean).join(" · ");

  return (
    <div
      className={
        "border rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap max-md:px-4 " +
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
        ) : <b className="text-base text-[#94A3B8]">—</b>}
      </div>

      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="m-0 font-black text-sm text-[#08264A] uppercase">{examen.materia}</h4>
          <span className={"text-[10px] font-extrabold px-2 py-0.5 rounded-full " + objBadge.strClase}>{objBadge.strTexto}</span>
        </div>
        <p className="mt-0.5 text-xs font-bold text-[#64748B]">
          {examen.tipo && <span className="text-[#124B83]">{examen.tipo}</span>}
          {examen.tipo && strDetalle ? " · " : ""}
          {strDetalle}
        </p>
        {boolAviso && (
          <p className="mt-1 text-[11px] font-semibold text-[#64748B]">El registro se habilita a las {horaCorta(dateApertura)}</p>
        )}
      </div>

      {!boolFinalizado && (
        <div className="flex flex-col items-end gap-2 max-md:w-full max-md:items-stretch">
          {boolRegistro && (
            <button
              type="button"
              onClick={() => onRegistrar(examen)}
              className="bg-[#003770] hover:bg-[#124B83] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              Registrar ingreso
            </button>
          )}
        </div>
      )}

      {!boolFinalizado && (
        <div className="basis-full pt-3 border-t border-[#E2E8F0]">
          <FilaNominaSinConexion examen={examen} />
        </div>
      )}
    </div>
  );
}

export default function MisExamenesAyudante() {
  const navigate = useNavigate();
  const [listExamenes, setListExamenes] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [strFiltro, setStrFiltro] = useState("TODOS");

  const [dateAhora, setDateAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDateAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let boolVivo = true;
    let temporizadorReintento = null;

    const cargar = async (intento = 0) => {
      try {
        const list = await obtenerExamenesAsignados();
        const arr = Array.isArray(list) ? list : [];

        // Después de guardar una asignación, el primer GET puede llegar antes
        // de que la transacción sea visible para la lectura del operador.
        // Reintentamos una vez para evitar mostrar una pantalla vacía falsa.
        if (arr.length === 0 && intento === 0 && boolVivo) {
          temporizadorReintento = setTimeout(() => cargar(1), 1000);
          return;
        }

        if (boolVivo) setListExamenes(arr);
      } catch (e) {
        if (boolVivo) setStrError(e.message || "No se pudieron cargar tus exámenes.");
      } finally {
        if (intento > 0 && boolVivo) setBoolCargando(false);
        else if (intento === 0 && !temporizadorReintento && boolVivo) setBoolCargando(false);
      }
    };

    cargar();
    return () => {
      boolVivo = false;
      if (temporizadorReintento) clearTimeout(temporizadorReintento);
    };
  }, []);

  const listVisibles = useMemo(
    () => ordenarExamenes(listExamenes, dateAhora).filter(({ strEstado }) => strFiltro === "TODOS" || strEstado === strFiltro),
    [listExamenes, dateAhora, strFiltro]
  );

  // Abre la pantalla de registro de ese examen (en Inicio)
  const fnRegistrar = (examen) => navigate("/control/conectado", { state: { idExamen: examen.id } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-[#1A365D]">Mis exámenes</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Los exámenes en los que registras el ingreso.</p>
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

      {strError && <div role="alert" className="px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">{strError}</div>}

      <div className="space-y-3">
        {boolCargando ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold animate-pulse bg-white rounded-2xl border border-slate-200">Cargando exámenes…</div>
        ) : listVisibles.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-white rounded-2xl border border-slate-200">
            {listExamenes.length === 0 ? "Aún no tienes exámenes asignados." : "No hay exámenes que coincidan con el filtro."}
          </div>
        ) : (
          listVisibles.map(({ e, strEstado }) => (
            <TarjetaExamenAyudante key={e.id} examen={e} strEstado={strEstado} dateAhora={dateAhora} onRegistrar={fnRegistrar} />
          ))
        )}
      </div>
    </div>
  );
}
