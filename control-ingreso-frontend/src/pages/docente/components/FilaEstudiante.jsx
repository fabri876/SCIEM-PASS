import BadgeEstado from './BadgeEstado';
import Icono from './Icono';

export default function FilaEstudiante({ est, numeroFila, onGestionar }) {
    const iniciales = `${est.nombreEstudiante?.[0] || ''}${est.apellidoEstudiante?.[0] || ''}`.toUpperCase();
    return (
        <tr className="hover:bg-[#F8FAFC] transition">
            <td className="py-4 px-3 sm:px-6 font-bold text-slate-500">{numeroFila}</td>
            <td className="py-4 px-3 sm:px-6">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-black text-xs flex-shrink-0">{iniciales || 'US'}</span>
                    <div>
                        <p className="font-extrabold text-[#1A365D]">{`${est.nombreEstudiante || ''} ${est.apellidoEstudiante || ''}`.trim()}</p>
                        <p className="text-[11px] text-slate-400 font-normal">{est.emailEstudiante}</p>
                    </div>
                </div>
            </td>
            <td className="py-4 px-3 sm:px-6 text-slate-600 font-medium">{est.ciEstudiante}</td>
            <td className="py-4 px-3 sm:px-6 text-slate-600 font-mono font-semibold">{est.codSisEstudiante}</td>
            <td className="py-4 px-3 sm:px-6"><BadgeEstado habilitado={est.estadoHabilitacion} /></td>
            <td className="py-4 px-3 sm:px-6 text-slate-600 max-w-xs truncate" title={est.nombreMotivo}>{est.nombreMotivo}</td>
            <td className="py-4 px-3 sm:px-6 text-right">
                <button onClick={() => onGestionar(est)} className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5">
                    <Icono nombre="lapiz" className="w-[15px] h-[15px]" /> Modificar estado
                </button>
            </td>
        </tr>
    );
}