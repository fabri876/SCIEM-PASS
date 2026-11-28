import { textoAsignatura } from '../../../../utils/textoInterfaz.js';
import { textoNombre } from '../../../../components/common/textoNombre.js';
import { textoInterfaz } from '../../../../utils/textoInterfaz.js';
// Tarjeta con el resultado de la verificación (se puede cerrar con la X).
// Muestra solo los datos del estudiante: la hora, el método y quién registró ya están en el historial en vivo.
import { useEffect, useRef } from "react";
import { Check, X, Ban, MapPin, Lock, IdCard, RotateCcw, UserX, SearchX, AlertTriangle } from "lucide-react";
import AvatarConFoto from "../../../../components/common/AvatarConFoto";

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
    rojo: "bg-[#FEF2F2] text-[#B91C1C] border border-[#FEE2E2]",
    azul: "bg-[#F0F6FC] text-[#124B83] border border-[#D9E8F7]",
    gris: "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]",
  }[strTipo];
  return (
    <div className={"flex items-start gap-2.5 p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm leading-relaxed " + strColor}>
      {Icono && <Icono className="w-5 h-5 shrink-0 mt-0.5 text-current" />}
      <div className="min-w-0 flex-1 break-words">{children}</div>
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
    case "IDENTIFICADO":
      return {
        strTono: "ok", Icono: Check, strTitulo: "ESTUDIANTE IDENTIFICADO",
        strSub: r.modoRapido ? "MODO RÁPIDO · CONFIRME EL INGRESO" : "PENDIENTE DE VERIFICACIÓN FACIAL",
        nota: <Nota>{r.modoRapido ? "Revise la foto y los datos; después confirme el ingreso rápido." : "Continúe con la verificación facial para registrar el ingreso."}</Nota>,
      };
    case "IDENTIFICADO_OFFLINE":
      return {
        strTono: "ok", Icono: Check, strTitulo: "ESTUDIANTE IDENTIFICADO",
        strSub: r.modoRapido ? "SIN CONEXIÓN · MODO RÁPIDO" : "SIN CONEXIÓN · PENDIENTE DE VERIFICACIÓN FACIAL",
        nota: <Nota>Confirma el rostro para registrar el ingreso en este dispositivo.</Nota>,
      };
    case "YA_REGISTRADO":
      return { strTono: "gris", Icono: RotateCcw, strTitulo: "YA REGISTRADO", strSub: "YA MARCÓ SU INGRESO A ESTE EXAMEN" };
    case "EXCEPCIONAL_LOCAL_PENDIENTE":
      return {
        strTono: "bad", Icono: AlertTriangle,
        strTitulo: "INGRESO EXCEPCIONAL PENDIENTE",
        strSub: "NO SE PUEDE REGISTRAR UN INGRESO NORMAL TODAVÍA",
        nota: <Nota>Existe un ingreso excepcional local sin confirmar. Sincronízalo o revísalo antes de intentar registrar nuevamente.</Nota>,
      };
    case "RETIRADO":
      return {
        strTono: "bad", Icono: Ban, strTitulo: "ESTUDIANTE EXPULSADO", strSub: "NO PUEDE VOLVER A INGRESAR A ESTE EXAMEN",
        nota: (
          <>
            <Nota>
              <b className="font-bold">Motivo:</b>{" "}
              {r.motivos?.length > 1 ? (
                <ul className="mt-1 pl-[18px] list-disc">{r.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
              ) : (r.motivos?.[0] || "El estudiante ingresó y fue retirado del examen.")}
            </Nota>
            <Nota strTipo="gris" Icono={Lock}>Debe consultarse con el docente responsable.</Nota>
          </>
        ),
      };
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
            <b className="font-bold">Debe ir con {textoNombre(f.operador || "otro ayudante")}</b> · apellidos {f.desde} – {f.hasta}
          </Nota>
        ) : <Nota><b className="font-bold">Debe ir con otro ayudante del aula</b></Nota>,
      };
    }
    case "EXAMEN_INCORRECTO_OFFLINE":
      return {
        strTono: "bad", Icono: UserX, strTitulo: "INGRESO DENEGADO — EXAMEN INCORRECTO",
        strSub: r.estadoSync === "sincronizado" ? "SINCRONIZADO · INTENTO REGISTRADO EN AUDITORÍA"
          : r.estadoSync === "revision" ? "PENDIENTE DE REVISIÓN · AUDITORÍA NO CONFIRMADA"
            : "GUARDADO EN EL DISPOSITIVO · PENDIENTE DE SINCRONIZAR",
        nota: <Nota Icono={MapPin}><b className="block font-bold">Orientación según datos descargados</b>
          {r.otroExamen ? [r.otroExamen.asignatura, r.otroExamen.aula && textoAula(r.otroExamen.aula), r.otroExamen.edificio].filter(Boolean).join(" · ") : r.mensaje}
          <span className="block">{textoInterfaz(r.estadoSync === "sincronizado"
            ? "El servidor confirmó el registro y la auditoría."
            : "Confirma el destino con el docente. La sincronización y la auditoría están sujetas a validación del servidor.")}</span></Nota>,
      };
    case "AMBIGUO_OFFLINE":
      return {
        strTono: "bad", Icono: SearchX, strTitulo: "VERIFICACIÓN INCONCLUSA", strSub: "DATOS AMBIGUOS SIN CONEXIÓN",
        nota: <Nota>Los datos descargados no permiten identificar un destino o estudiante de forma inequívoca. Consulta al docente; el intento no se registró en auditoría.</Nota>,
      };
    case "EXAMEN_INCORRECTO":
      return {
        strTono: "bad", Icono: UserX, strTitulo: "INGRESO DENEGADO — EXAMEN INCORRECTO",
        strSub: r.intentoRegistrado ? "INTENTO REGISTRADO EN AUDITORÍA" : "NO SE CONFIRMÓ EL REGISTRO",
        nota: (
          <Nota Icono={MapPin}>
            <b className="block font-bold">Orientación de reubicación al estudiante</b>
            {r.otroExamen ? (
              <span>{[r.otroExamen.asignatura, r.otroExamen.nombre,
              r.otroExamen.grupo && `Grupo ${r.otroExamen.grupo}`,
              r.otroExamen.aula && textoAula(r.otroExamen.aula), r.otroExamen.edificio,
              r.otroExamen.hora].filter(Boolean).join(" · ")}
                {!r.otroExamen.aula && " · Aula asignada no disponible"}
              </span>
            ) : <span>{textoInterfaz(r.mensaje || "No se encontró un examen correspondiente para este horario.")}</span>}
          </Nota>
        ),
      };
    case "NO_INSCRITO":
      return {
        strTono: "bad", Icono: UserX, strTitulo: "NO INSCRITO EN ESTE EXAMEN", strSub: "PERTENECE A OTRO EXAMEN",
        nota: r.otroExamen ? (
          <Nota>
            <b className="font-bold">Está inscrito en {textoAsignatura(r.otroExamen.asignatura)}</b> · {textoInterfaz(r.otroExamen.nombre)} · {textoAula(r.otroExamen.aula)} · {r.otroExamen.hora}
          </Nota>
        ) : null,
      };
    case "QR_INVALIDO":
      return {
        strTono: "bad", Icono: Ban, strTitulo: "QR INVÁLIDO", strSub: "EL CÓDIGO QR NO ES VÁLIDO",
        strQuien: "Credencial rechazada",
        nota: <Nota>{textoInterfaz(r.mensaje || "El QR no existe, fue anulado o ya expiró. Indica al estudiante que contacte a su docente.")}</Nota>,
      };
    case "NO_EN_NOMINA_OFFLINE":
      return {
        strTono: "bad", Icono: SearchX, strTitulo: "NO ENCONTRADO EN LA NÓMINA", strSub: "VERIFICACIÓN SIN CONEXIÓN",
        strQuien: "Sin coincidencias en la nómina",
        nota: <Nota>No se encontró {r.metodo === "QR" ? "el código QR" : <>el dato «{r.valor ?? ""}»</>} en la nómina descargada de este examen. No se puede confirmar si está registrado en el sistema ni su examen correspondiente; verifica con conexión o consulta al docente. El intento no fue registrado en auditoría.</Nota>,
      };
    case "REQUIERE_EXCEPCIONAL_ENROLAMIENTO":
      return {
        strTono: "advertencia", Icono: AlertTriangle, strTitulo: "INGRESO EXCEPCIONAL REQUERIDO",
        strSub: "EL ESTADO FACIAL NO PERMITE UN INGRESO NORMAL",
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
        nota: r.mensaje ? <Nota>{textoInterfaz(r.mensaje)}</Nota> : null,
      };
  }
}

