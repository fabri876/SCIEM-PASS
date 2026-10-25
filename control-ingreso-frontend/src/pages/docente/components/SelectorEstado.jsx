// Habilitado / Inhabilitado en "Modificar estado", con los colores de las etiquetas de la tabla
export default function SelectorEstado({ habilitado, onHabilitar, onInhabilitar }) {
    const base = "h-11 rounded-[10px] border flex items-center justify-center gap-2 text-[13.5px] font-extrabold transition cursor-pointer";
    const apagado = "border-[#CBD5E1] bg-white text-[#475569] hover:bg-slate-50";
    return (
        <div className="grid grid-cols-2 gap-2.5">
            <button
                type="button"
                onClick={onHabilitar}
                aria-pressed={habilitado}
                className={`${base} ${habilitado ? 'border-[1.5px] border-[#003770] bg-[#E8F1FB] text-[#003770]' : apagado}`}
            >
                <span className={`w-2 h-2 rounded-full ${habilitado ? 'bg-[#003770]' : 'bg-[#CBD5E1]'}`}></span> Habilitado
            </button>
            <button
                type="button"
                onClick={onInhabilitar}
                aria-pressed={!habilitado}
                className={`${base} ${!habilitado ? 'border-[1.5px] border-[#B91C1C] bg-[#FEF2F2] text-[#B91C1C]' : apagado}`}
            >
                <span className={`w-2 h-2 rounded-full ${!habilitado ? 'bg-[#B91C1C]' : 'bg-[#CBD5E1]'}`}></span> Inhabilitado
            </button>
        </div>
    );
}
