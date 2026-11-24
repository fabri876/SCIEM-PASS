import { textoInterfaz } from '../../../utils/textoInterfaz.js';
// "Tu próximo examen": el examen más cercano destacado arriba (el QR se ve en "Ver detalle")
import { useEffect, useState } from "react";
import { Clock, MapPin, ChevronRight, QrCode } from "lucide-react";
import { obtenerQrExamen } from "../../../services/credencialService";
import { fechaCorta, fechaHora, cuentaRegresiva } from "./formato";

export default function ProximoExamen({ examen, onVerDetalle }) {
  const [objQr, setObjQr] = useState(null);

  useEffect(() => {
    let boolVigente = true;
    setObjQr(null);
    obtenerQrExamen(examen.id).then((d) => boolVigente && setObjQr(d)).catch(() => { });
    return () => { boolVigente = false; };
  }, [examen.id]);

  const boolDisponible = objQr?.estado === "DISPONIBLE";
  const strFalta = cuentaRegresiva(examen.fecha, examen.horaInicio, examen.horaFin);

  return (
    <section aria-labelledby="cq-t-proximo" className="rounded-xl overflow-hidden bg-[#003770] text-white shadow-[0_6px_20px_-8px_rgba(0,55,112,.55)]">
      <div className="flex flex-wrap items-center justify-between gap-5 p-6 max-md:p-4">
        <div className="flex flex-col gap-2.5 min-w-0 flex-1 basis-[420px] max-md:basis-full">
          <div className="flex flex-wrap items-center gap-2">
            <span id="cq-t-proximo" className="text-xs font-semibold tracking-[.5px] text-[#B6D3EE]">Tu próximo examen</span>
            {strFalta && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-semibold">
                <i className="w-[7px] h-[7px] rounded-full bg-[#83B7E2] animate-pulse" /> {strFalta}
              </span>
            )}
          </div>
          <h2 className="m-0 text-[22px] max-md:text-xl font-bold leading-snug">{textoInterfaz(examen.tipo)} · {textoInterfaz(examen.materia)}</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[#D9E8F7]">
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {fechaCorta(examen.fecha)} · {examen.horaInicio}{examen.horaFin ? ` – ${examen.horaFin}` : ""}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Aula {examen.aula}{examen.edificio ? ` · ${examen.edificio}` : ""}</span>
          </div>
          <p className="m-0 text-[13px] text-[#B6D3EE]">
            <QrCode className="inline-block w-4 h-4 mr-1.5 -mt-0.5 align-middle" />
            {boolDisponible
              ? <>Tu QR ya está disponible · válido hasta <b className="font-semibold text-white">{fechaHora(objQr.validoHasta)}</b></>
              : objQr?.estado === "PENDIENTE"
                ? <>Tu QR se habilita el <b className="font-semibold text-white">{fechaHora(objQr.validoDesde)}</b></>
                : "Consultando tu credencial…"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onVerDetalle(examen.id)}
          className="min-h-[46px] px-6 rounded-lg bg-white text-[#003770] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#F0F6FC] cursor-pointer max-md:w-full"
        >
          Ver detalle <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
