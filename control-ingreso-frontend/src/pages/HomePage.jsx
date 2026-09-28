import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import WelcomeBanner from "../components/home/WelcomeBanner";
import InfoHighlights from "../components/home/InfoHighlights";
import SystemsSection from "../components/home/SystemsSection";

/**
 * HomePage.jsx
 *
 * Pantalla de inicio, ya con sesión iniciada (mantiene el Header con
 * "Inicio" marcado como activo). Arriba: WelcomeBanner (bienvenida +
 * qué es el sistema) e InfoHighlights (3 datos rápidos del sistema).
 * Después: SystemsSection, los accesos a otros sistemas de la
 * universidad — ver el TODO en components/home/SystemsSection.jsx para
 * completar los links y descripciones reales. Al final, el Footer.
 *
 * El Footer queda FUERA del "max-w-[1536px] mx-auto" a propósito, para
 * que ocupe todo el ancho de la pantalla como una barra de pie de
 * página normal, en vez de quedar centrado con el mismo ancho máximo
 * que el resto del contenido.
 *
 * Mismo fondo con degradé radial sutil que ya usan RegistroPage y
 * LoginPage, para que las tres pantallas se sientan parte de la misma
 * app.
 */
export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-app bg-[radial-gradient(circle_at_94%_92%,rgba(217,56,86,.10),transparent_18%),radial-gradient(circle_at_4%_78%,rgba(37,99,235,.08),transparent_15%)] flex flex-col">
      <div className="max-w-[1536px] mx-auto relative w-full flex-1">
        <Header strRutaActiva="Inicio" />

        <div className="px-[55px] pt-9 pb-[70px]">
          <WelcomeBanner />
          <InfoHighlights />
          <SystemsSection />
        </div>
      </div>

      <Footer />
    </main>
  );
}
