import React, { useEffect } from "react";
import { X } from "lucide-react";

/** Confirmación para cerrar o reabrir el ingreso de un aula (textos del mockup 10-C). */
export default function ModalCierreAula({ strAula, boolCerrar, intPresentes, boolGuardando, strError, onConfirmar, onCancelar }) {
    useEffect(() => {
        const alTeclear = (e) => {
            if (e.key === "Escape" && !boolGuardando) onCancelar();
        };
        document.addEventListener("keydown", alTeclear);
        return () => document.removeEventListener("keydown", alTeclear);
    }, [boolGuardando, onCancelar]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !boolGuardando) onCancelar();
            }}
        >
            <div role="dialog" aria-modal="true" aria-labelledby="titulo-cierre" className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <h3 id="titulo-cierre" className="text-base font-black text-[#003770]">
                        {boolCerrar ? `¿Cerrar el ingreso al ${strAula}?` : `¿Reabrir el ingreso al ${strAula}?`}
                    </h3>
                    <button type="button" onClick={onCancelar} disabled={boolGuardando} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer disabled:opacity-40">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-slate-600 font-semibold">
                    {boolCerrar
                        ? `No se podrán registrar ingresos nuevos en esta aula, ni normales ni excepcionales. Los ${intPresentes} estudiantes presentes no se ven afectados. Puedes reabrirla después.`
                        : "El aula volverá a aceptar ingresos normales y excepcionales."}
                </p>
                <p className="text-[11px] text-blue-900 font-bold bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                    Se registrará en auditoría como {boolCerrar ? "CIERRE_INGRESO_AULA" : "REAPERTURA_INGRESO_AULA"} con tu usuario, hora e IP.
                </p>
                {strError && <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">✕ {strError}</div>}
                <div className="flex gap-2">
                    <button type="button" onClick={onCancelar} disabled={boolGuardando} className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-2.5 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        type="button" onClick={onConfirmar} disabled={boolGuardando}
                        className={`flex-[1.5] disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${boolCerrar ? "bg-rose-600 hover:bg-rose-700" : "bg-[#1A365D] hover:bg-[#132743]"}`}
                    >
                        {boolGuardando && <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                        {boolGuardando ? "Guardando..." : boolCerrar ? "Cerrar ingreso" : "Reabrir ingreso"}
                    </button>
                </div>
            </div>
        </div>
    );
}