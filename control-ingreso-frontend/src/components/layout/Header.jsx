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
    strTexto: "Mis exámenes",
    svgIcono: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
  },
  {
    strTexto: "Resultados",
    svgIcono: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
      </>
    ),
  },
  {
    strTexto: "Reportes",
    svgIcono: <path d="M5 20V10M12 20V4M19 20v-7" />,
  },
];

const arrNavItemsSecundarios = [
  {
    strTexto: "Preguntas frecuentes",
    svgIcono: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.6 2.6 0 1 1 4.7 1.6c-.9 1-2.2 1.2-2.2 2.8" />
        <path d="M12 17h.01" />
      </>
    ),
  },
  {
    strTexto: "Soporte técnico",
    svgIcono: (
      <>
        <path d="M6 15v-4a6 6 0 0 1 12 0v4" />
        <path d="M4 14h2v5H4zM18 14h2v5h-2z" />
        <path d="M20 19c0 2-3 2-5 2" />
      </>
    ),
  },
];

function NavItem({ strTexto, svgIcono, boolActivo = false }) {
  return (
    <div
      className={`relative flex items-center gap-2.5 h-full text-sm whitespace-nowrap ${
        boolActivo ? "font-extrabold text-[#123F7B]" : "text-[#294B7C]"
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

        <div className="h-[30px] border-l border-[#CBD5E1]" />

        {arrNavItemsSecundarios.map((item) => (
          <NavItem key={item.strTexto} {...item} />
        ))}
      </nav>
    </header>
  );
}
