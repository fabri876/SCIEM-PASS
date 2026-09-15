import strFotoHero from "../../assets/images/registro-hero.png";

/**
 * HeroBanner.jsx
 *
 * Panel izquierdo de Registro y Login: el título, la bajada y los tres
 * "beneficios" (Seguro / Rápido / Confiable) se comparten entre las dos
 * pantallas — por eso vive en components/common. Lo que sí cambia entre
 * ellas es la foto de fondo:
 *
 * - Registro (boolShowPhoto=true, default): mantiene el diseño original
 *   — foto recortada arriba + franja diagonal con el degradé de marca
 *   encima, contenido pegado abajo.
 * - Login (boolShowPhoto=false): sin foto, el panel entero es el
 *   degradé de marca, y el contenido queda centrado verticalmente en
 *   vez de pegado abajo (hay más espacio disponible sin la foto, así
 *   que se agrega una bajada institucional arriba y un párrafo extra).
 *
 * La imagen de fondo (solo se usa cuando boolShowPhoto=true) venía
 * embebida como base64 dentro del <style> del mockup original. La
 * extraje a un archivo real en src/assets/images/registro-hero.jpg.
 *
 * "arrBeneficios" es la lista de los tres bloques de la derecha del
 * hero, armada como array para no repetir tres veces casi el mismo
 * bloque de <article>. Se renderiza igual en ambas variantes, así que
 * queda factorizada en "elBloqueBeneficios" más abajo.
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

export default function HeroBanner({
  title = (
    <>
      Tu futuro académico
      <br />
      comienza <span className="text-[#FF5873]">aquí</span>
    </>
  ),
  subtitle = "Regístrate en SCIEM-PASS y accede a un sistema seguro, rápido y confiable para la gestión de exámenes.",
  boolShowPhoto = true,
}) {
  const elBloqueBeneficios = (
    <div className="grid grid-cols-3 gap-x-2">
      {arrBeneficios.map((beneficio, index) => (
        <article
          key={beneficio.strTitulo}
          className={`pr-[22px] ${index < arrBeneficios.length - 1 ? "border-r border-white/28" : ""
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
  );

  return (
    <section className="relative h-[780px] rounded-[10px] overflow-hidden text-white shadow-[0_10px_35px_rgba(15,23,42,0.10)] bg-primary-navy">
      {boolShowPhoto ? (
        <>
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
              {title}
            </h1>
            <p className="text-lg leading-[1.5] text-white mb-[43px] max-w-[480px]">
              {subtitle}
            </p>
            {elBloqueBeneficios}
          </div>
        </>
      ) : (
        <>
          {/* Sin foto: el degradé de marca cubre todo el panel */}
          <div className="absolute inset-0 bg-[image:var(--gradient-banner)]" />

          <div className="relative h-full flex flex-col justify-center gap-9 px-[50px] py-16">
            <div>
              <span className="inline-block text-xs font-extrabold tracking-[2px] uppercase text-white/70 mb-5">
                - Universidad Mayor de San Simón -
              </span>
              <h1 className="text-[40px] leading-[1.15] font-extrabold text-white mb-[17px]">
                {title}
              </h1>
              <p className="text-lg leading-[1.5] text-white/90 mb-4 max-w-[480px]">
                {subtitle}
              </p>
              <p className="text-[15px] leading-[1.6] text-white/70 max-w-[460px]">
                Un solo lugar para gestionar tus exámenes, revisar resultados y
                recibir notificaciones — sin filas ni papeleo de por medio.
              </p>
            </div>

            {elBloqueBeneficios}
          </div>
        </>
      )}
    </section>
  );
}
