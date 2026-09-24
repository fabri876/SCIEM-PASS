export default function Paginacion({ paginaActual, totalPaginas, onPagina }) {
    const clsBtn = "px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#1A365D] disabled:opacity-40 cursor-pointer transition hover:bg-slate-50";
    return (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8FAFC]">
            <span className="text-xs text-slate-500 font-semibold">Mostrando página <span className="font-bold text-[#1A365D]">{paginaActual}</span> de <span className="font-bold text-[#1A365D]">{totalPaginas}</span></span>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
                <button onClick={() => onPagina(paginaActual - 1)} disabled={paginaActual === 1} className={`${clsBtn} flex-1 sm:flex-none`}>Anterior</button>
                <button onClick={() => onPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} className={`${clsBtn} flex-1 sm:flex-none`}>Siguiente</button>
            </div>
        </div>
    );
}