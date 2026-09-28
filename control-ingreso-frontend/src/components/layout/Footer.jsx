/**
 * Footer.jsx
 *
 * Pie de página simple, del mismo navy que el borde de las tarjetas de
 * SystemsSection (primary-navy), para que quede como un "cierre" visual
 * consistente con el resto de la Home. Por ahora vive en
 * components/layout (junto a Header.jsx) porque, aunque solo se usa en
 * HomePage por ahora, tiene sentido reutilizarlo en otras páginas más
 * adelante sin tener que moverlo de carpeta.
 */
export default function Footer() {
  return (
    <footer className="bg-primary-navy text-white text-center text-sm font-semibold py-6">
      Desarrollado por Wind Software S.R.L © 2026
      <br />
      Cochabamba - Bolivia
    </footer>
  );
}
