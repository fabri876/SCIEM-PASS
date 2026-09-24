export default function SeccionMotivo({ nombreMotivo, motivoSelectValue, motivoPersonalizado, motivos, onSelect, onPersonalizado, onCerrar, onModificar, onEliminar }) {
    const existeMotivo = nombreMotivo && nombreMotivo !== '-';
    return (
        <div className="mb-5 space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">MOTIVO DE INHABILITACIÓN</label>
                {existeMotivo && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">Opcional</span>
                        <button type="button" onClick={onModificar} className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer">Modificar</button>
                        <span className="text-slate-300 font-bold">|</span>
                        <button type="button" onClick={onEliminar} className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer">Eliminar</button>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Seleccionar causal o motivo institucional:</label>
                <select value={motivoSelectValue} onChange={(e) => onSelect(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-[#1A365D] focus:outline-none focus:border-[#2563EB]">
                    <option value="">Seleccionar motivo de inhabilitación...</option>
                    {motivos.map((mot, idx) => <option key={idx} value={mot}>{mot}</option>)}
                    <option value="__personalizado__">+ Registrar nuevo motivo personalizado...</option>
                </select>
            </div>

            {motivoSelectValue === '__personalizado__' && (
                <div className="bg-[#F8FAFC] border border-blue-200 p-3.5 rounded-2xl shadow-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5"><span>➕</span> Registrar nuevo motivo personalizado</span>
                        <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">✕</button>
                    </div>
                    <textarea rows="3" value={motivoPersonalizado} onChange={(e) => onPersonalizado(e.target.value)} placeholder="Escribir justificación o motivo institucional personalizado..." className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-[#1A365D] focus:outline-none focus:border-[#2563EB]" />
                </div>
            )}
        </div>
    );
}