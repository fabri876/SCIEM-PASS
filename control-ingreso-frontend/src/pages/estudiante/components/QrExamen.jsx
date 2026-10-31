// Estado del QR de un examen (etiqueta) y su botón, usados en "Mis exámenes de hoy" y en "Mis exámenes".
// - Disponible: "QR disponible" + "Ver mi QR".
// - Aún no: "QR disponible desde …" + "Ver mi QR" bloqueado.
// - No habilitado: "No habilitado" + "Ver motivo".
import { QrCode } from "lucide-react";
import { estadoQrPorFecha } from "../../../services/credencialService";
import { fechaHora } from "../../credencial/componentes/formato";

export function estadoQr(examen) {
    // Desde 24 h antes del inicio hasta la hora de fin del examen
    return estadoQrPorFecha(examen.fecha, examen.horaInicio, examen.habilitado !== false, examen.horaFin);
}

export function EtiquetaQr({ objEstado }) {
    if (objEstado.estado === "INHABILITADO") {
        return <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#B91C1C]">No habilitado</span>;
    }
    if (objEstado.estado === "DISPONIBLE") {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D9E8F7] text-[#124B83]">
                <QrCode className="w-3.5 h-3.5" /> QR disponible
            </span>
        );
    }
    if (objEstado.estado === "PENDIENTE") {
        return (
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#475569]">
                QR disponible desde {fechaHora(objEstado.desde)}
            </span>
        );
    }
    return null;
}

export function BotonQr({ examen, objEstado, boolPrincipal = false, onVerQr }) {
    const strBase = "inline-flex items-center justify-center gap-2 font-bold text-xs h-9 px-4 rounded-xl transition whitespace-nowrap max-md:w-full ";

    if (objEstado.estado === "INHABILITADO") {
        return (
            <button type="button" onClick={() => onVerQr(examen.id)} className={strBase + "bg-white border border-[#CBD5E1] text-[#003770] hover:border-[#003770] cursor-pointer"}>
                Ver motivo
            </button>
        );
    }
    if (objEstado.estado === "PENDIENTE") {
        return (
            <button
                type="button"
                disabled
                title={`Tu QR se habilita el ${fechaHora(objEstado.desde)}`}
                className={strBase + "bg-[#F1F5F9] border border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"}
            >
                <QrCode className="w-4 h-4" /> Ver mi QR
            </button>
        );
    }
    if (objEstado.estado === "DISPONIBLE") {
        return (
            <button
                type="button"
                onClick={() => onVerQr(examen.id)}
                className={strBase + "cursor-pointer " + (boolPrincipal
                    ? "bg-[#003770] hover:bg-[#124B83] text-white shadow-xs"
                    : "bg-white border border-[#CBD5E1] text-[#003770] hover:border-[#003770]")}
            >
                <QrCode className="w-4 h-4" /> Ver mi QR
            </button>
        );
    }
    return null;
}