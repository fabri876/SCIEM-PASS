/**
 * SystemCard.jsx
 *
 * Una fila de la sección "Sistemas que te pueden servir": el botón
 * (ícono + nombre, ya armado para redirigir) a la izquierda, y la
 * descripción a la derecha. El link real todavía no está definido —
 * por eso "strUrl" por defecto es "#" — así que apenas tengan las URLs
 * reales, solo hay que completar "strUrl" en cada objeto del array de
 * SystemsSection.jsx, no hace falta tocar este archivo.
 *
 * target="_blank" porque son sistemas externos (fuera de SCIEM-PASS);
 * si alguno debiera abrir en la misma pestaña, se puede sacar esa prop
 * para ese ítem puntual.
 *
 * "boolInvertido": cuando es true, el botón pasa al lado derecho y la
 * descripción al izquierdo (en pantallas sm+), para que la sección no
 * se vea como una fila repetida de botones. SystemsSection.jsx se
 * encarga de alternarlo automáticamente según la posición del sistema
 * en el array (impar = invertido).
 */
export default function SystemCard({
  strNombre,
  svgIcono,
  strDescripcion,
  strUrl = "#",
  boolInvertido = false,
}) {
  return (
    <div
      className={`flex flex-col items-center sm:items-start gap-7 py-7 ${
        boolInvertido ? "sm:flex-row-reverse" : "sm:flex-row"
      }`}
    >
      <a
        href={strUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex-none w-[160px] h-[112px] flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-primary-navy text-primary-navy font-extrabold text-sm tracking-[0.5px] transition-all duration-300 hover:bg-primary-navy hover:text-white hover:shadow-[0_0_22px_4px_rgba(37,99,235,0.35)]"
      >
        <svg
          className="w-8 h-8 stroke-current fill-none stroke-[1.6]"
          viewBox="0 0 32 32"
        >
          {svgIcono}
        </svg>
        {strNombre}
      </a>

      <p
        className={`flex-1 text-[15px] leading-[1.6] text-text-body text-center sm:pt-2 ${
          boolInvertido ? "sm:text-right" : "sm:text-left"
        }`}
      >
        {strDescripcion || "Descripción pendiente."}
      </p>
    </div>
  );
}
