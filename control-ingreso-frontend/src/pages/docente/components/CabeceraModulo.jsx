import Icono from './Icono';

/**
 * Cabecera reutilizable de los modulos del docente.
 *
 * `onVolver` es opcional: si no se pasa, el boton de volver no se renderiza
 * (mismo criterio que "Volver a Materias" en la vista del admin). `textoVolver`
 * permite que cada pantalla rotule el boton segun adonde regrese.
 */
export default function CabeceraModulo({ onExportar, onVolver, textoVolver = 'Volver' }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-xs border border-slate-200">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100 flex-shrink-0">
                    <Icono nombre="graduacion" className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-base sm:text-xl font-black text-[#1A365D] leading-snug">Gestión de habilitación de estudiantes</h1>
                    <p className="text-xs text-slate-500 font-medium">Administra la habilitación de los estudiantes para el examen seleccionado.</p>
                </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {onVolver && (
                    <button
                        type="button"
                        onClick={onVolver}
                        className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-3.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5 justify-center"
                    >
                        <span>&larr;</span>
                        <span>{textoVolver}</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={onExportar}
                    className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-2 justify-center"
                >
                    <Icono nombre="exportar" className="w-4 h-4" /> Exportar lista oficial
                </button>
            </div>
        </div>
    );
}