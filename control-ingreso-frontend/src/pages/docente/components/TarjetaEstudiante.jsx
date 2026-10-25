import BadgeEstado from './BadgeEstado';
import Icono from './Icono';

// Versión en tarjeta (celular) de una fila de la tabla de habilitaciones
export default function TarjetaEstudiante({ est, numeroFila, onGestionar, onEliminar }) {
    const boolSinMotivo = !est.nombreMotivo || est.nombreMotivo === '-' || est.nombreMotivo === '';
    return (
        <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <p className="font-extrabold text-[#08264A] text-[14px] truncate">{`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}</p>
                    <p className="text-[12px] text-slate-400 truncate">{est.emailEstudiante}</p>
                </div>
                <span className="text-[12.5px] font-bold text-slate-400 flex-shrink-0 mt-0.5">#{numeroFila}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[13.5px] mb-3">
                <div className="min-w-0">
                    <span className="block text-[#64748B] font-extrabold uppercase text-[11px] tracking-[.6px]">C.I.</span>
                    <span className="text-slate-600 font-mono">{est.ciEstudiante}</span>
                </div>
                <div className="min-w-0">
                    <span className="block text-[#64748B] font-extrabold uppercase text-[11px] tracking-[.6px]">Código SIS</span>
                    <span className="text-slate-600 font-mono">{est.codSisEstudiante}</span>
                </div>
            </div>
            <div className="mb-3">
                <BadgeEstado habilitado={est.estadoHabilitacion} />
            </div>
            {!est.estadoHabilitacion && (
                <p className="text-[13.5px] text-slate-600 mb-3 leading-relaxed">
                    <span className="font-extrabold text-[#64748B] uppercase text-[11px] tracking-[.6px] block">Motivo</span>
                    {boolSinMotivo ? 'Sin motivo especificado' : est.nombreMotivo}
                </p>
            )}
            <div className="flex gap-2">
                <button onClick={() => onGestionar(est)} className="flex-1 h-10 bg-[#003770] hover:bg-[#124B83] text-white font-bold text-[13px] rounded-[10px] transition shadow-xs cursor-pointer">
                    Modificar estado
                </button>
                <button onClick={() => onEliminar(est)} title="Quitar de este examen" aria-label="Quitar de este examen" className="h-10 w-10 bg-[#FEF2F2] hover:bg-red-100 text-[#B91C1C] rounded-[10px] transition cursor-pointer inline-flex items-center justify-center"><Icono nombre="basurero" className="w-[15px] h-[15px]" /></button>
            </div>
        </div>
    );
}
