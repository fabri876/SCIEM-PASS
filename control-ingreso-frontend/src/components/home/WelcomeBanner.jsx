/**
 * WelcomeBanner.jsx
 *
 * Banner principal de la Home: usa el mismo degradé de marca
 * (--gradient-banner) que ya usa HeroBanner en Registro/Login, para que
 * la Home se sienta parte del mismo sistema visual en vez de una
 * pantalla aparte. Es texto fijo por ahora (bienvenida institucional +
 * bajada sobre qué es SCIEM-PASS); si más adelante quieren que cambie
 * según el usuario logueado, esto se puede volver props fácilmente.
 */
export default function WelcomeBanner() {
  return (
    <section className="relative overflow-hidden rounded-[10px] text-white shadow-[0_10px_35px_rgba(15,23,42,0.10)] bg-[image:var(--gradient-banner)] px-[50px] py-[64px] text-center">
      <span className="inline-block text-xs font-extrabold tracking-[2px] uppercase text-white/70 mb-5">
        Universidad Mayor de San Simón · Facultad de Ciencias y Tecnología
      </span>

      <h1 className="text-[40px] leading-[1.15] font-extrabold mb-4">
        Bienvenido a <span className="text-[#FF5873]">SCIEM-PASS</span>
      </h1>

      <p className="text-lg leading-[1.6] text-white/90 max-w-[720px] mx-auto">
        El sistema de control de ingreso a exámenes de la Facultad
        de Ciencias y Tecnología. Gestiona tus exámenes, consulta resultados
        y mantente al tanto de cada convocatoria, todo desde un mismo lugar.
      </p>
    </section>
  );
}
