import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React from "react";
import { NIVEL_REQUERIDO } from "../../utils/passwordStrength";

const CLASES_BARRA = {
    rojo: "bg-rose-500",
    amarillo: "bg-amber-400",
    verde: "bg-emerald-500",
};

const CLASES_TEXTO = {
    rojo: "text-rose-600",
    amarillo: "text-amber-600",
    verde: "text-emerald-600",
};

/**
 * Medidor visual de seguridad de contraseña: barra de 8 segmentos
 * (rojo / amarillo / verde) + checklist de requisitos.
 */
export default function IndicadorSeguridadContrasena({ objEvaluacion }) {
    const { intNivel, arrCriterios, strColor, strEtiqueta } = objEvaluacion;

    return (
        <div className="mt-2" aria-live="polite">
            <div className="flex items-center gap-1" role="img" aria-label={`Nivel de seguridad ${intNivel} de ${NIVEL_REQUERIDO}`}>
                {Array.from({ length: NIVEL_REQUERIDO }, (_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${i < intNivel ? CLASES_BARRA[strColor] : "bg-slate-200"
                            }`}
                    />
                ))}
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold">
                <span className={intNivel > 0 ? CLASES_TEXTO[strColor] : "text-slate-400"}>
                    {textoInterfaz(strEtiqueta || "Escribe tu nueva contraseña")}
                </span>
                <span className="text-slate-400">Nivel {intNivel}/{NIVEL_REQUERIDO}</span>
            </div>

            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                {arrCriterios.map((objCriterio) => (
                    <li
                        key={objCriterio.strClave}
                        className={`flex items-center gap-1.5 text-[11px] font-medium ${objCriterio.boolCumple ? "text-emerald-600" : "text-slate-400"
                            }`}
                    >
                        <span aria-hidden="true">{objCriterio.boolCumple ? "✓" : "○"}</span>
                        <span>{textoInterfaz(objCriterio.strTexto)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}