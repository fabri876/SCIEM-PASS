export default function BadgeEstado({ habilitado }) {
    return habilitado ? (
        <span className="inline-flex items-center gap-1.5 bg-[#EFF6FF] text-[#003770] border border-[#BFDBFE] font-bold px-3 py-1 rounded-full text-[13px]"><span className="w-1.5 h-1.5 rounded-full bg-[#003770]"></span> Habilitado</span>
    ) : (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-rose-600 border border-red-200 font-bold px-3 py-1 rounded-full text-[13px]"><span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Inhabilitado</span>
    );
}