import { textoInterfaz } from '../../../../utils/textoInterfaz.js';
// Encabezado del examen que se está controlando (bloque azul):
// tipo de examen, materia, fecha · horario · aula, botón de acciones y contadores
import { textoGrupoExamen } from "../../../../components/examenes/textoGrupoExamen";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "2026-10-23" → "Viernes 23 de octubre" (si no hay fecha, se usa la de hoy)
function textoFecha(strFecha) {
  let date = new Date();
  const m = String(strFecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DIAS[date.getDay()]} ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

// Evita "Aula Aula 691A" cuando el nombre ya trae la palabra
function textoAula(strAula) {
  if (!strAula) return "";
  return /^aula/i.test(String(strAula).trim()) ? String(strAula).trim() : `Aula ${strAula}`;
}

// Los nombres llegan en mayúsculas y sin tildes ("INTRODUCCION A LA PROGRAMACION").
// Se corrigen las terminaciones que siempre llevan tilde (-CIÓN, -SIÓN) y palabras frecuentes.
const PALABRAS_CON_TILDE = {
  INFORMATICA: "INFORMÁTICA", MATEMATICA: "MATEMÁTICA", MATEMATICAS: "MATEMÁTICAS", FISICA: "FÍSICA",
  QUIMICA: "QUÍMICA", LOGICA: "LÓGICA", ELECTRONICA: "ELECTRÓNICA", ESTADISTICA: "ESTADÍSTICA",
  CALCULO: "CÁLCULO", ALGEBRA: "ÁLGEBRA", BASICA: "BÁSICA", BASICO: "BÁSICO", NUMERICO: "NUMÉRICO",
  NUMERICOS: "NUMÉRICOS", METODOS: "MÉTODOS", METODO: "MÉTODO", ANALISIS: "ANÁLISIS", TECNICAS: "TÉCNICAS",
  TECNICA: "TÉCNICA", DINAMICA: "DINÁMICA", MECANICA: "MECÁNICA", GEOMETRIA: "GEOMETRÍA",
  INGENIERIA: "INGENIERÍA", TEORIA: "TEORÍA", ECONOMIA: "ECONOMÍA", GRAFICA: "GRÁFICA", GRAFICOS: "GRÁFICOS",
  INTELIGENCIA: "INTELIGENCIA", AUDITORIA: "AUDITORÍA", OPERATIVA: "OPERATIVA", ELECTRICOS: "ELÉCTRICOS",
  ELECTRICA: "ELÉCTRICA", AUTOMATICO: "AUTOMÁTICO", ARQUITECTURA: "ARQUITECTURA", PRACTICA: "PRÁCTICA",
};
function conTildes(strTexto) {
  return String(strTexto || "").replace(/[A-Za-zÁÉÍÓÚÑáéíóúñ]+/g, (strPalabra) => {
    const strMayus = strPalabra.toUpperCase();
    let strNueva = PALABRAS_CON_TILDE[strMayus] || strMayus.replace(/([CS])ION(ES)?$/, (m, c, es) => (es ? `${c}IONES` : `${c}IÓN`));
    if (strNueva === strMayus) return strPalabra;
    return strPalabra === strMayus ? strNueva : strNueva.charAt(0) + strNueva.slice(1).toLowerCase();
  });
}

// boolRojo: recuadro rojo de la paleta (#B91C1C) con la cifra en blanco (Inhabilitados)
function Contador({ numValor, strEtiqueta, boolRojo = false }) {
  return (
    <div className={"min-w-[88px] max-md:min-w-0 rounded-lg px-3 py-2 " + (boolRojo ? "bg-[#B91C1C]" : "bg-white/10")}>
      <b className="block text-[18px] max-md:text-[16px] leading-none font-bold text-white">{numValor}</b>
      <span className={"block mt-1 text-[11px] " + (boolRojo ? "text-white" : "text-white/80")}>{textoInterfaz(strEtiqueta)}</span>
    </div>
  );
}

// children: botones a la derecha (por ejemplo "Lista oficial del examen")
// listAvisos: avisos extra en texto (por ejemplo "Registro desde las 19:15")
// strEstadoVivo: "vivo" (con internet, examen abierto), "finalizado" o null (sin internet)
export default function TarjetaExamen({ examen, objContador, children, listAvisos = [], strEstadoVivo = null }) {
  if (!examen) {
    return (
      <section className="bg-[#003770] rounded-2xl px-6 py-6 text-sm text-white/80">
        Cargando examen asignado…
      </section>
    );
  }

  const numIng = objContador?.ingresaron ?? 0;
  const numHab = objContador?.habilitados ?? 0;
  const numExp = objContador?.expulsados ?? 0;
  const numPend = objContador?.pendientes ?? Math.max(0, numHab - numIng - numExp);
  const numInh = objContador?.inhabilitados ?? 0;
  const strGrupo = textoGrupoExamen(examen.grupo);
  const strHorario = examen.horaInicio && examen.horaFin ? `${examen.horaInicio} – ${examen.horaFin}` : examen.horaInicio || "";

  return (
    <section aria-label="Examen en control" className="bg-[#003770] rounded-2xl px-7 py-6 max-md:px-4 max-md:py-5 text-white">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-4 items-start">
        <div className="min-w-0">
          {/* Tipo de examen + estado de la conexión ("En vivo") */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-xs font-bold tracking-[.8px] text-white/75">
              Control de ingreso · {textoInterfaz(conTildes(examen.tipo))}{strGrupo ? ` · ${strGrupo}` : ""}
            </span>
            {strEstadoVivo === "vivo" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-white">
                <i className="w-1.5 h-1.5 rounded-full bg-[#7DD3FC] shadow-[0_0_0_3px_rgba(125,211,252,.25)] animate-pulse" />
                En vivo
              </span>
            )}
            {strEstadoVivo === "finalizado" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-white/85">
                Examen finalizado
              </span>
            )}
          </div>
          <h1 className="m-0 mt-1 text-[28px] max-md:text-[22px] font-bold leading-tight break-words">{textoInterfaz(conTildes(examen.materia))}</h1>
          {/* Fecha · horario · aula en texto simple (sin recuadros) */}
          <p className="m-0 mt-2 text-[13px] font-medium text-white/80">
            {[textoFecha(examen.fecha), strHorario, examen.aula ? textoAula(examen.aula) : ""].filter(Boolean).join(" · ")}
          </p>
          {listAvisos.filter(Boolean).length > 0 && (
            <p className="m-0 mt-1 text-[13px] max-md:text-xs text-white/70">{listAvisos.filter(Boolean).join(" · ")}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 min-w-0 md:items-end">
          {children && <div className="flex flex-wrap justify-end gap-2 max-md:justify-start max-md:w-full">{children}</div>}
          {/* Tantas columnas como contadores: sin espacio vacío al lado del recuadro rojo */}
          <div className={"grid gap-2 max-md:w-full " + (numExp > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            <Contador numValor={numIng} strEtiqueta="Ingresaron" />
            <Contador numValor={numPend} strEtiqueta="Ausentes" />
            {/* Entró pero se lo retiró del examen: no cuenta como ausente. */}
            {numExp > 0 && <Contador numValor={numExp} strEtiqueta="Expulsados" />}
            <Contador numValor={numInh} strEtiqueta="Inhabilitados" boolRojo />
          </div>
        </div>
      </div>
    </section>
  );
}
