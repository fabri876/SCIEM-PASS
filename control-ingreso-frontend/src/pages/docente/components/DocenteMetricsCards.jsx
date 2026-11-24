import { textoInterfaz } from '../../../utils/textoInterfaz.js';
// Tarjeta de una cifra (Total, Habilitados, Inhabilitados).
// La palabra va al lado del número; el porcentaje va aparte, en una etiqueta a la derecha.
export default function DocenteMetricsCards({ titulo, valor, detalle, porcentaje, claseNumero = 'text-[#003770]', clasePorcentaje = 'bg-[#F1F5F9] text-[#475569]' }) {
    return (
        <div className="bg-white px-5 py-4 rounded-2xl shadow-xs border border-[#CBD5E1] flex items-end justify-between gap-3">
            <div>
                <span className="text-[11px] font-extrabold tracking-[.6px] text-[#64748B] block">{titulo}</span>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-[28px] leading-none font-black ${claseNumero}`}>{textoInterfaz(valor)}</span>
                    {detalle && <span className="text-[13px] font-bold text-[#64748B]">{detalle}</span>}
                </div>
            </div>
            {porcentaje && (
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[12px] font-extrabold ${clasePorcentaje}`}>{porcentaje}</span>
            )}
        </div>
    );
}
