// Tarjeta con el resultado de la verificación (se puede cerrar con la X)
import { useEffect, useRef } from "react";
import { Check, X, Ban, MapPin, Info, Lock, IdCard, Clock, UserX, SearchX, Users } from "lucide-react";

const nombreCompleto = (e) => (e ? `${e.nombres} ${e.apellidos}` : "");

// Sonido corto: agudo = permitido, grave = rechazado
let objAudio = null;
function sonar(boolOk) {
  try {
    objAudio = objAudio || new (window.AudioContext || window.webkitAudioContext)();
    const o = objAudio.createOscillator();
    const g = objAudio.createGain();
    o.type = "sine";
    o.frequency.value = boolOk ? 880 : 220;
    g.gain.setValueAtTime(0.0001, objAudio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, objAudio.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, objAudio.currentTime + (boolOk ? 0.18 : 0.35));
    o.connect(g);
    g.connect(objAudio.destination);
    o.start();
    o.stop(objAudio.currentTime + (boolOk ? 0.2 : 0.4));
  } catch { /* sin audio */ }
}

function Nota({ strTipo, Icono = Info, children }) {
  const strColor = {
    azul: "bg-[#F0F6FC] text-[#124B83]",
    rojo: "bg-[#FEF2F2] text-[#B91C1C]",
    gris: "bg-[#F1F5F9] text-[#475569]",
  }[strTipo];
  return (
    <div className={"flex items-start gap-2.5 px-3.5 py-[11px] rounded-lg text-sm " + strColor}>
      <Icono className="w-[18px] h-[18px] shrink-0 mt-px" />
      <div>{children}</div>
    </div>
  );
}

// Primera letra del apellido, sin tildes
const letraApellido = (e) => String(e?.apellidos || e?.nombres?.split(" ").slice(-2, -1)[0] || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0).toUpperCase();

