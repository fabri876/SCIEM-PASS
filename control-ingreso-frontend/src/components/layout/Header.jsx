import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../common/Logo";
import UserAccountMenu from "../common/UserAccountMenu";
import { obtenerToken, obtenerUsuarioActual, cerrarSesion } from "../../services/authService";

/**
 * Header.jsx
 *
 * Barra superior con el logo y la navegación principal. No es algo
 * exclusivo de la pantalla de Registro: se repite en Home, Login,
 * Dashboard, etc. Por eso vive en components/layout y no en
 * components/registro.
 *
 * "arrNavItems" guarda los datos de cada link (texto + ícono + ruta)
 * para no repetir seis veces casi el mismo bloque de JSX. Cada ícono es
 * el mismo SVG del mockup original, solo que factorizado en un array.
 *
 * El ítem activo (la rayita de abajo) ya NO se pasa a mano: se calcula
 * comparando la URL actual (useLocation) contra "strRuta" de cada ítem.
 * Las páginas de Exámenes/Noticias/Aulas/Notificaciones todavía no
 * existen — por ahora esas rutas muestran una página en blanco (ver
 * PaginaEnConstruccion.jsx), pero el link y la rayita activa ya
 * funcionan.
 *
 * El extremo derecho muestra "Iniciar sesión" si NO hay sesión iniciada
 * (se fija con obtenerToken()/obtenerUsuarioActual() de authService, igual
 * que ya lo hacen los guards de rutas en App.jsx), o el menú de cuenta
 * (UserAccountMenu: avatar/nombre, "Cambiar contraseña", "Cerrar sesión")
 * si SÍ la hay. Antes cada panel (admin/docente/ayudante/estudiante)
 * renderizaba su propia copia de UserAccountMenu al lado de este Header;
 * ahora vive acá para que salga automáticamente en cualquier pantalla que
 * use este componente, sin duplicarlo panel por panel.
 *
 * RESPONSIVE (nuevo):
 * A partir del breakpoint "md" de Tailwind se ve el diseño original
 * (logo + nav horizontal + sesión, todo en una fila). Por debajo de "md"
 * (celular / pantallas angostas) la nav horizontal y el bloque de sesión
 * se ocultan y aparece un botón de hamburguesa a la derecha del logo.
 * Al tocarlo se despliega un panel vertical (arrNavItems + sesión) debajo
 * del header, controlado con el estado local "boolMenuAbierto". El logo
 * siempre queda visible a la izquierda, tanto en desktop como en mobile.
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
  {
    strTexto: "Noticias",
    strRuta: "/noticias",
    svgIcono: (
      <>
        <rect x="3" y="5" width="14" height="16" rx="1" />
        <path d="M7 9h6M7 13h6M7 17h4" />
        <path d="M17 8h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7" />
      </>
    ),
  },
  {
    strTexto: "Aulas",
    strRuta: "/aulas",
    svgIcono: (
      <>
        <rect x="4" y="4" width="16" height="17" rx="1" />
        <path d="M9 21v-5h6v5M9 8h1M14 8h1M9 12h1M14 12h1" />
      </>
    ),
  },
  {
    strTexto: "Notificaciones",
    strRuta: "/notificaciones",
    svgIcono: (
      <>
        <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
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
      {strTexto}
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

  const fnCerrarSesion = () => {
    cerrarSesion();
    setBoolMenuAbierto(false);
    navigate("/login");
  };

  const fnAlternarMenu = () => setBoolMenuAbierto((boolPrev) => !boolPrev);
  const fnCerrarMenu = () => setBoolMenuAbierto(false);

  return (
    <header className="relative flex items-center h-[70px] md:h-[98px] px-5 md:px-[55px] bg-white/72 border-b border-[#E2E8F0]/75">
      <Logo />

      {/* Nav principal: solo visible desde "md" hacia arriba */}
      <nav
        className="hidden md:flex ml-auto items-center gap-[38px] h-full"
        aria-label="Navegación principal"
      >
        {arrNavItems.map((item) => (
          <NavItem
            key={item.strTexto}
            {...item}
            boolActivo={location.pathname === item.strRuta}
          />
        ))}
      </nav>

      {/* Bloque de sesión: solo visible desde "md" hacia arriba */}
      <div className="hidden md:flex ml-10 pl-10 h-full items-center border-l border-[#CBD5E1]">
        {boolAutenticado ? (
          <UserAccountMenu usuario={usuarioActual} onCerrarSesion={fnCerrarSesion} />
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
          className="absolute top-full left-0 right-0 md:hidden bg-white border-b border-[#E2E8F0]/75 shadow-lg flex flex-col px-5 py-4 gap-1 z-50"
        >
          {arrNavItems.map((item) => (
            <NavItem
              key={item.strTexto}
              {...item}
              boolActivo={location.pathname === item.strRuta}
              boolVersionMobile
              fnAlHacerClick={fnCerrarMenu}
            />
          ))}

          <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
            {boolAutenticado ? (
              <UserAccountMenu usuario={usuarioActual} onCerrarSesion={fnCerrarSesion} />
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
    </header>
  );
}
