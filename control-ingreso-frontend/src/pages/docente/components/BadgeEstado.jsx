// Etiqueta del estado de habilitación, con los mismos colores que las etiquetas de los otros paneles
export default function BadgeEstado({ habilitado }) {
    return habilitado ? (
        <span className="inline-flex items-center gap-1.5 bg-[#E8F1FB] text-[#003770] font-extrabold px-3 py-1 rounded-full text-[12.5px] whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-[#003770]"></span> Habilitado
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 bg-[#FEF2F2] text-[#B91C1C] font-extrabold px-3 py-1 rounded-full text-[12.5px] whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-[#B91C1C]"></span> Inhabilitado
        </span>
    );
}
