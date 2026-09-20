import Header from "../components/layout/Header";
import WelcomeBanner from "../components/home/WelcomeBanner";
import InfoHighlights from "../components/home/InfoHighlights";
import SystemsSection from "../components/home/SystemsSection";

/**
 * HomePage.jsx
 *
 * Pantalla de inicio, ya con sesión iniciada (mantiene el Header con
 * "Inicio" marcado como activo). Arriba: WelcomeBanner (bienvenida +
 * qué es el sistema) e InfoHighlights (3 datos rápidos del sistema).
 * Abajo: SystemsSection, los accesos a WEBSISS / SAGAA / CAPPUCCINO —
 * ver el TODO en components/home/SystemsSection.jsx para completar los
 * links y descripciones reales.
 *
 * Mismo fondo con degradé radial sutil que ya usan RegistroPage y
 * LoginPage, para que las tres pantallas se sientan parte de la misma
 * app.
 */
export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-app bg-[radial-gradient(circle_at_94%_92%,rgba(217,56,86,.10),transparent_18%),radial-gradient(circle_at_4%_78%,rgba(37,99,235,.08),transparent_15%)]">
      <div className="max-w-[1536px] mx-auto relative">
        <Header strRutaActiva="Inicio" />

        <div className="px-[55px] pt-9 pb-[70px]">
          <WelcomeBanner />
          <InfoHighlights />
          <SystemsSection />
        </div>
      </div>
    </main>
  );
}
