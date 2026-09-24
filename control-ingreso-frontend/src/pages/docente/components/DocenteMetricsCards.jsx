import Icono from './Icono';

export default function DocenteMetricsCards({ titulo, valor, detalle, claseNumero, claseIcono, icono }) {
    return (
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div>
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">{titulo}</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${claseNumero}`}>{valor}</span>
                    {detalle}
                </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${claseIcono}`}>
                <Icono nombre={icono} />
            </div>
        </div>
    );
}