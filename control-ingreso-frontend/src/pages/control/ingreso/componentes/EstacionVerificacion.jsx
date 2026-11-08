import { useRegisterBackHandler } from "../../../../hooks/useAndroidBackButton";
// Estación de verificación en dos fases:
// 1) Identificar por QR o manual (no registra).
// 2) Verificar el rostro del estudiante ya identificado y recién ahí registrar.
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { QrCode, Keyboard, ScanLine, ScanFace, Check } from "lucide-react";
import ControlFacialCamera from "../ControlFacialCamera";

const ID_LECTOR = "ci-lector-qr";

const CLASE_BOTON =
  "min-h-[46px] px-[22px] rounded-lg bg-[#003770] hover:bg-[#124B83] text-white text-sm font-semibold " +
  "inline-flex items-center justify-center gap-2 cursor-pointer " +
  "disabled:bg-[#CBD5E1] disabled:hover:bg-[#CBD5E1] disabled:cursor-not-allowed";

function BotonModo({ boolActivo, onClick, Icono, children }) {
  return (
    <button
      type="button"
      aria-pressed={boolActivo}
      onClick={onClick}
      className={
        "flex items-center gap-2 rounded-lg px-[18px] min-h-[42px] text-sm font-semibold cursor-pointer " +
        "max-md:justify-center max-md:px-2 " +
        (boolActivo ? "bg-[#003770] text-white" : "bg-transparent text-[#475569] hover:text-[#003770]")
      }
    >
      <Icono className="w-[18px] h-[18px]" />
      {children}
    </button>
  );
}

function Paso({ numero, texto, boolActivo, boolHecho }) {
  const clase = boolHecho
    ? "bg-[#166534] text-white border-[#166534]"
    : boolActivo
    ? "bg-[#003770] text-white border-[#003770]"
    : "bg-white text-[#94A3B8] border-[#CBD5E1]";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider">
      <span className={"w-5 h-5 rounded-full border flex items-center justify-center " + clase}>
        {boolHecho ? <Check className="w-3 h-3" /> : numero}
      </span>
      <span className={boolActivo || boolHecho ? "text-[#08264A]" : "text-[#94A3B8]"}>{texto}</span>
    </span>
  );
}

/* ---------------- Lector QR ---------------- */
function PanelQR({ onValidar, boolValidando }) {
  const [strEstado, setStrEstado] = useState("inactivo"); // inactivo | leyendo
  const [boolAcierto, setBoolAcierto] = useState(false);
  const [strAviso, setStrAviso] = useState("");
  const refLector = useRef(null);
  const refLeido = useRef(false);

  const fnDetener = async () => {
    const lector = refLector.current;
    refLector.current = null;
    if (lector) {
      try { if (lector.isScanning) await lector.stop(); lector.clear(); } catch { /* ya detenido */ }
    }
    setStrEstado("inactivo");
  };

  useRegisterBackHandler(strEstado === "leyendo", fnDetener);

  useEffect(() => () => { fnDetener(); }, []);

  const fnAlLeer = async (strTexto) => {
    if (refLeido.current) return;
    refLeido.current = true;
    await fnDetener();
    setBoolAcierto(true);
    setTimeout(() => setBoolAcierto(false), 500);
    onValidar(strTexto, "QR");
  };

  const fnLeer = async () => {
    setStrAviso("");
    refLeido.current = false;
    setStrEstado("leyendo");
    try {
      const lector = new Html5Qrcode(ID_LECTOR, { verbose: false });
      refLector.current = lector;
      await lector.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 150, height: 150 } },
        fnAlLeer,
        () => { }
      );
    } catch {
      await fnDetener();
      setStrAviso("No se pudo abrir la cámara. Revisa el permiso de la app en Ajustes > Apps > SCIEM-PASS > Permisos, o usa el ingreso manual.");
    }
  };

  const boolLeyendo = strEstado === "leyendo";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-7 max-md:flex-col max-md:items-stretch max-md:gap-4">
      <div
        aria-hidden="true"
        className={
          "ci-visor relative w-[210px] h-[210px] shrink-0 rounded-[14px] flex items-center justify-center overflow-hidden transition-colors " +
          "max-md:w-full max-md:h-[250px] " +
          (boolAcierto ? "bg-[#267BC2]" : "bg-[#08264A]") +
          (boolLeyendo ? " ci-leyendo" : "")
        }
      >
        <div id={ID_LECTOR} className="ci-camara" />
        <i className="ci-esq ci-tl" /><i className="ci-esq ci-tr" /><i className="ci-esq ci-bl" /><i className="ci-esq ci-br" />
        <span className="ci-linea" />
        {!boolLeyendo && <QrCode className="w-[60px] h-[60px] text-white/35" strokeWidth={1.4} />}
      </div>

      <div className="flex-1 basis-[300px] min-w-0 max-md:flex-none max-md:basis-auto max-md:text-center">
        <h3 className="m-0 text-[17px] font-bold text-[#08264A]">Escanear QR de la credencial</h3>
        <p className="mt-1.5 mb-4 text-sm leading-relaxed text-[#64748B]">
          Acerca la credencial del estudiante a la cámara para identificarlo.
        </p>
        {boolLeyendo ? (
          <button type="button" onClick={fnDetener} className={CLASE_BOTON + " max-md:w-full max-md:min-h-[52px]"}>
            Detener lectura
          </button>
        ) : (
          <button type="button" onClick={fnLeer} disabled={boolValidando} className={CLASE_BOTON + " max-md:w-full max-md:min-h-[52px]"}>
            {boolValidando ? "Identificando…" : "Leer QR"}
          </button>
        )}
        {strAviso && <p className="mt-2.5 text-[13px] text-[#B91C1C]">{strAviso}</p>}
      </div>
    </div>
  );
}

