import { textoInterfaz } from '../../../utils/textoInterfaz.js';
/**
 * ExamenesEstados.jsx
 *
 * Los tres estados "no feliz" que comparten las pantallas de exámenes
 * próximos y pasados: cargando (skeleton), error con reintento y lista vacía.
 */

export function ExamenesSkeleton({ intCantidad = 3 }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando exámenes">
      {Array.from({ length: intCantidad }).map((_, intIndice) => (
        <div
          key={intIndice}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white border border-[#E2E8F0] rounded-2xl p-4 md:px-[22px] md:py-5 animate-pulse motion-reduce:animate-none"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-16 rounded-xl bg-[#EEF3FF]" />
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="h-3 w-32 rounded bg-[#EEF1F8]" />
              <div className="h-4 w-52 rounded bg-[#E3E9F5]" />
              <div className="h-3 w-64 max-w-full rounded bg-[#EEF1F8]" />
            </div>
          </div>
          <div className="h-[62px] md:w-[170px] rounded-xl bg-[#F3F6FD]" />
        </div>
      ))}
    </div>
  );
}

export function ExamenesError({ strMensaje, fnReintentar }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center text-center bg-white border border-[#F5C6CF] rounded-2xl px-6 py-10"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FDEEF1]">
        <svg className="w-6 h-6 stroke-[#D93856] fill-none stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5M12 16h.01" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-extrabold text-[#123F7B]">No pudimos cargar los exámenes</h3>
      <p className="mt-1 text-sm text-[#64748B] max-w-sm">{textoInterfaz(strMensaje)}</p>
      <button
        type="button"
        onClick={fnReintentar}
        className="mt-5 inline-flex items-center h-10 px-5 rounded-[10px] bg-[#2563EB] text-white text-sm font-bold transition-colors duration-200 hover:bg-[#123F7B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}

export function ExamenesVacio({ strTitulo, strDescripcion }) {
  return (
    <div className="flex flex-col items-center text-center bg-white border border-dashed border-[#CBD5E1] rounded-2xl px-6 py-12">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#EEF3FF]">
        <svg className="w-7 h-7 stroke-[#2563EB] fill-none stroke-[1.8]" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-extrabold text-[#123F7B]">{textoInterfaz(strTitulo)}</h3>
      <p className="mt-1 text-sm text-[#64748B] max-w-sm">{strDescripcion}</p>
    </div>
  );
}
