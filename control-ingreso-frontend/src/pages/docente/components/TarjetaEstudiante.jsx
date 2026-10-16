import BadgeEstado from './BadgeEstado';
import Icono from './Icono';

export default function TarjetaEstudiante({ est, numeroFila, onGestionar, onEliminar }) {
    const iniciales = `${est.nombreEstudiante?.[0] || ''}${est.apellidoEstudiante?.[0] || ''}`.toUpperCase();
    return (
        <div className="p-4 border-b border-slate-100 last:border-0">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-blue-100 text-[#003770] flex items-center justify-center font-black text-[13px] flex-shrink-0">{iniciales || 'US'}</span>
                    <div className="min-w-0">
                        <p className="font-extrabold text-[#003770] text-[13px] truncate">{`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}</p>
                        <p className="text-[13px] text-slate-400 font-normal truncate">{est.emailEstudiante}</p>
                    </div>
                </div>
                <span className="text-[13px] font-bold text-slate-400 flex-shrink-0 mt-1">#{numeroFila}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[13px] mb-3">
                <div className="min-w-0">
                    <span className="block text-slate-400 font-bold uppercase text-[13px] tracking-wider">CI</span>
                    <span className="text-slate-600 font-medium">{est.ciEstudiante}</span>
                </div>
                <div className="min-w-0">
                    <span className="block text-slate-400 font-bold uppercase text-[13px] tracking-wider">Código SIS</span>
                    <span className="text-slate-600 font-mono font-semibold">{est.codSisEstudiante}</span>
                </div>
            </div>
            <div className="mb-3">
                <BadgeEstado habilitado={est.estadoHabilitacion} />
            </div>
            {!est.estadoHabilitacion && (
                <p className="text-[13px] text-slate-500 mb-3 leading-relaxed">
                    <span className="font-bold text-slate-400 uppercase text-[13px] tracking-wider block">Motivo</span>
                    {(!est.nombreMotivo || est.nombreMotivo === '-' || est.nombreMotivo === '')
                        ? 'Sin motivo especificado'
                        : est.nombreMotivo}
                </p>
            )}
            <button onClick={() => onGestionar(est)} className="w-full bg-[#003770] hover:bg-blue-700 text-white font-bold text-[13px] py-2.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5">
                <Icono nombre="lapiz" className="w-[15px] h-[15px]" /> Modificar estado
            </button>
            <button onClick={() => onEliminar(est)} className="w-full mt-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[13px] py-2.5 rounded-xl transition cursor-pointer inline-flex items-center justify-center gap-1.5"><Icono nombre="basurero" className="w-[15px] h-[15px]" /> Eliminar asociación</button>
        </div>
    );
}
