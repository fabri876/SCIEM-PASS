import { textoInterfaz } from '../../utils/textoInterfaz.js';
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../common/Logo";
import UserAccountMenu from "../common/UserAccountMenu";
import FlujoCambioContrasena from "../common/FlujoCambioContrasena";
import NotificationsMenu from "./NotificationsMenu";
import { obtenerToken, obtenerUsuarioActual, obtenerRutaPorRol, cerrarSesion } from "../../services/authService";
import ModalCierreSesion from "../../pages/control/components/ModalCierreSesion.jsx";

/**
 * Header.jsx
 *
 * Barra superior con el logo y la navegación principal. No es algo
 * exclusivo de la pantalla de Registro: se repite en Home, Login,
 * Dashboard, Exámenes, etc. Por eso vive en components/layout y no en
 * components/registro.
 *
 * "arrNavItems" guarda los datos de cada link (texto + ícono + ruta)
 * para no repetir casi el mismo bloque de JSX. Cada ícono es el mismo
 * SVG del mockup original, solo que factorizado en un array.
 *
 * CAMBIO (notificaciones): "Notificaciones" ya NO es un link a una ruta
 * (antes redirigía a "página en construcción"). Ahora es un componente
 * aparte, <NotificationsMenu />, que abre una ventanita desplegable con
 * las notificaciones del sistema. Por eso salió de arrNavItems y se
 * renderiza justo después del map, tanto en desktop como en el menú
 * mobile (con la prop "boolVersionMobile").
 *
 * El ítem activo (la rayita de abajo) ya NO se pasa a mano: se calcula
 * comparando la URL actual (useLocation) contra "strRuta" de cada ítem.
 * Un ítem también queda activo si la URL es una sub-ruta suya; por eso
 * "Exámenes" sigue marcado en /examenes/pasados.
 *
 * El extremo derecho muestra "Iniciar sesión" si NO hay sesión iniciada
 * (se fija con obtenerToken()/obtenerUsuarioActual() de authService, igual
 * que ya lo hacen los guards de rutas en App.jsx), o el menú de cuenta
 * (UserAccountMenu: avatar/nombre, "Cambiar contraseña", "Cerrar sesión")
 * si SÍ la hay.
 *
 * RESPONSIVE:
 * A partir del breakpoint "md" de Tailwind se ve el diseño original
 * (logo + nav horizontal + sesión, todo en una fila). Por debajo de "md"
 * (celular / pantallas angostas) la nav horizontal y el bloque de sesión
 * se ocultan y aparece un botón de hamburguesa a la derecha del logo.
 * Al tocarlo se despliega un panel vertical (arrNavItems + notificaciones
 * + sesión) debajo del header, controlado con el estado local
 * "boolMenuAbierto". El logo siempre queda visible a la izquierda, tanto
 * en desktop como en mobile.
 *
 * CAMBIO (card "Notificaciones" del Inicio): InfoHighlights dispara el
 * evento global "abrir-notificaciones". En desktop, NotificationsMenu lo
 * escucha y se abre solo. En mobile, el NotificationsMenu solo existe
 * con el menú hamburguesa abierto, así que acá el Header abre el menú y
 * le pasa "boolAbiertoInicial" para que nazca desplegado.
 */
