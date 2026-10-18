// Credencial QR de un examen: el código grande + datos del examen y del estudiante
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Clock, Info, Ban, Download } from "lucide-react";
import { obtenerQrExamen, regenerarQrExamen } from "../../../services/credencialService";
import { fechaCorta, fechaHora, cuentaRegresiva } from "./formato";

function Dato({ strEtiqueta, children, boolMono = false }) {
  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-[.4px] text-[#64748B]">{strEtiqueta}</span>
      <strong className={"block mt-0.5 text-sm font-semibold text-[#08264A] " + (boolMono ? "font-mono" : "")}>{children}</strong>
    </div>
  );
}

// Lo que se ve en lugar del QR cuando no está disponible
function SinQr({ objQr, boolInhabilitado }) {
  if (boolInhabilitado) {
    return (
      <div className="w-[240px] h-[240px] max-md:w-[210px] max-md:h-[210px] rounded-xl border-2 border-dashed border-[#FEE2E2] bg-[#FEF2F2] flex flex-col items-center justify-center text-center px-5 gap-2">
        <Ban className="w-8 h-8 text-[#B91C1C]" />
        <b className="text-sm font-bold text-[#B91C1C]">No estás habilitado</b>
        <span className="text-xs text-[#B91C1C]/90">Sin habilitación no se genera el QR de este examen.</span>
      </div>
    );
  }
  let strTitulo = "QR no disponible";
  let strTexto = objQr?.mensaje || "Consulta con tu docente.";
  if (objQr?.estado === "PENDIENTE") {
    strTitulo = "Tu QR todavía no está disponible";
    strTexto = `Se habilita el ${fechaHora(objQr.validoDesde)}.`;
  } else if (objQr?.estado === "VENCIDO") {
    strTitulo = "Este QR ya venció";
    strTexto = objQr.mensaje || "El examen ya pasó.";
  }
  return (
    <div className="w-[240px] h-[240px] max-md:w-[210px] max-md:h-[210px] rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F1F5F9] flex flex-col items-center justify-center text-center px-5 gap-2">
      <Clock className="w-8 h-8 text-[#9AA8BA]" />
      <b className="text-sm font-bold text-[#08264A]">{strTitulo}</b>
      <span className="text-xs text-[#64748B]">{strTexto}</span>
    </div>
  );
}

// Descarga la credencial como imagen PNG: QR + datos del examen y del estudiante
// (sirve para mostrarla en la puerta aunque no haya internet)
async function descargarCredencial(svgQr, examen, usuario, objQr) {
  const strSvg = new XMLSerializer().serializeToString(svgQr);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(strSvg);
  await img.decode();

  const W = 640, H = 900;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#003770"; ctx.fillRect(0, 0, W, 110);
  ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center";
  ctx.font = "bold 26px sans-serif"; ctx.fillText("SCIEM-PASS · Credencial de ingreso", W / 2, 50);
  ctx.font = "18px sans-serif"; ctx.fillText(`${examen.tipo} · ${examen.materia}`, W / 2, 85);
  ctx.drawImage(img, (W - 420) / 2, 140, 420, 420);
  const strNombre = `${usuario?.nombre || ""} ${usuario?.apellido || ""}`.trim();
  ctx.fillStyle = "#08264A"; ctx.font = "bold 26px sans-serif"; ctx.fillText(strNombre, W / 2, 615);
  ctx.fillStyle = "#475569"; ctx.font = "20px monospace";
  ctx.fillText(`C.I. ${usuario?.ci || "—"} · SIS ${usuario?.codigoSis || "—"}`, W / 2, 650);
  ctx.fillStyle = "#08264A"; ctx.font = "22px sans-serif";
  // Fecha completa (no "Hoy"/"Mañana": la imagen se guarda y se ve después)
  ctx.fillText(`${fechaHora(`${examen.fecha}T00:00:00`).split(",")[0]} · ${examen.horaInicio}${examen.horaFin ? " – " + examen.horaFin : ""} · Aula ${examen.aula}`, W / 2, 705);
  ctx.fillStyle = "#64748B"; ctx.font = "18px sans-serif";
  ctx.fillText(`Válido hasta ${fechaHora(objQr.validoHasta)}`, W / 2, 745);
  ctx.fillText("Personal e intransferible · solo para este examen", W / 2, 840);

  const blob = await new Promise((resolve) => cv.toBlob(resolve, "image/png"));
  const strUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = strUrl;
  a.download = `QR-${examen.materia}-${examen.fecha}.png`.replace(/\s+/g, "_");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(strUrl), 1000);
}

