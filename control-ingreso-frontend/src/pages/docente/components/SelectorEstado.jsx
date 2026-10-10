export default function SelectorEstado({ habilitado, onHabilitar, onInhabilitar }) {
    const base = "p-2.5 rounded-xl border flex items-center justify-center gap-2 text-[13px] transition cursor-pointer";
    return (
        <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onHabilitar} className={`${base} ${habilitado ? 'border-[#003770] bg-blue-50 text-[#003770] font-extrabold shadow-xs ring-1 ring-[#003770]' : 'border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50'}`}>
                <span className={`w-2 h-2 rounded-full ${habilitado ? 'bg-[#003770]' : 'bg-slate-300'}`}></span> Habilitado
            </button>
            <button type="button" onClick={onInhabilitar} className={`${base} ${!habilitado ? 'border-rose-600 bg-rose-50 text-rose-600 font-extrabold shadow-xs ring-1 ring-rose-600' : 'border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50'}`}>
                <span className={`w-2 h-2 rounded-full ${!habilitado ? 'bg-rose-600' : 'bg-slate-300'}`}></span> Inhabilitado
            </button>
        </div>
    );
}