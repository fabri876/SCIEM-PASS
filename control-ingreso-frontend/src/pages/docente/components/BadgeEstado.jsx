export default function BadgeEstado({ habilitado }) {
    return habilitado ? (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-3 py-1 rounded-full text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Habilitado</span>
    ) : (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-rose-600 border border-red-200 font-bold px-3 py-1 rounded-full text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Inhabilitado</span>
    );
}