export default function VistaCredencialQr({ examen, usuario, onVolver }) {
  const refQr = useRef(null);
  const [objQr, setObjQr] = useState(null);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [boolRegenerando, setBoolRegenerando] = useState(false);

  useEffect(() => {
    let boolVigente = true;
    setBoolCargando(true);
    setStrError("");
    obtenerQrExamen(examen.id)
      .then((d) => { if (boolVigente) setObjQr(d); })
      .catch((e) => { if (boolVigente) setStrError(e.message); })
      .finally(() => { if (boolVigente) setBoolCargando(false); });
    return () => { boolVigente = false; };
  }, [examen.id]);

  const fnRegenerarQr = async () => {
    setBoolRegenerando(true);
    setStrError("");
    try {
      const nuevo = await regenerarQrExamen(examen.id);
      setObjQr(nuevo);
    } catch (e) {
      setStrError(e.message || "No se pudo regenerar el QR.");
    } finally {
      setBoolRegenerando(false);
    }
  };

  const boolDisponible = objQr?.estado === "DISPONIBLE";
  const boolInhabilitado = examen.habilitado === false;
  const strFalta = cuentaRegresiva(examen.fecha, examen.horaInicio, examen.horaFin);
  let strColorBanda = "bg-[#475569]";
  if (boolDisponible) strColorBanda = "bg-[#003770]";
  else if (boolInhabilitado) strColorBanda = "bg-[#B91C1C]";
  const strNombre = `${usuario?.nombre || ""} ${usuario?.apellido || ""}`.trim();

  return (
    <div className="flex flex-col gap-3 text-[#08264A]">
      <button
        type="button"
        onClick={onVolver}
        className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1860A3] hover:underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Mis exámenes
      </button>

      <section aria-label="Credencial QR" className="bg-white border border-[#CBD5E1] rounded-xl overflow-hidden">
        {/* Banda superior */}
        <div className={"flex flex-wrap items-center justify-between gap-2 px-[22px] py-3.5 text-white max-md:px-4 " + strColorBanda}>
          <div>
            <b className="block text-[15px] font-bold tracking-[.3px]">CREDENCIAL DE INGRESO</b>
            <span className="text-xs font-semibold tracking-[.5px] opacity-90">{examen.tipo.toUpperCase()} · {examen.materia.toUpperCase()}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold">
            <i className={"w-[7px] h-[7px] rounded-full " + (boolDisponible ? "bg-[#83B7E2]" : "bg-[#CBD5E1]")} />
            {boolDisponible ? "Válido" : boolInhabilitado ? "No habilitado" : objQr?.estado === "PENDIENTE" ? "Aún no disponible" : "No disponible"}
          </span>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-8 p-[22px] max-md:grid-cols-1 max-md:gap-5 max-md:p-4">
          {/* QR */}
          <div className="flex flex-col items-center gap-3">
            {boolCargando ? (
              <div className="w-[240px] h-[240px] max-md:w-[210px] max-md:h-[210px] rounded-xl bg-[#F1F5F9] animate-pulse" />
            ) : strError ? (
              <div className="w-[240px] h-[240px] rounded-xl bg-[#FEF2F2] text-[#B91C1C] text-sm flex items-center justify-center text-center px-5">{strError}</div>
            ) : boolDisponible ? (
              <div ref={refQr} className="p-3 rounded-xl border border-[#CBD5E1] bg-white">
                <QRCodeSVG value={objQr.contenidoQr} size={216} level="M" fgColor="#08264A" bgColor="#FFFFFF" />
              </div>
            ) : (
              <SinQr objQr={objQr} boolInhabilitado={boolInhabilitado} />
            )}
            {boolDisponible && (
              <>
                <div className="w-full max-w-[240px] rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-center">
                  <span className="block text-[10px] font-semibold uppercase tracking-[.4px] text-[#64748B]">Código de credencial</span>
                  <strong className="block mt-1 break-all font-mono text-xs text-[#08264A]">{objQr.contenidoQr}</strong>
                </div>
                <span className="text-xs text-[#64748B] text-center">
                  Válido hasta <b className="font-semibold text-[#08264A]">{fechaHora(objQr.validoHasta)}</b>
                </span>
                <button
                  type="button"
                  onClick={() => refQr.current?.querySelector("svg") && descargarCredencial(refQr.current.querySelector("svg"), examen, usuario, objQr)}
                  className="w-full min-h-[42px] px-4 rounded-lg border border-[#CBD5E1] bg-white text-[#003770] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:border-[#003770] cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Descargar QR
                </button>
                <button
                  type="button"
                  onClick={fnRegenerarQr}
                  disabled={boolRegenerando}
                  className="w-full min-h-[42px] px-4 rounded-lg border border-[#CBD5E1] bg-white text-[#003770] text-sm font-semibold hover:border-[#003770] disabled:opacity-60 cursor-pointer"
                >
                  {boolRegenerando ? "Regenerando..." : "Volver a generar QR"}
                </button>
              </>
            )}
          </div>

          {/* Datos */}
          <div className="flex flex-col gap-5 min-w-0">
            {boolInhabilitado && (
              <div className="flex items-start gap-2.5 px-3.5 py-[11px] rounded-lg text-sm bg-[#FEF2F2] text-[#B91C1C]">
                <Ban className="w-[18px] h-[18px] shrink-0 mt-px" />
                <div>
                  <b className="font-semibold">Motivo:</b> {examen.motivo || objQr?.mensaje || "sin detalle."}
                  <div className="mt-1 text-[13px] text-[#B91C1C]/90">Si crees que es un error, consulta con tu docente antes del examen.</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 max-md:grid-cols-2 gap-x-[18px] gap-y-3">
              <Dato strEtiqueta="Fecha">{fechaCorta(examen.fecha)}{strFalta && !boolInhabilitado ? <span className="ml-1.5 font-medium text-[#1860A3]">· {strFalta}</span> : null}</Dato>
              <Dato strEtiqueta="Hora">{examen.horaInicio}{examen.horaFin ? ` – ${examen.horaFin}` : ""}</Dato>
              <Dato strEtiqueta="Aula">Aula {examen.aula}</Dato>
            </div>

            <div className="pt-4 border-t border-[#F1F5F9] grid grid-cols-3 max-md:grid-cols-2 gap-x-[18px] gap-y-3">
              <div className="col-span-3 max-md:col-span-2">
                <Dato strEtiqueta="Estudiante">{strNombre || "—"}</Dato>
              </div>
              <Dato strEtiqueta="C.I." boolMono>{usuario?.ci || "—"}</Dato>
              <Dato strEtiqueta="Código SIS" boolMono>{usuario?.codigoSis || "—"}</Dato>
            </div>
          </div>
        </div>

        {!boolCargando && !boolDisponible && objQr?.estado === "PENDIENTE" && (
          <div className="mx-[22px] mb-5 flex items-start gap-2.5 px-3.5 py-[11px] rounded-lg text-sm bg-[#F0F6FC] text-[#124B83] max-md:mx-4">
            <Info className="w-[18px] h-[18px] shrink-0 mt-px" />
            Vuelve a esta pantalla desde el {fechaHora(objQr.validoDesde)}: tu QR aparecerá aquí automáticamente.
          </div>
        )}
      </section>
    </div>
  );
}
