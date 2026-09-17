import Header from "../components/layout/Header";
import HeroBanner from "../components/common/HeroBanner";
import LoginForm from "../components/login/LoginForm";

/**
 * LoginPage.jsx
 *
 * Pantalla completa de Login. Mismo layout que RegistroPage.jsx
 * (Header + HeroBanner + tarjeta de formulario), reutilizando el mismo
 * HeroBanner común pero con su propio título y bajada para esta
 * pantalla (ver props title/subtitle).
 *
 * strRutaActiva="" para que el Header no marque "Inicio" como activo
 * acá: Login no es ninguno de los ítems del menú principal.
 */
export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-app bg-[radial-gradient(circle_at_94%_92%,rgba(217,56,86,.12),transparent_18%),radial-gradient(circle_at_4%_78%,rgba(37,99,235,.10),transparent_15%)]">
      <div className="max-w-[1536px] mx-auto relative">
        <Header strRutaActiva="" />

        <div className="grid grid-cols-1 lg:grid-cols-[594px_1fr] gap-[23px] px-[55px] pt-9 pb-[60px]">
          <HeroBanner
            boolShowPhoto={false}
            title={
              <>
                Bienvenido
                <br />
                de <span className="text-[#FF5873]">vuelta</span>
              </>
            }
            subtitle="Inicia sesión en SCIEM-PASS y continúa con tu cuenta de forma segura y rápida."
          />
          <LoginForm />
        </div>

        {/* Formas decorativas de fondo, iguales a las de RegistroPage */}
        <div className="absolute w-[190px] h-[190px] right-[-70px] bottom-[-75px] rotate-45 rounded-[25px] bg-[linear-gradient(135deg,rgba(37,99,235,.12),rgba(217,56,86,.12))] pointer-events-none" />
        <div className="absolute w-[90px] h-[90px] left-[-38px] bottom-0 rotate-45 bg-primary-blue/8 pointer-events-none" />
      </div>
    </main>
  );
}
