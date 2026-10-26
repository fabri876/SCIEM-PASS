import BadgeEstado from './BadgeEstado';
import Icono from './Icono';

export default function FilaEstudiante({ est, numeroFila, onGestionar, onEliminar }) {
    const boolSinMotivo = !est.nombreMotivo || est.nombreMotivo === '-' || est.nombreMotivo === '';
    return (
        <tr className="hover:bg-[#F8FAFC] transition">
            <td className="py-3.5 px-3 sm:px-6 font-bold text-slate-500">{numeroFila}</td>
            <td className="py-3.5 px-3 sm:px-6">
                <p className="font-extrabold text-[#08264A]">{`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}</p>
                <p className="text-[12px] text-slate-400">{est.emailEstudiante}</p>
            </td>
            <td className="py-3.5 px-3 sm:px-6 text-slate-600 font-mono">{est.ciEstudiante}</td>
            <td className="py-3.5 px-3 sm:px-6 text-slate-600 font-mono">{est.codSisEstudiante}</td>
            <td className="py-3.5 px-3 sm:px-6"><BadgeEstado habilitado={est.estadoHabilitacion} /></td>
            <td className="py-3.5 px-3 sm:px-6 text-slate-600 max-w-xs truncate" title={est.nombreMotivo}>
                {est.estadoHabilitacion
                    ? <span className="text-slate-400">—</span>
                    : (boolSinMotivo ? 'Sin motivo especificado' : est.nombreMotivo)}
            </td>
            <td className="py-3.5 px-3 sm:px-6 text-right whitespace-nowrap">
                {onGestionar ? (
                    <button onClick={() => onGestionar(est)} className="bg-[#003770] hover:bg-[#124B83] text-white font-bold text-[12.5px] h-9 px-3.5 rounded-[10px] transition shadow-xs cursor-pointer">
                        Modificar estado
                    </button>
                ) : (
                    // Examen terminado: el mismo botón, en gris y desactivado
                    <button type="button" disabled title="El examen ya terminó" className="bg-[#E2E8F0] text-[#94A3B8] font-bold text-[12.5px] h-9 px-3.5 rounded-[10px] cursor-not-allowed">
                        Modificar estado
                    </button>
                )}
                {onEliminar && <button onClick={() => onEliminar(est)} title="Quitar de este examen" aria-label="Quitar de este examen" className="ml-2 align-middle bg-[#FEF2F2] hover:bg-red-100 text-[#B91C1C] h-9 w-9 rounded-[10px] transition cursor-pointer inline-flex items-center justify-center"><Icono nombre="basurero" className="w-[15px] h-[15px]" /></button>}
            </td>
        </tr>
    );
}
