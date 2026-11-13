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

function Chip({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/15 text-[13px] font-semibold text-white whitespace-nowrap">
      {children}
    </span>
  );
}

// boolRojo: recuadro rojo de la paleta (#B91C1C) con la cifra en blanco (Inhabilitados)
function Contador({ numValor, strEtiqueta, boolRojo = false }) {
  return (
    <div className={"min-w-[104px] max-md:min-w-0 rounded-xl px-4 py-3 max-md:px-3 " + (boolRojo ? "bg-[#B91C1C]" : "bg-white/10")}>
      <b className="block text-[26px] max-md:text-[22px] leading-none font-bold text-white">{numValor}</b>
      <span className={"block mt-1.5 text-[13px] max-md:text-xs " + (boolRojo ? "text-white" : "text-white/80")}>{strEtiqueta}</span>
    </div>
  );
}

// children: botones a la derecha (por ejemplo "Lista oficial del aula")
// listAvisos: chips extra (por ejemplo "Registro desde las 19:15")
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
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1 basis-[320px]">
          <span className="block text-xs font-bold uppercase tracking-[.8px] text-white/75">
            Control de ingreso · {examen.tipo}{strGrupo ? ` · ${strGrupo}` : ""}
          </span>
          <h1 className="m-0 mt-1 text-[28px] max-md:text-[22px] font-bold leading-tight">{examen.materia}</h1>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Chip>{textoFecha(examen.fecha)}</Chip>
            {strHorario && <Chip>{strHorario}</Chip>}
            {examen.aula && <Chip>{textoAula(examen.aula)}</Chip>}
            {listAvisos.filter(Boolean).map((strAviso) => <Chip key={strAviso}>{strAviso}</Chip>)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 max-md:w-full max-md:items-stretch">
          {children && <div className="flex flex-wrap justify-end gap-2 max-md:justify-start">{children}</div>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-md:gap-2">
            <Contador numValor={numIng} strEtiqueta="Ingresaron" />
            <Contador numValor={numPend} strEtiqueta="Ausentes" />
            {/* Entró pero se lo retiró del examen: no cuenta como ausente. */}
            {numExp > 0 && <Contador numValor={numExp} strEtiqueta="Expulsados" />}
            <Contador numValor={numInh} strEtiqueta="Inhabilitados" boolRojo />
          </div>
          <span className="inline-flex items-center gap-2 text-[13px] text-white/75">
            {strEstadoVivo === "vivo" && (
              <>
                <i className="w-2 h-2 rounded-full bg-[#7DD3FC] shadow-[0_0_0_4px_rgba(125,211,252,.25)] animate-pulse" />
                <span>En vivo ·</span>
              </>
            )}
            {strEstadoVivo === "finalizado" && <span>Examen finalizado ·</span>}
            {numHab} {numHab === 1 ? "estudiante habilitado" : "estudiantes habilitados"}
          </span>
        </div>
      </div>
    </section>
  );
}