function configurar(r, strRol) {
  const e = r.estudiante;
  switch (r.resultado) {
    case "PERMITIDO":
      return {
        strTono: "ok", Icono: Check, strTitulo: "INGRESO PERMITIDO", strSub: "IDENTIDAD Y HABILITACIÓN VERIFICADAS",
        objSello: { strEtiqueta: "Ingreso registrado", strHora: r.horaIngreso, strDetalle: [r.fechaIngreso, r.metodo].filter(Boolean).join(" · "), strRegistro: r.registradoPor },
        notas: e?.normaParticular ? <Nota strTipo="azul"><b className="font-semibold">Norma particular:</b> {e.normaParticular}</Nota> : null,
      };
    case "REGISTRADO_OFFLINE":
      return {
        strTono: "ok", Icono: Check, strTitulo: "REGISTRADO OFFLINE", strSub: "INGRESO REGISTRADO · PENDIENTE DE SINCRONIZACIÓN",
        objSello: { strEtiqueta: "Ingreso registrado (offline)", strHora: r.horaIngreso, strDetalle: [r.fechaIngreso, r.metodo].filter(Boolean).join(" · "), strRegistro: r.registradoPor },
        notas: e?.normaParticular ? <Nota strTipo="azul"><b className="font-semibold">Norma particular:</b> {e.normaParticular}</Nota> : null,
      };
    case "YA_REGISTRADO":
      return {
        strTono: "bad", Icono: Clock, strTitulo: "YA REGISTRADO", strSub: "INGRESO DENEGADO · YA MARCÓ SU INGRESO A ESTE EXAMEN",
        objSello: {
          strEtiqueta: "Primera marcación", strHora: r.ingresoPrevio?.hora,
          strDetalle: [r.ingresoPrevio?.fecha || r.fechaIngreso, (r.ingresoPrevio?.aula || e?.aulaAsignada) && `Aula ${r.ingresoPrevio?.aula || e?.aulaAsignada}`].filter(Boolean).join(" · "),
          strRegistro: r.ingresoPrevio?.registradoPor,
        },
        notas: <Nota strTipo="gris">No se creó un nuevo registro.</Nota>,
      };
    case "NO_HABILITADO":
      return {
        strTono: "bad", Icono: Ban, strTitulo: "ESTUDIANTE INHABILITADO", strSub: "INGRESO DENEGADO · NO CUMPLE LOS REQUISITOS",
        notas: (
          <>
            <Nota strTipo="rojo">
              <b className="font-semibold">Motivo del bloqueo:</b>
              {r.motivos?.length ? (
                <ul className="mt-1.5 pl-[18px] list-disc">{r.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
              ) : " sin detalle."}
            </Nota>
            {strRol === "operador" && <Nota strTipo="gris" Icono={Lock}>El rol operador no puede autorizar este ingreso.</Nota>}
          </>
        ),
      };
    case "OTRA_AULA":
      return {
        strTono: "bad", Icono: MapPin, strTitulo: "INGRESO A UN AMBIENTE DIFERENTE", strSub: "INGRESO DENEGADO · ESTÁ HABILITADO, PERO EN OTRA AULA",
        notas: (
          <Nota strTipo="azul">
            El estudiante debe dirigirse al{" "}
            <b className="font-semibold">
              {/^aula/i.test(String(e?.aulaAsignada || "")) ? e?.aulaAsignada : `Aula ${e?.aulaAsignada}`}
            </b>
            . El docente puede reubicarlo desde el monitoreo si en esta aula hay pupitres libres.
          </Nota>
        ),
      };
    case "FUERA_DE_FILA": {
      const f = r.filaCorrecta;
      const strLetra = letraApellido(e);
      return {
        strTono: "aviso", Icono: Users, strTitulo: "NO PERTENECE A TU FILA", strSub: "INGRESO NO REGISTRADO · LE CORRESPONDE A OTRO OPERADOR",
        notas: (
          <Nota strTipo="gris" Icono={Users}>
            {strLetra && <>Apellido con <b className="font-semibold">{strLetra}</b>: </>}
            {f
              ? <>le corresponde la fila <b className="font-semibold">{f.desde} – {f.hasta}</b>{f.operador ? <> de <b className="font-semibold">{f.operador}</b></> : null}.</>
              : <>le corresponde la fila de otro operador.</>}
            {" "}Indícale que vaya a esa fila.
          </Nota>
        ),
      };
    }
    case "NO_INSCRITO":
      return {
        strTono: "bad", Icono: UserX, strTitulo: "NO INSCRITO EN ESTE EXAMEN", strSub: "INGRESO DENEGADO · PERTENECE A OTRO EXAMEN",
        notas: r.otroExamen ? (
          <Nota strTipo="rojo">
            Está inscrito en <b className="font-semibold">{r.otroExamen.nombre}</b> · Aula {r.otroExamen.aula} · {r.otroExamen.hora}.
            No se registró el ingreso en este examen.
          </Nota>
        ) : null,
      };
    case "QR_INVALIDO":
      return {
        strTono: "bad", Icono: Ban, strTitulo: "QR INVÁLIDO", strSub: "INGRESO DENEGADO · EL CÓDIGO QR NO ES VÁLIDO",
        strQuien: "Credencial rechazada",
        strDetalle: r.mensaje || "El QR no existe, fue anulado o ya expiró. Pide al estudiante que consulte su credencial.",
        notas: (
          <Nota strTipo="rojo">
            Posibles causas: QR expirado, estudiante inhabilitado después de generarlo, o QR de otro examen.
            Indica al estudiante que contacte a su docente.
          </Nota>
        ),
      };
    case "NO_ENCONTRADO":
      return {
        strTono: "bad", Icono: SearchX, strTitulo: "ESTUDIANTE NO ENCONTRADO", strSub: "INGRESO DENEGADO · EL DATO NO EXISTE EN EL SISTEMA",
        strQuien: "Sin coincidencias",
        strDetalle: `El dato «${r.valor ?? ""}» no corresponde a ningún estudiante registrado.`,
      };
    default: // estado que el frontend todavía no conoce: se muestra el mensaje del backend
      return {
        strTono: "bad", Icono: X, strTitulo: "INGRESO DENEGADO", strSub: String(r.resultado || "").replaceAll("_", " "),
        strDetalle: r.mensaje || "",
      };
  }
}

export default function TarjetaResultado({ objResultado, onCerrar, strRol = "operador" }) {
  const refTarjeta = useRef(null);

  useEffect(() => {
    if (!objResultado) return;
    sonar(objResultado.resultado === "PERMITIDO");
    if (window.innerWidth <= 720) {
      setTimeout(() => refTarjeta.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [objResultado?.clave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!objResultado) {
    return (
      <div aria-live="polite" className="mt-[18px] flex items-center gap-[18px] px-[22px] py-5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F1F5F9] max-md:p-4">
        <span className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0 bg-[#F1F5F9] text-[#9AA8BA]">
          <IdCard className="w-[26px] h-[26px]" strokeWidth={1.8} />
        </span>
        <div>
          <div className="text-xs font-bold tracking-[.4px] text-[#64748B]">ESPERANDO VERIFICACIÓN</div>
          <div className="mt-0.5 text-sm text-[#64748B]">
            Aquí aparecerá el resultado de la verificación. Si el estudiante está habilitado, su ingreso se registra
            automáticamente con la fecha y hora.
          </div>
        </div>
      </div>
    );
  }

  const c = configurar(objResultado, strRol);
  const e = objResultado.estudiante;
  const boolOk = c.strTono === "ok";

  return (
    <div
      ref={refTarjeta}
      key={objResultado.clave}
      aria-live="polite"
      className="ci-aparecer mt-[18px] bg-white border border-[#CBD5E1] rounded-xl overflow-hidden scroll-mt-24"
    >
      {/* Banda de estado */}
      <div className={"flex items-center gap-3.5 py-3.5 pr-3.5 pl-[22px] text-white max-md:gap-3 max-md:py-3 max-md:pr-2 max-md:pl-4 " + (boolOk ? "bg-[#1860A3]" : c.strTono === "aviso" ? "bg-[#475569]" : "bg-[#B91C1C]")}>
        <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <c.Icono className="w-6 h-6" strokeWidth={2.6} />
        </span>
        <div className="flex-1 min-w-0">
          <b className="block text-[17px] max-md:text-[15px] font-bold tracking-[.3px]">{c.strTitulo}</b>
          <span className="text-xs max-md:text-[11px] font-semibold tracking-[.5px] opacity-90">{c.strSub}</span>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar tarjeta" className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 hover:bg-white/15 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Datos del estudiante + sello de hora */}
      <div className="flex flex-wrap items-center gap-[22px] px-[22px] py-5 max-md:p-4 max-md:gap-3.5">
        <div className="flex-1 basis-[420px] min-w-0 max-md:basis-full">
          <div className="text-[22px] max-md:text-[19px] font-bold text-[#08264A]">{c.strQuien || nombreCompleto(e)}</div>
          {c.strDetalle && <div className="mt-0.5 text-sm text-[#64748B]">{c.strDetalle}</div>}
          {e && (
            <div className="mt-3 grid grid-cols-4 max-md:grid-cols-2 gap-x-[18px] gap-y-3 max-md:gap-x-3.5 max-md:gap-y-2.5">
              {[
                ["C.I.", e.ci, true],
                ["Código SIS", e.sis, true],
                ["Carrera", e.carrera, false],
                ["Aula asignada", e.aulaAsignada ? `Aula ${e.aulaAsignada}` : "—", false],
              ].map(([strEtq, strVal, boolMono]) => (
                <div key={strEtq}>
                  <span className="block text-[11px] font-semibold uppercase tracking-[.4px] text-[#64748B]">{strEtq}</span>
                  <strong className={"block mt-0.5 text-sm font-semibold text-[#08264A] " + (boolMono ? "font-mono" : "")}>{strVal}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {c.objSello && (
          <div
            className={
              "rounded-[10px] px-5 py-3.5 text-right min-w-[210px] " +
              "max-md:w-full max-md:min-w-0 max-md:text-left max-md:flex max-md:flex-wrap max-md:items-baseline max-md:justify-between max-md:gap-x-3 max-md:gap-y-1 max-md:px-3.5 max-md:py-3 " +
              (boolOk ? "bg-[#F0F6FC]" : "bg-[#FEF2F2]")
            }
          >
            <div className={"text-[11px] font-bold uppercase tracking-[.4px] max-md:w-full " + (boolOk ? "text-[#1860A3]" : "text-[#B91C1C]")}>
              {c.objSello.strEtiqueta}
            </div>
            <span className="block mt-0.5 max-md:mt-0 font-mono text-[32px] max-md:text-[28px] font-semibold text-[#003770]">{c.objSello.strHora}</span>
            <div className="text-xs text-[#475569]">{c.objSello.strDetalle}</div>
            {c.objSello.strRegistro && (
              <div className="mt-0.5 text-xs text-[#64748B] max-md:w-full">Registró: {c.objSello.strRegistro}</div>
            )}
          </div>
        )}
      </div>

      {c.notas && (
        <div className="mx-[22px] mb-5 pt-4 border-t border-[#CBD5E1] flex flex-col gap-2.5 max-md:mx-4 max-md:mb-4">{c.notas}</div>
      )}
    </div>
  );
}