/* ---------------- Ingreso manual ---------------- */
function PanelManual({ onValidar, boolValidando }) {
  const [strValor, setStrValor] = useState("");
  const [strAvisoTecla, setStrAvisoTecla] = useState("");
  const refInput = useRef(null);

  useEffect(() => { refInput.current?.focus(); }, []);

  const numLargo = strValor.length;
  const boolValido = numLargo >= 6 && numLargo <= 9;

  let strAyuda = "Solo números · de 6 a 9 dígitos";
  let strColorAyuda = "text-[#64748B]";
  if (strAvisoTecla) { strAyuda = strAvisoTecla; strColorAyuda = "text-[#B91C1C]"; }
  else if (numLargo && boolValido) { strAyuda = `${numLargo} dígitos · formato válido`; strColorAyuda = "text-[#1860A3]"; }
  else if (numLargo) { strAyuda = `${numLargo} dígitos · mínimo 6`; strColorAyuda = "text-[#B91C1C]"; }

  const fnCambiar = (e) => {
    setStrAvisoTecla("");
    setStrValor(e.target.value.replace(/\D/g, "").slice(0, 9));
  };

  const fnTecla = (e) => {
    if (e.key.length === 1 && /\D/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setStrAvisoTecla("Ingresa solo números (sin letras ni símbolos)");
    }
  };

  const fnEnviar = async (e) => {
    e.preventDefault();
    if (!boolValido || boolValidando) return;
    await onValidar(strValor, "MANUAL");
    setStrValor("");
    refInput.current?.focus();
  };

  return (
    <form onSubmit={fnEnviar} autoComplete="off" className="mt-5">
      <label htmlFor="ci-documento" className="block mb-1.5 text-[13px] font-semibold text-[#475569]">
        C.I. o Código SIS del estudiante
      </label>
      <div className="flex flex-wrap gap-3 max-md:flex-col">
        <input
          id="ci-documento"
          ref={refInput}
          value={strValor}
          onChange={fnCambiar}
          onKeyDown={fnTecla}
          inputMode="numeric"
          // El límite visible no puede ser 9: el navegador cuenta espacios
          // antes de ejecutar onChange y truncaría códigos pegados como
          // "2023 012 45". onChange normaliza y limita a 9 dígitos.
          maxLength={32}
          placeholder="Ej. 8765432 o 202301245"
          aria-describedby="ci-ayuda"
          className={
            "flex-1 basis-[320px] min-w-0 h-[62px] px-5 rounded-[10px] border-[1.5px] border-[#CBD5E1] bg-white outline-none " +
            "font-mono text-[28px] tracking-[6px] text-[#003770] " +
            "placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-[#9AA8BA] " +
            "focus:border-[#1860A3] focus:shadow-[0_0_0_4px_#D9E8F7] " +
            "max-md:flex-none max-md:basis-auto max-md:h-[58px] max-md:px-4 max-md:text-[22px] max-md:tracking-[4px]"
          }
        />
        <button type="submit" disabled={!boolValido || boolValidando} className={CLASE_BOTON + " min-h-[62px] px-[30px] text-[15px] max-md:min-h-[52px] max-md:w-full"}>
          {boolValidando ? "Identificando…" : "Identificar estudiante"}
        </button>
      </div>
      <div id="ci-ayuda" className={"mt-2 text-[13px] " + strColorAyuda}>{strAyuda}</div>
    </form>
  );
}

