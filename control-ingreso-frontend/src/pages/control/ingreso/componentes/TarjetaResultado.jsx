// Tarjeta con el resultado de la verificación (se puede cerrar con la X).
// Muestra solo los datos del estudiante: la hora, el método y quién registró ya están en el historial en vivo.
import { useEffect, useRef } from "react";
import { Check, X, Ban, MapPin, Lock, IdCard, RotateCcw, UserX, SearchX, AlertTriangle } from "lucide-react";

const nombreCompleto = (e) => (e ? `${e.nombres || ""} ${e.apellidos || ""}`.trim() : "");

// Iniciales para el espacio de la foto: primer nombre + primer apellido
function iniciales(strNombre) {
  const p = String(strNombre || "").trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].charAt(0).toUpperCase();
  const strApellido = p.length >= 4 ? p[p.length - 2] : p[1];
  return (p[0].charAt(0) + strApellido.charAt(0)).toUpperCase();
}

// Evita "Aula Aula 691A"
const textoAula = (strAula) => (!strAula ? "" : /^aula/i.test(String(strAula)) ? String(strAula) : `Aula ${strAula}`);

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

// Nota debajo de los datos (solo cuando el ayudante necesita saber qué hacer)
function Nota({ strTipo = "rojo", Icono = null, children }) {
  const strColor = {
    rojo: "bg-[#FEF2F2] text-[#B91C1C]",
    azul: "bg-[#F0F6FC] text-[#124B83]",
    gris: "bg-[#F1F5F9] text-[#475569]",
  }[strTipo];
  return (
    <div className={"flex items-start gap-2 px-4 py-3 rounded-lg text-[15px] " + strColor}>
      {Icono && <Icono className="w-[18px] h-[18px] shrink-0 mt-0.5" />}
      <div>{children}</div>
    </div>
  );
}

