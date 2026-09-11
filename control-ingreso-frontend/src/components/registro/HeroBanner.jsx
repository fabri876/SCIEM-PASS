import strFotoHero from "../../assets/images/registro-hero.png";

/**
 * HeroBanner.jsx
 *
 * Panel izquierdo de la pantalla de Registro: la foto, el degradé
 * diagonal encima, el título, la bajada y los tres "beneficios"
 * (Seguro / Rápido / Confiable).
 *
 * La imagen de fondo venía embebida como base64 dentro del <style> del
 * mockup (una sola línea de ~70 000 caracteres). La saqué a un archivo
 * de imagen real en src/assets/images/registro-hero.jpg e importada acá
 * como cualquier imagen de un proyecto Vite — así el repo no arrastra
 * ese base64 gigante en cada archivo que la necesite.
 *
 * "arrBeneficios" es la lista de los tres bloques de la derecha del
 * hero. Está armado como array para no repetir tres veces casi el mismo
 * bloque de <article>.
 */
const arrBeneficios = [
  {
    strTitulo: "Seguro",
    strTexto: "Tus datos protegidos",
    svgPath: (
      <>
        <path d="M16 3 27 7v8c0 7-4.4 11.4-11 14-6.6-2.6-11-7-11-14V7l11-4Z" />
        <path d="m11 16 3 3 7-8" />
      </>
    ),
  },
  {
    strTitulo: "Rápido",
    strTexto: "Sin complicaciones",
    svgPath: <path d="m18 2-9 16h7l-2 12 9-16h-7l2-12Z" />,
  },
  {
    strTitulo: "Confiable",
    strTexto: "Siempre disponible",
    svgPath: (
      <>
        <path d="M9 14V9a4 4 0 0 1 8 0v5" />
        <path d="M9 14H5l-1 9h18l-1-9h-4" />
        <path d="M20 12c3 0 5 2 6 5" />
        <path d="M12 18h.01" />
      </>
    ),
  },
];

export default function HeroBanner() {
  return (
    <section className="relative h-[780px] rounded-[10px] overflow-hidden text-white shadow-[0_10px_35px_rgba(15,23,42,0.10)] bg-primary-navy">
      {/* Foto de fondo, recortada a los primeros 390px de alto */}
      <div
        className="absolute inset-x-0 top-0 h-[390px] bg-cover bg-center after:absolute after:inset-0 after:bg-[linear-gradient(180deg,rgba(15,23,42,.02),rgba(15,23,42,.20))]"
        style={{ backgroundImage: `url(${strFotoHero})`, filter: "saturate(.9)" }}
      />

      {/* Franja diagonal con el degradé de marca, sobre la mitad inferior */}
      <div
        className="absolute inset-x-0 top-[280px] bottom-0 bg-[image:var(--gradient-banner)]"
        style={{ clipPath: "polygon(0 18%, 100% 0, 100% 100%, 0 100%)" }}
      />

      <div className="absolute left-[50px] right-10 bottom-10">
        <h1 className="text-[40px] leading-[1.15] font-extrabold text-white mb-[17px]">
          Tu futuro académico
          <br />
          comienza <span className="text-[#FF5873]">aquí</span>
        </h1>
        <p className="text-lg leading-[1.5] text-white mb-[43px] max-w-[480px]">
          Regístrate en SCIEM-PASS y accede a un sistema seguro, rápido y
          confiable para la gestión de exámenes.
        </p>

        <div className="grid grid-cols-3">
          {arrBeneficios.map((beneficio, index) => (
            <article
              key={beneficio.strTitulo}
              className={`pr-[22px] ${index < arrBeneficios.length - 1
                  ? "border-r border-white/28"
                  : ""
                } ${index > 0 ? "pl-[25px]" : ""}`}
            >
              <svg
                className="w-[33px] h-[33px] stroke-white fill-none stroke-[1.8] mb-2.5"
                viewBox="0 0 32 32"
              >
                {beneficio.svgPath}
              </svg>
              <h3 className="text-white text-[17px] font-extrabold m-0">
                {beneficio.strTitulo}
              </h3>
              <p className="text-white text-[13px] leading-[1.35] mt-1">
                {beneficio.strTexto}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