/* ---------------- Estación ---------------- */
export default function EstacionVerificacion({
  onValidar,
  boolValidando,
  idExamen,
  idAsignatura,
  idAmbiente,
  objIdentificacion = null,
  boolSinRed = false,
  onVerificado,
  onSinEnrolamiento,
  onFalloFacial,
  onCancelarFacial,
}) {
  const [strModo, setStrModo] = useState("qr");
  const boolIdentificado = Boolean(objIdentificacion);

  return (
    <div className="bg-white border border-[#CBD5E1] border-t-4 border-t-[#003770] rounded-[14px] p-[22px] max-md:p-3.5 shadow-[0_2px_8px_rgba(8,38,74,.05)]">
      {/* Título dentro de la tarjeta + pasos a la derecha */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-[10px] bg-[#003770] text-white flex items-center justify-center shrink-0">
            {boolIdentificado ? <ScanFace className="w-5 h-5" /> : <ScanLine className="w-5 h-5" />}
          </span>
          <div>
            <h2 id="ci-t-verificacion" className="m-0 text-lg font-bold text-[#08264A]">Verificación de ingreso</h2>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              {boolIdentificado ? "Fase 2 de 2 · Rostro" : "Fase 1 de 2 · Identificar"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <Paso numero={1} texto="Identificar" boolActivo={!boolIdentificado} boolHecho={boolIdentificado} />
          <span className="w-5 h-px bg-[#CBD5E1]" aria-hidden="true" />
          <Paso numero={2} texto="Rostro" boolActivo={boolIdentificado} boolHecho={false} />
        </div>
      </div>

      {!boolIdentificado ? (
        <>
          <div role="group" aria-label="Método de identificación" className="mt-4 inline-flex gap-1 bg-[#F1F5F9] rounded-[10px] p-1 max-md:grid max-md:grid-cols-2 max-md:w-full">
            <BotonModo boolActivo={strModo === "qr"} onClick={() => setStrModo("qr")} Icono={QrCode}>Escanear QR</BotonModo>
            <BotonModo boolActivo={strModo === "manual"} onClick={() => setStrModo("manual")} Icono={Keyboard}>Ingreso manual</BotonModo>
          </div>

          {strModo === "qr" && (
            <PanelQR onValidar={onValidar} boolValidando={boolValidando} />
          )}
          {strModo === "manual" && (
            <PanelManual onValidar={onValidar} boolValidando={boolValidando} />
          )}
        </>
      ) : (
        <div className="mt-4">
          <ControlFacialCamera
            idExamen={idExamen}
            idAsignatura={idAsignatura}
            idAmbiente={idAmbiente}
            estudianteIdentificado={objIdentificacion.estudiante}
            boolSinRed={boolSinRed}
            onVerificado={onVerificado}
            onSinEnrolamiento={onSinEnrolamiento}
            onFalloFacial={onFalloFacial}
            onCancelar={onCancelarFacial}
          />
        </div>
      )}
    </div>
  );
}