// Cada resultado define: color de la banda, ícono, título, subtítulo y (si hace falta) una nota
// strTono: "ok" (azul) · "gris" (ya registrado) · "bad" (rojo)
function configurar(r, strRol) {
  const e = r.estudiante;
  switch (r.resultado) {
    case "PERMITIDO":
      return { strTono: "ok", Icono: Check, strTitulo: "INGRESO PERMITIDO", strSub: "IDENTIDAD Y HABILITACIÓN VERIFICADAS" };
    case "REGISTRADO_OFFLINE":
      return {
        strTono: "ok", Icono: Check, strTitulo: "INGRESO PERMITIDO", strSub: "GUARDADO EN EL EQUIPO · SE ENVIARÁ AL VOLVER EL INTERNET",
      };
    case "YA_REGISTRADO":
      return { strTono: "gris", Icono: RotateCcw, strTitulo: "YA REGISTRADO", strSub: "YA MARCÓ SU INGRESO A ESTE EXAMEN" };
    case "NO_HABILITADO":
      return {
        strTono: "bad", Icono: Ban, strTitulo: "ESTUDIANTE INHABILITADO", strSub: "NO CUMPLE LOS REQUISITOS",
        nota: (
          <>
            <Nota>
              <b className="font-bold">Motivo del bloqueo:</b>{" "}
              {r.motivos?.length > 1 ? (
                <ul className="mt-1 pl-[18px] list-disc">{r.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
              ) : (r.motivos?.[0] || "sin detalle.")}
            </Nota>
            {strRol === "operador" && <Nota strTipo="gris" Icono={Lock}>El ayudante no puede autorizar este ingreso.</Nota>}
          </>
        ),
      };
    case "OTRA_AULA":
      return {
        strTono: "bad", Icono: MapPin, strTitulo: "INGRESO A UN AMBIENTE DIFERENTE", strSub: "ESTÁ HABILITADO, PERO EN OTRA AULA",
        nota: <Nota><b className="font-bold">Debe ir al {textoAula(e?.aulaAsignada) || "aula que le corresponde"}</b></Nota>,
      };
    case "FUERA_DE_FILA": {
      const f = r.filaCorrecta;
      return {
        strTono: "bad", Icono: AlertTriangle, strTitulo: "LE CORRESPONDE A OTRO AYUDANTE", strSub: "INGRESO NO REGISTRADO",
        nota: f ? (
          <Nota>
            <b className="font-bold">Debe ir con {f.operador || "otro ayudante"}</b> · apellidos {f.desde} – {f.hasta}
          </Nota>
        ) : <Nota><b className="font-bold">Debe ir con otro ayudante del aula</b></Nota>,
      };
    }
    case "NO_INSCRITO":
      return {
        strTono: "bad", Icono: UserX, strTitulo: "NO INSCRITO EN ESTE EXAMEN", strSub: "PERTENECE A OTRO EXAMEN",
        nota: r.otroExamen ? (
          <Nota>
            <b className="font-bold">Está inscrito en {r.otroExamen.asignatura}</b> · {r.otroExamen.nombre} · {textoAula(r.otroExamen.aula)} · {r.otroExamen.hora}
          </Nota>
        ) : null,
      };
    case "QR_INVALIDO":
      return {
        strTono: "bad", Icono: Ban, strTitulo: "QR INVÁLIDO", strSub: "EL CÓDIGO QR NO ES VÁLIDO",
        strQuien: "Credencial rechazada",
        nota: <Nota>{r.mensaje || "El QR no existe, fue anulado o ya expiró. Indica al estudiante que contacte a su docente."}</Nota>,
      };
    case "NO_ENCONTRADO":
      return {
        strTono: "bad", Icono: SearchX, strTitulo: "ESTUDIANTE NO ENCONTRADO", strSub: "EL DATO NO EXISTE EN EL SISTEMA",
        strQuien: "Sin coincidencias",
        nota: <Nota>El dato «{r.valor ?? ""}» no corresponde a ningún estudiante registrado.</Nota>,
      };
    default: // estado que el frontend todavía no conoce: se muestra el mensaje del backend
      return {
        strTono: "bad", Icono: X, strTitulo: "INGRESO DENEGADO", strSub: String(r.resultado || "").replaceAll("_", " "),
        nota: r.mensaje ? <Nota>{r.mensaje}</Nota> : null,
      };
  }
}

const COLOR_BANDA = { ok: "bg-[#003770]", gris: "bg-[#475569]", bad: "bg-[#B91C1C]" };

// Espacio de la foto: muestra la foto si el backend la envía; si no, las iniciales
function Foto({ strUrl, strNombre }) {
  return (
    <div className="w-24 h-[116px] max-md:w-20 max-md:h-24 rounded-xl border border-[#CBD5E1] bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] flex flex-col items-center justify-center shrink-0 overflow-hidden">
      {strUrl ? (
        <img src={strUrl} alt={`Foto de ${strNombre}`} className="w-full h-full object-cover" />
      ) : (
        <>
          <span className="text-[28px] max-md:text-2xl font-extrabold text-[#475569] leading-none">{iniciales(strNombre)}</span>
          <span className="mt-1.5 text-[10px] font-bold tracking-[.4px] text-[#64748B]">FOTO</span>
        </>
      )}
    </div>
  );
}

export default function TarjetaResultado({ objResultado, onCerrar, strRol = "operador" }) {
  const refTarjeta = useRef(null);

  useEffect(() => {
    if (!objResultado) return;
    sonar(objResultado.resultado === "PERMITIDO" || objResultado.resultado === "REGISTRADO_OFFLINE");
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
  const strNombre = c.strQuien || nombreCompleto(e);

  return (
    <div
      ref={refTarjeta}
      key={objResultado.clave}
      aria-live="polite"
      className="ci-aparecer mt-[18px] bg-white border border-[#CBD5E1] rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(8,38,74,.06)] scroll-mt-24"
    >
      {/* Banda de color con el resultado */}
      <div className={"flex items-center gap-3 py-3 pr-2 pl-5 text-white max-md:pl-4 " + (COLOR_BANDA[c.strTono] || COLOR_BANDA.bad)}>
        <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <c.Icono className="w-5 h-5" strokeWidth={2.6} />
        </span>
        <div className="flex-1 min-w-0">
          <b className="block text-[16px] max-md:text-[15px] font-bold tracking-[.4px]">{c.strTitulo}</b>
          <span className="block text-xs max-md:text-[11px] font-semibold tracking-[.3px] opacity-85">{c.strSub}</span>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar tarjeta" className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 hover:bg-white/15 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Foto + datos del estudiante */}
      <div className="flex items-center gap-5 px-5 py-[18px] max-md:gap-4 max-md:px-4">
        <Foto strUrl={e?.fotoUrl} strNombre={strNombre} />
        <div className="min-w-0">
          <div className="text-[22px] max-md:text-[19px] font-extrabold text-[#08264A] leading-tight">{strNombre}</div>
          {e && (e.ci || e.sis) && (
            <div className="mt-2.5 flex flex-wrap gap-x-7 gap-y-2">
              {e.ci && (
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[.4px] text-[#64748B]">C.I.</span>
                  <strong className="block text-[15px] font-bold text-[#08264A]">{e.ci}</strong>
                </div>
              )}
              {e.sis && (
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[.4px] text-[#64748B]">Código SIS</span>
                  <strong className="block text-[15px] font-bold text-[#08264A]">{e.sis}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {c.nota && <div className="mx-5 mb-[18px] flex flex-col gap-2 max-md:mx-4">{c.nota}</div>}
    </div>
  );
}
