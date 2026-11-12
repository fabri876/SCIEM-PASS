import { useEffect, useRef, useState } from "react";

import { obtenerUsuarioActual, obtenerToken } from "../../services/authService";
import { useLocation } from "react-router-dom";
import { obtenerAvisosExamenes } from "../../services/notificacionesService";

// Clave donde guardo los ids de las notificaciones ya leídas (por navegador)
const STR_CLAVE_LEIDAS = "notificaciones-leidas";

function fnLeerLeidasGuardadas(clave = STR_CLAVE_LEIDAS) {
  try {
    const arr = JSON.parse(localStorage.getItem(clave) || "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function IconoTipo({ strTipo }) {
  return (
    <svg
      className="w-4 h-4 stroke-[#2563EB] fill-none stroke-[2]"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {strTipo === "examen" ? (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </>
      )}
    </svg>
  );
}

export default function NotificationsMenu({ boolVersionMobile = false, boolAbiertoInicial = false }) {
  const location=useLocation();
  const usuario=obtenerUsuarioActual();
  const sesion=Boolean(usuario&&obtenerToken());
  const claveLeidas=`${STR_CLAVE_LEIDAS}-${usuario?.idUsuario??"invitado"}`;
  const [arrNotificaciones, setArrNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [boolAbierto, setBoolAbierto] = useState(boolAbiertoInicial);
  const [setLeidas, setSetLeidas] = useState(fnLeerLeidasGuardadas);
  const refContenedor = useRef(null);

  // Las "no leídas" son las que todavía no están en el set de leídas.
  // Si llega un aviso nuevo en el próximo refresco, la burbuja vuelve a aparecer.
  const intNoLeidas = !sesion ? 0 : arrNotificaciones.filter((n) => !setLeidas.has(n.intId)).length;

  const fnAlternar = () => setBoolAbierto((boolPrev) => !boolPrev);

  const fnMarcarComoLeidas = () => {
    // Guardo solo los ids actuales, así el almacenamiento no crece con avisos viejos
    const setNuevo = new Set(arrNotificaciones.map((n) => n.intId));
    setSetLeidas(setNuevo);
    try {
      localStorage.setItem(claveLeidas, JSON.stringify([...setNuevo]));
    } catch {}
  };

  // Abrir cuando la card "Notificaciones" del Inicio lo pide (evento global).
  // La instancia desktop también existe (oculta) en celular: ahí se ignora,
  // porque en mobile es el Header quien abre el menú y la instancia mobile.
  useEffect(() => {
    const fnAbrir = () => {
      if (!boolVersionMobile && !window.matchMedia("(min-width: 768px)").matches) return;
      setBoolAbierto(true);
    };
    window.addEventListener("abrir-notificaciones", fnAbrir);
    return () => window.removeEventListener("abrir-notificaciones", fnAbrir);
  }, [boolVersionMobile]);

  useEffect(() => {
    let activo = true;
    setArrNotificaciones([]);setError("");setSetLeidas(fnLeerLeidasGuardadas(claveLeidas));
    if(!sesion){setCargando(false);return;}
    setCargando(true);
    const cargar = async () => {
      try {
        const datos = await obtenerAvisosExamenes();
        if (activo) { setArrNotificaciones(datos); setError(""); }
      } catch (e) {
        if (activo) { setArrNotificaciones([]); setError(e.message); }
      } finally { if (activo) setCargando(false); }
    };
    void cargar();
    const timer = setInterval(cargar, 15000);
    return () => { activo = false; if (timer) clearInterval(timer); };
  }, [boolAbierto, revision, sesion, claveLeidas, location.pathname]);

  // Cerrar al hacer clic afuera o con Escape (solo tiene sentido en desktop,
  // en mobile el panel se cierra junto con el menú de hamburguesa)
  useEffect(() => {
    if (!boolAbierto || boolVersionMobile) return;

    const fnClicAfuera = (evento) => {
      if (refContenedor.current && !refContenedor.current.contains(evento.target)) {
        setBoolAbierto(false);
      }
    };
    const fnTecla = (evento) => {
      if (evento.key === "Escape") setBoolAbierto(false);
    };

    document.addEventListener("mousedown", fnClicAfuera);
    document.addEventListener("keydown", fnTecla);
    return () => {
      document.removeEventListener("mousedown", fnClicAfuera);
      document.removeEventListener("keydown", fnTecla);
    };
  }, [boolAbierto, boolVersionMobile]);

  // Contenido de la ventana (el mismo para desktop y mobile)
  const jsxPanel = (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden ${
        boolVersionMobile
          ? "mt-1"
          : "shadow-[0_12px_32px_rgba(30,64,175,0.16)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-[18px] py-4 border-b border-[#EEF1F8]">
        <div className="min-w-0">
          <b className="block text-[15px] font-extrabold text-[#0A2C66]">Notificaciones</b>
          <span className="block text-xs text-[#64748B]">Exámenes próximos y cambios</span>
        </div>
        <button
          type="button"
          onClick={fnMarcarComoLeidas}
          disabled={!sesion || intNoLeidas === 0}
          className="shrink-0 text-xs font-bold text-[#2563EB] hover:underline disabled:text-[#94A3B8] disabled:no-underline disabled:cursor-default"
        >
          Marcar como leídas
        </button>
      </div>

      {!sesion && <p className="p-4 text-sm text-[#64748B]">Inicie sesión para ver sus notificaciones.</p>}
      {sesion && cargando && <p role="status" className="p-4 text-sm text-[#64748B]">Cargando avisos…</p>}
      {sesion && error && <div role="alert" className="p-4 text-sm text-accent-red">{error}<button type="button" onClick={() => setRevision(v => v + 1)} className="block mt-2 font-bold underline">Reintentar</button></div>}
      {sesion && !cargando && !error && !arrNotificaciones.length && <p className="p-4 text-sm text-[#64748B]">No tienes notificaciones</p>}
      <ul className="max-h-[360px] overflow-y-auto">
        {(sesion ? arrNotificaciones : []).map((notif) => {
          const boolNueva = !setLeidas.has(notif.intId);
          return (
            <li
              key={notif.intId}
              className={`flex gap-3 px-[18px] py-3.5 border-b border-[#EEF1F8] last:border-b-0 ${
                boolNueva ? "bg-[#F5F8FF]" : "bg-white"
              }`}
            >
              <div className="flex-none w-9 h-9 rounded-full bg-[#E3ECFF] flex items-center justify-center">
                <IconoTipo strTipo={notif.strTipo} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-extrabold text-[#0A2C66]">{notif.strTitulo}</p>
                  {boolNueva && (
                    <span
                      className="mt-1 w-2 h-2 shrink-0 rounded-full bg-[#2563EB]"
                      aria-label="Nueva"
                    />
                  )}
                </div>
                <p className="mt-[3px] text-xs leading-[17px] text-[#64748B]">
                  {notif.strDescripcion}
                </p>
                <p className="mt-[5px] text-[11px] text-[#94A3B8]">{notif.strHace}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // Botón del ítem (mismo estilo que los NavItem del Header)
  const jsxBoton = (
    <button
      type="button"
      onClick={fnAlternar}
      aria-haspopup="true"
      aria-expanded={boolAbierto}
      aria-controls="panel-notificaciones"
      className={`relative flex items-center gap-2.5 text-sm whitespace-nowrap cursor-pointer ${
        boolVersionMobile ? "w-full py-2" : "h-full"
      } ${boolAbierto ? "font-extrabold text-[#123F7B]" : "text-[#294B7C]"}`}
    >
      <span className="relative">
        <svg className="w-5 h-5 stroke-[#123F7B] fill-none stroke-[1.8]" viewBox="0 0 24 24">
          <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {intNoLeidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D93856] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {intNoLeidas}
          </span>
        )}
      </span>
      Notificaciones

      {boolVersionMobile && (
        <svg
          className={`ml-auto w-4 h-4 stroke-[#123F7B] fill-none stroke-2 transition-transform duration-300 ${
            boolAbierto ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      )}

      {boolAbierto && !boolVersionMobile && (
        <span className="absolute bottom-[26px] left-0 right-0 h-1 rounded-[5px] bg-[linear-gradient(90deg,#2563EB,#D93856)]" />
      )}
      {boolAbierto && boolVersionMobile && (
        <span className="absolute left-0 top-0 bottom-0 w-1 rounded-[5px] bg-[linear-gradient(180deg,#2563EB,#D93856)]" />
      )}
    </button>
  );

  // ---------- MOBILE: se expande en línea ----------
  if (boolVersionMobile) {
    return (
      <div className="w-full">
        {jsxBoton}
        <div
          id="panel-notificaciones"
          aria-hidden={!boolAbierto}
          className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out ${
            boolAbierto
              ? "grid-rows-[1fr] opacity-100 visible"
              : "grid-rows-[0fr] opacity-0 invisible"
          }`}
        >
          <div className="overflow-hidden">{jsxPanel}</div>
        </div>
      </div>
    );
  }

  // ---------- DESKTOP: ventana que se desliza hacia abajo ----------
  return (
    <div ref={refContenedor} className="relative h-full">
      {jsxBoton}
      <div
        id="panel-notificaciones"
        aria-hidden={!boolAbierto}
        className={`absolute right-0 top-full mt-1 w-[360px] z-50 transition-[opacity,transform,visibility] duration-200 ease-out ${
          boolAbierto
            ? "opacity-100 translate-y-0 visible"
            : "opacity-0 -translate-y-2 invisible pointer-events-none"
        }`}
      >
        {jsxPanel}
      </div>
    </div>
  );
}