const COLOR_BANDA = { ok: "bg-[#003770]", gris: "bg-[#475569]", bad: "bg-[#B91C1C]" };

// Espacio de la foto: muestra la foto si el backend la envía; si no, las iniciales
function Foto({ idUsuario, codigoSis, idExamen, strNombre }) {
  return (
    <AvatarConFoto
      idUsuario={idUsuario}
      codigoSis={codigoSis}
      idExamen={idExamen}
      className="w-24 h-[116px] max-md:w-20 max-md:h-24 rounded-xl border border-[#CBD5E1] bg-gradient-to-b from-[#E2E8F0] to-[#CBD5E1] flex flex-col items-center justify-center shrink-0 overflow-hidden"
      fallback={
        <>
          <span className="text-[28px] max-md:text-2xl font-extrabold text-[#475569] leading-none">{textoInterfaz(iniciales(strNombre))}</span>
          <span className="mt-1.5 text-[10px] font-bold tracking-[.4px] text-[#64748B]">Foto</span>
        </>
      }
    />
  );
}

// "CI" / "C.I." / "SIS" / "QR" / "Lista" → texto para "Identificado por …"
function textoMetodoIdentificacion(strMetodo) {
  const str = String(strMetodo || "").toUpperCase().replace(/\./g, "");
  if (str === "QR") return "código QR";
  if (str === "SIS") return "código SIS";
  if (str === "CI") return "C.I.";
  if (str === "LISTA") return "lista";
  return strMetodo;
}

