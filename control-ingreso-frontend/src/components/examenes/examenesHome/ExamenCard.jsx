/**
 * ExamenCard.jsx
 *
 * Tarjeta de un examen. Se usa en las dos pantallas:
 *  - Próximos: boolPasado = false -> muestra una etiqueta "En X días".
 *  - Pasados:  boolPasado = true  -> colores más apagados y botón "Descargar".
 *
 * Recibe un objeto "examen" con la forma que entrega examenesService
 * (intId, strFecha, strNombre, strDocente, strAmbiente, strHoraInicio,
 * strHoraFin). Ver docs/EXAMENES.md.
 */

const arrMeses = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "2026-10-20" -> Date local (evita el desfase de zona horaria de new Date("YYYY-MM-DD"))
function fnParsearFecha(strFecha) {
  const [intAnio, intMes, intDia] = strFecha.split("-").map(Number);
  return new Date(intAnio, intMes - 1, intDia);
}

function fnFormatearFechaLarga(strFecha) {
  const fecha = fnParsearFecha(strFecha);
  return `${fecha.getDate()} de ${arrMeses[fecha.getMonth()]}, ${fecha.getFullYear()}`;
}

function fnDiasRestantes(strFecha) {
  const fechaHoy = new Date();
  fechaHoy.setHours(0, 0, 0, 0);
  return Math.round((fnParsearFecha(strFecha) - fechaHoy) / 86400000);
}

function fnTextoCuentaRegresiva(strFecha) {
  const intDias = fnDiasRestantes(strFecha);
  if (intDias <= 0) return "Hoy";
  if (intDias === 1) return "Mañana";
  return `En ${intDias} días`;
}

function IconoDocente() {
  return (
    <svg className="w-4 h-4 stroke-[#64748B] fill-none stroke-[1.8] shrink-0" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

function IconoAmbiente() {
  return (
    <svg className="w-4 h-4 stroke-[#64748B] fill-none stroke-[1.8] shrink-0" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg className="w-3.5 h-3.5 stroke-[#8A9BB8] fill-none stroke-2 shrink-0" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconoDescarga() {
  return (
    <svg className="w-4 h-4 stroke-white fill-none stroke-2 shrink-0" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export default function ExamenCard({
  examen,
  boolPasado = false,
  boolDescargando = false,
  fnAlDescargar,
}) {
  const fechaExamen = fnParsearFecha(examen.strFecha);
  const strDia = String(fechaExamen.getDate()).padStart(2, "0");
  const strMesCorto = arrMeses[fechaExamen.getMonth()].slice(0, 3);

  return (
    <article
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white border border-[#E2E8F0] rounded-2xl p-4 md:px-[22px] md:py-5 shadow-[0_1px_4px_rgba(30,64,175,0.05)] transition-shadow duration-200 hover:shadow-[0_8px_22px_rgba(30,64,175,0.10)]"
    >
      <div className="flex items-start gap-4 min-w-0">
        {/* Bloque de fecha */}
        <div
          className={`flex flex-col items-center justify-center shrink-0 w-14 h-16 rounded-xl border ${
            boolPasado
              ? "bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]"
              : "bg-[#EEF3FF] border-[#D6E2FB] text-[#123F7B]"
          }`}
        >
          <span className="text-xl font-extrabold leading-none">{strDia}</span>
          <span className="mt-1 text-xs font-semibold">{strMesCorto}</span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[13px] text-[#94A3B8]">{fnFormatearFechaLarga(examen.strFecha)}</p>
            {!boolPasado && (
              <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#FDEEF1] text-[#D93856] text-[11px] font-bold">
                {fnTextoCuentaRegresiva(examen.strFecha)}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 text-[17px] font-extrabold text-[#123F7B] break-words">
            {examen.strNombre}
          </h3>

          <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-5 text-[13px] text-[#64748B]">
            <span className="inline-flex items-center gap-1.5">
              <IconoDocente />
              <span>
                <b className="font-bold text-[#123F7B]">Docente:</b> {examen.strDocente}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconoAmbiente />
              <span>
                <b className="font-bold text-[#123F7B]">Ambiente:</b> {examen.strAmbiente}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Horario de ingreso + acción */}
      <div className="flex items-center gap-3 md:shrink-0">
        <div className="flex-1 md:flex-none md:w-[170px] px-3.5 py-3 text-center rounded-xl bg-[#F3F6FD] border border-[#E3E9F5]">
          <span className="flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.06em] text-[#8A9BB8]">
            <IconoReloj />
            HORARIO DE INGRESO
          </span>
          <span className="block mt-1.5 font-mono text-sm font-bold text-[#123F7B]">
            {examen.strHoraInicio} - {examen.strHoraFin}
          </span>
        </div>

        {boolPasado && (
          <button
            type="button"
            onClick={() => fnAlDescargar?.(examen)}
            disabled={boolDescargando}
            className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[10px] bg-[#2563EB] text-white text-[13px] font-bold whitespace-nowrap transition-colors duration-200 hover:bg-[#123F7B] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            aria-label={`Descargar ${examen.strNombre}`}
          >
            <IconoDescarga />
            {boolDescargando ? "Descargando..." : "Descargar"}
          </button>
        )}
      </div>
    </article>
  );
}