const arrNavItems = [
  {
    strTexto: "Inicio",
    strRuta: "/inicio",
    svgIcono: (
      <>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
  },
  {
    strTexto: "Exámenes",
    strRuta: "/examenes",
    svgIcono: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
  },
];

function NavItem({ strTexto, strRuta, svgIcono, boolActivo = false, fnAlHacerClick, boolVersionMobile = false }) {
  return (
    <Link
      to={strRuta}
      onClick={fnAlHacerClick}
      className={`relative flex items-center gap-2.5 text-sm whitespace-nowrap cursor-pointer ${
        boolVersionMobile ? "w-full py-2" : "h-full"
      } ${boolActivo ? "font-extrabold text-[#123F7B]" : "text-[#294B7C]"}`}
    >
      <svg
        className="w-5 h-5 stroke-[#123F7B] fill-none stroke-[1.8]"
        viewBox="0 0 24 24"
      >
        {svgIcono}
      </svg>
      {textoInterfaz(strTexto)}
      {boolActivo && !boolVersionMobile && (
        <span className="absolute bottom-[26px] left-0 right-0 h-1 rounded-[5px] bg-[linear-gradient(90deg,#2563EB,#D93856)]" />
      )}
      {boolActivo && boolVersionMobile && (
        <span className="absolute left-0 top-0 bottom-0 w-1 rounded-[5px] bg-[linear-gradient(180deg,#2563EB,#D93856)]" />
      )}
    </Link>
  );
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const usuarioActual = obtenerUsuarioActual();
  const boolAutenticado = Boolean(obtenerToken() && usuarioActual);
  const [boolMenuAbierto, setBoolMenuAbierto] = useState(false);
  const [boolAbrirNotifMobile, setBoolAbrirNotifMobile] = useState(false);
  const [modalLogout, setModalLogout] = useState({ visible: false, mensaje: "" });
  const [contrasenaAbierta, setContrasenaAbierta] = useState(false);

  const fnCerrarSesion = async () => {
    let pend = 0;
    const u = obtenerUsuarioActual();
    const uId = u?.idUsuario ?? u?.id;
    try {
      const { asistenciaRepo } = await import("../../offline/asistenciaRepo.js");
      pend = await asistenciaRepo.contarPendientes(null, { operadorId: uId ? String(uId) : null });
    } catch {}

    if (pend > 0) {
      setModalLogout({
        visible: true,
        mensaje: `Quedan ${pend} marcas sin enviar. Solo se enviarán cuando vuelvas a iniciar sesión con ESTA misma cuenta.`,
      });
      setBoolMenuAbierto(false);
      return;
    }
    cerrarSesion({ limpiarDatosLocales: true });
    setBoolMenuAbierto(false);
    navigate("/login");
  };

  const fnConfirmarLogoutConPendientes = () => {
    setModalLogout({ visible: false, mensaje: "" });
    cerrarSesion({ limpiarDatosLocales: true });
    setBoolMenuAbierto(false);
    navigate("/login");
  };

  const fnAlternarMenu = () => setBoolMenuAbierto((boolPrev) => !boolPrev);
  const fnCerrarMenu = () => setBoolMenuAbierto(false);

  // Pedido desde la card "Notificaciones" del Inicio (solo mobile: en desktop
  // el propio NotificationsMenu escucha el evento y se abre)
  useEffect(() => {
    const fnAbrirNotif = () => {
      if (window.matchMedia("(min-width: 768px)").matches) return;
      setBoolAbrirNotifMobile(true);
      setBoolMenuAbierto(true);
    };
    window.addEventListener("abrir-notificaciones", fnAbrirNotif);
    return () => window.removeEventListener("abrir-notificaciones", fnAbrirNotif);
  }, []);

  // Al cerrarse el menú mobile, la próxima vez que se abra no debe nacer
  // con las notificaciones desplegadas
  useEffect(() => {
    if (!boolMenuAbierto) setBoolAbrirNotifMobile(false);
  }, [boolMenuAbierto]);

  const navItems = arrNavItems.map(item => item.strTexto === "Inicio" && boolAutenticado
    ? { ...item, strRuta: obtenerRutaPorRol(usuarioActual.rol) } : item);

  // Activo si la URL es exactamente la ruta del ítem o una sub-ruta suya
  const fnEsActivo = (strRuta) =>
    location.pathname === strRuta || location.pathname.startsWith(`${strRuta}/`);

  return (
    <header className="relative flex items-center h-[70px] md:h-[98px] px-5 md:px-[55px] bg-white/72 border-b border-[#E2E8F0]/75">
      <Logo />

      {/* Nav principal: solo visible desde "md" hacia arriba */}
      <nav
        className="hidden md:flex ml-auto items-center gap-4 lg:gap-8 h-full"
        aria-label="Navegación principal"
      >
        {navItems.map((item) => (
          <NavItem
            key={item.strTexto}
            {...item}
            boolActivo={fnEsActivo(item.strRuta)}
          />
        ))}

        {/* Notificaciones: ventanita desplegable (ya no es una ruta) */}
        <NotificationsMenu key={usuarioActual?.idUsuario ?? "invitado"} />
      </nav>

      {/* Bloque de sesión: solo visible desde "md" hacia arriba */}
      <div className="hidden md:flex min-w-0 ml-4 pl-4 lg:ml-8 lg:pl-8 h-full items-center border-l border-[#CBD5E1]">
        {boolAutenticado ? (
          <UserAccountMenu usuario={usuarioActual} onCerrarSesion={fnCerrarSesion} onCambiarContrasena={() => setContrasenaAbierta(true)} />
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center h-10 px-5 rounded-md bg-primary-navy text-white text-sm font-extrabold whitespace-nowrap transition-colors duration-200 hover:bg-primary-blue"
          >
            Iniciar sesión
          </Link>
        )}
      </div>

      {/* Botón de hamburguesa: solo visible por debajo de "md" */}
      <button
        type="button"
        onClick={fnAlternarMenu}
        className="ml-auto md:hidden inline-flex items-center justify-center w-10 h-10 shrink-0"
        aria-label={boolMenuAbierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={boolMenuAbierto}
        aria-controls="header-menu-mobile"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[#123F7B] fill-none stroke-[2]">
          {boolMenuAbierto ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <>
              <path d="M4 7h16" strokeLinecap="round" />
              <path d="M4 12h16" strokeLinecap="round" />
              <path d="M4 17h16" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* Panel desplegable con la nav + sesión, solo en mobile */}
      {boolMenuAbierto && (
        <div
          id="header-menu-mobile"
          className="absolute top-full left-0 right-0 md:hidden bg-white border-b border-[#E2E8F0]/75 shadow-lg flex flex-col px-5 py-4 gap-1 z-50 max-h-[calc(100vh-70px)] overflow-y-auto"
        >
          {navItems.map((item) => (
            <NavItem
              key={item.strTexto}
              {...item}
              boolActivo={fnEsActivo(item.strRuta)}
              boolVersionMobile
              fnAlHacerClick={fnCerrarMenu}
            />
          ))}

          {/* Notificaciones: en mobile la lista se expande en línea */}
          <NotificationsMenu key={usuarioActual?.idUsuario ?? "invitado"} boolVersionMobile boolAbiertoInicial={boolAbrirNotifMobile} />

          <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
            {boolAutenticado ? (
              <UserAccountMenu usuario={usuarioActual} onCerrarSesion={fnCerrarSesion} onCambiarContrasena={() => setContrasenaAbierta(true)} />
            ) : (
              <Link
                to="/login"
                onClick={fnCerrarMenu}
                className="inline-flex items-center h-10 px-5 rounded-md bg-primary-navy text-white text-sm font-extrabold whitespace-nowrap transition-colors duration-200 hover:bg-primary-blue"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      )}

      {boolAutenticado && <FlujoCambioContrasena
        key={usuarioActual.idUsuario ?? usuarioActual.id ?? usuarioActual.correo}
        usuario={usuarioActual}
        abierto={contrasenaAbierta}
        onAbrir={() => setContrasenaAbierta(true)}
        onCerrar={() => setContrasenaAbierta(false)}
        onCerrarSesion={fnCerrarSesion}
      />}

      <ModalCierreSesion
        visibleConfirm={modalLogout.visible}
        mensajeConfirm={modalLogout.mensaje}
        onConfirmar={fnConfirmarLogoutConPendientes}
        onCancelar={() => setModalLogout({ visible: false, mensaje: "" })}
      />
    </header>
  );
}