export default function TarjetaResultado({ objResultado, onCerrar, onRegistrarIncidencia, strRol = "operador", idExamen }) {
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
          <div className="text-xs font-bold tracking-[.4px] text-[#64748B]">Esperando verificación</div>
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
          <b className="block text-[16px] max-md:text-[15px] font-bold tracking-[.4px]">{textoInterfaz(c.strTitulo)}</b>
          <span className="block text-xs max-md:text-[11px] font-semibold tracking-[.3px] opacity-85">{textoInterfaz(c.strSub)}</span>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar tarjeta" className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 hover:bg-white/15 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Foto + datos del estudiante */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 px-4 sm:px-5 py-4 sm:py-[18px]">
        <Foto idUsuario={e?.idusuario} codigoSis={e?.sis} idExamen={idExamen} strNombre={textoInterfaz(strNombre)} />
        <div className="min-w-0">
          <div className="text-[22px] max-md:text-[19px] font-extrabold text-[#08264A] leading-tight">{textoInterfaz(strNombre)}</div>
          {/* Cómo se identificó al estudiante (no es un dato del estudiante) */}
          {objResultado.metodo && (
            <span className="mt-1 block text-[12px] font-semibold text-[#64748B]">
              Identificado por {textoInterfaz(textoMetodoIdentificacion(objResultado.metodo))}
              {objResultado.conFacial != null && ` · ${objResultado.conFacial ? "con verificación facial" : "sin verificación facial"}`}
              {objResultado.modoRapido && " · modo rápido"}
            </span>
          )}
          {e && (e.ci || e.sis) && (
            <div className="mt-2.5 flex flex-wrap gap-x-5 sm:gap-x-7 gap-y-2">
              {e.ci && (
                <div>
                  <span className="block text-[11px] font-bold tracking-[.4px] text-[#64748B]">C.I.</span>
                  <strong className="block text-[14px] sm:text-[15px] font-bold text-[#08264A]">{e.ci}</strong>
                </div>
              )}
              {e.sis && (
                <div>
                  <span className="block text-[11px] font-bold tracking-[.4px] text-[#64748B]">Código SIS</span>
                  <strong className="block text-[14px] sm:text-[15px] font-bold text-[#08264A]">{e.sis}</strong>
                </div>
              )}
              <div>
                <span className="block text-[11px] font-bold tracking-[.4px] text-[#64748B]">Carrera</span>
                <strong className="block text-[14px] sm:text-[15px] font-bold text-[#08264A]">{textoInterfaz(e.carrera || "No disponible")}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {c.nota && <div className="mx-4 sm:mx-5 mb-4 sm:mb-[18px] flex flex-col gap-2">{c.nota}</div>}
      {objResultado.resultado === "EXAMEN_INCORRECTO" && (
        <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button type="button" onClick={onCerrar}
            className="w-full sm:w-auto rounded-xl bg-[#003770] px-4 py-3 text-sm font-bold text-white hover:bg-[#021B3B] transition shadow-xs cursor-pointer text-center">
            Aceptar y continuar siguiente estudiante
          </button>
          {onRegistrarIncidencia && (
            <button type="button" onClick={onRegistrarIncidencia}
              className="w-full sm:w-auto rounded-xl border border-[#003770] bg-white px-4 py-3 text-sm font-bold text-[#003770] hover:bg-blue-50 transition shadow-xs cursor-pointer text-center">
              Registrar incidencia
            </button>
          )}
        </div>
      )}
    </div>
  );
}
