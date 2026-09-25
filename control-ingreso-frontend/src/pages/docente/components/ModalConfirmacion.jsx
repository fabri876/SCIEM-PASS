import Icono from './Icono';

export default function ModalConfirmacion({ mostrar, estudiante, motivoTexto, guardando, onCancelar, onConfirmar }) {
    if (!mostrar || !estudiante) return null;
    const nombre = `${estudiante.nombreEstudiante} ${estudiante.apellidoEstudiante}`;
    const habilitado = estudiante.estadoHabilitacion;
    const mensaje = habilitado
        ? `${nombre} quedará habilitado para rendir el examen y se generará el respectivo pase de ingreso.`
        : motivoTexto
            ? `${nombre} figurará como Inhabilitado con el motivo "${motivoTexto}". Quedará registro en la auditoría oficial institucional.`
            : `${nombre} figurará como Inhabilitado. Quedará registro en la auditoría oficial institucional.`;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <Icono nombre="pregunta" className="w-[22px] h-[22px]" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-black text-base text-[#1A365D]">¿Está seguro de realizar los cambios?</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{mensaje}</p>
                    </div>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">ESTUDIANTE</span>
                        <span className="font-extrabold text-[#1A365D]">{nombre}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">NUEVO ESTADO</span>
                        <span className={`font-black ${habilitado ? 'text-emerald-600' : 'text-rose-600'}`}>{habilitado ? 'Habilitado' : 'Inhabilitado'}</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={onCancelar} disabled={guardando} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={onConfirmar} disabled={guardando} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                        <span>✔</span> {guardando ? 'Guardando...' : 'Sí, confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}