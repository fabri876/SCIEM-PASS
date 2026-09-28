import Header from "../components/layout/Header";
import HeroBanner from "../components/common/HeroBanner";
import RegistroForm from "../components/registro/RegistroForm";

/**
 * RegistroPage.jsx
 *
 * Pantalla completa de Registro. Solo arma el layout combinando el
 * Header y las dos secciones del contenido (HeroBanner + RegistroForm);
 * no tiene lógica propia, por eso vive en pages/ y no en components/,
 * tal como lo describe el documento de arquitectura del equipo.
 *
 * Sobre el ancho fijo del mockup original (.page { width:1536px }):
 * lo cambié por "max-w-[1536px] mx-auto" y el grid de dos columnas pasa
 * a una sola columna en pantallas angostas (grid-cols-1 lg:grid-cols-...).
 * Así se mantiene igual al diseño en una pantalla de laptop/escritorio
 * (el uso real: el personal de control usando esto en una computadora),
 * pero no se rompe si alguien lo abre en una ventana más chica.
 */
export default function RegistroPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-app bg-[radial-gradient(circle_at_94%_92%,rgba(217,56,86,.12),transparent_18%),radial-gradient(circle_at_4%_78%,rgba(37,99,235,.10),transparent_15%)]">
      <div className="max-w-[1536px] mx-auto relative">
        <Header strRutaActiva="Inicio" />

        <div className="grid grid-cols-1 lg:grid-cols-[594px_1fr] gap-[23px] px-[55px] pt-9 pb-[60px]">
          <HeroBanner />
          <RegistroForm />
        </div>

        {/* Formas decorativas de fondo, iguales a las del mockup original */}
        <div className="absolute w-[190px] h-[190px] right-[-70px] bottom-[-75px] rotate-45 rounded-[25px] bg-[linear-gradient(135deg,rgba(37,99,235,.12),rgba(217,56,86,.12))] pointer-events-none" />
        <div className="absolute w-[90px] h-[90px] left-[-38px] bottom-0 rotate-45 bg-primary-blue/8 pointer-events-none" />
      </div>
    </main>
  );
}
