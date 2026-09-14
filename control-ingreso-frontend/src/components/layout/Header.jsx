import Logo from "../common/Logo";

/**
 * Header.jsx
 *
 * Barra superior con el logo y la navegación principal. No es algo
 * exclusivo de la pantalla de Registro: en el mockup ya se ve pensada
 * para repetirse en Login, Dashboard, etc. Por eso vive en
 * components/layout y no en components/registro.
 *
 * "arrNavItems" guarda los datos de cada link (texto + ícono) para no
 * repetir seis veces casi el mismo bloque de JSX. Cada ícono es el mismo
 * SVG del mockup original, solo que factorizado en un array.
 *
 * Por ahora "Inicio" queda marcado como activo a mano (strRutaActiva),
 * tal como estaba en el mockup estático. Cuando el equipo defina el
 * router (React Router u otro), esto se puede reemplazar por la ruta
 * actual real.
 *
 * "Cuenta" (extremo derecho, después del separador) todavía NO está
 * implementado a propósito — es solo el espacio reservado para el día
 * que se arme esa pantalla/menú (probablemente con el avatar o nombre
 * del usuario logueado). No tiene ícono activo ni lógica de ruta como
 * los demás ítems.
 */
const arrNavItems = [
  {
    strTexto: "Inicio",
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
    svgIcono: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
  },
  {
    strTexto: "Noticias",
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
    svgIcono: (
      <>
        <rect x="4" y="4" width="16" height="17" rx="1" />
        <path d="M9 21v-5h6v5M9 8h1M14 8h1M9 12h1M14 12h1" />
      </>
    ),
  },
  {
    strTexto: "Notificaciones",
    svgIcono: (
      <>
        <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  },
];

function NavItem({ strTexto, svgIcono, boolActivo = false }) {
  return (
    <div
      className={`relative flex items-center gap-2.5 h-full text-sm whitespace-nowrap ${boolActivo ? "font-extrabold text-[#123F7B]" : "text-[#294B7C]"
        }`}
    >
      <svg
        className="w-5 h-5 stroke-[#123F7B] fill-none stroke-[1.8]"
        viewBox="0 0 24 24"
      >
        {svgIcono}
      </svg>
      {strTexto}
      {boolActivo && (
        <span className="absolute bottom-[26px] left-0 right-0 h-1 rounded-[5px] bg-[linear-gradient(90deg,#2563EB,#D93856)]" />
      )}
    </div>
  );
}

export default function Header({ strRutaActiva = "Inicio" }) {
  return (
    <header className="h-[98px] flex items-center px-[55px] bg-white/72 border-b border-[#E2E8F0]/75">
      <Logo />

      <nav
        className="ml-auto flex items-center gap-[38px] h-full"
        aria-label="Navegación principal"
      >
        {arrNavItems.map((item) => (
          <NavItem
            key={item.strTexto}
            {...item}
            boolActivo={item.strTexto === strRutaActiva}
          />
        ))}
      </nav>

      <div className="ml-10 pl-10 h-full flex items-center border-l border-[#CBD5E1]">
        {/* TODO: acá va "Cuenta" cuando se implemente (avatar/nombre del
            usuario + menú). Por ahora es solo el espacio reservado. */}
        <span className="text-sm font-semibold text-[#294B7C] whitespace-nowrap">
          Cuenta
        </span>
      </div>
    </header>
  );
}
