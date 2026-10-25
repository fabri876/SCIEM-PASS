import Icono from './Icono';

/**
 * Cabecera del módulo de habilitaciones del docente: título, descripción y "Exportar lista oficial".
 * El enlace para volver ("← Mis exámenes") va aparte, arriba a la izquierda, como en los otros paneles.
 */
export default function CabeceraModulo({ onExportar }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:px-6 sm:py-5 rounded-2xl shadow-xs border border-[#CBD5E1]">
            <div className="min-w-0">
                <h1 className="text-lg sm:text-[22px] font-black text-[#1A365D] leading-snug">Gestión de habilitación de estudiantes</h1>
                <p className="text-[13.5px] text-slate-500 font-medium mt-0.5">Administra la habilitación de los estudiantes para el examen seleccionado.</p>
            </div>
            <button
                type="button"
                onClick={onExportar}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-[#1A365D] border border-[#CBD5E1] font-bold text-[13px] h-10 px-4 rounded-[10px] transition shadow-xs cursor-pointer inline-flex items-center gap-2 justify-center"
            >
                <Icono nombre="exportar" className="w-4 h-4" /> Exportar lista oficial
            </button>
        </div>
    );
}
