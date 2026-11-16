// Ventana para cancelar un examen (la usan el docente y el administrador).
// Solo pide el motivo (obligatorio, hasta 200 letras). Se cierra con la ✕.
// El botón "Confirmar" queda apagado hasta que se escriba el motivo.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import VentanaEmergente from "../common/VentanaEmergente";
import { cancelarExamen } from "../../services/examenService";

export const MAX_MOTIVO_CANCELACION = 200;

/**
 * @param {object}      props
 * @param {object|null} props.examen      examen a cancelar (null = ventana cerrada)
 * @param {Function}    props.onCerrar
 * @param {Function}    props.onCancelado se llama con el examen actualizado
 */
export default function ModalCancelarExamen({ examen, onCerrar, onCancelado }) {
    const [strMotivo, setStrMotivo] = useState("");
    const [boolEnviando, setBoolEnviando] = useState(false);
    const [strError, setStrError] = useState("");

    useEffect(() => {
        setStrMotivo("");
        setStrError("");
        setBoolEnviando(false);
    }, [examen?.idExamen]);

    const strLimpio = strMotivo.trim();
    const boolPuedeEnviar = strLimpio.length > 0 && !boolEnviando;

    function cerrar() {
        if (!boolEnviando) onCerrar();
    }

    async function confirmar() {
        if (!boolPuedeEnviar) return;
        setBoolEnviando(true);
        setStrError("");
        try {
            const actualizado = await cancelarExamen(examen.idExamen, strLimpio);
            onCancelado?.(actualizado);
        } catch (err) {
            setStrError(err.message || "No se pudo cancelar el examen.");
            setBoolEnviando(false);
        }
    }

    return (
        <VentanaEmergente boolAbierto={!!examen} onCerrar={cerrar} strMaxWidth="max-w-md">
            {examen && (
                <div className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <label htmlFor="motivo-cancelacion" className="text-base font-black text-[#0F2340]">
                            Motivo
                        </label>
                        <button type="button" onClick={cerrar} aria-label="Cerrar" className="text-slate-400 hover:text-[#003770] cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <textarea
                        id="motivo-cancelacion"
                        value={strMotivo}
                        onChange={(e) => setStrMotivo(e.target.value.slice(0, MAX_MOTIVO_CANCELACION))}
                        maxLength={MAX_MOTIVO_CANCELACION}
                        rows={4}
                        placeholder="Escribe por qué se cancela el examen"
                        disabled={boolEnviando}
                        autoFocus
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[13px] text-[#0F2340] resize-none focus:outline-none focus:border-[#003770] focus:ring-[3px] focus:ring-[#E6EEF8]"
                    />
                    <p className="text-right text-[10.5px] text-slate-400 mt-1">
                        {strMotivo.length} / {MAX_MOTIVO_CANCELACION}
                    </p>

                    {strError && (
                        <p role="alert" className="mt-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-semibold px-3 py-2">
                            {strError}
                        </p>
                    )}

                    <div className="flex justify-end mt-3">
                        <button
                            type="button"
                            onClick={confirmar}
                            disabled={!boolPuedeEnviar}
                            className="h-10 px-5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {boolEnviando ? "Confirmando…" : "Confirmar"}
                        </button>
                    </div>
                </div>
            )}
        </VentanaEmergente>
    );
}
