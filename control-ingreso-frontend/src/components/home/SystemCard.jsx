import { textoInterfaz } from '../../utils/textoInterfaz.js';
/**
 * SystemCard.jsx
 *
 * Una tarjeta de la sección "Sistemas que te pueden servir": el botón
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
 * Antes esto se alternaba (botón izquierda/derecha) con una prop
 * "boolInvertido", pero desde que SystemsSection.jsx pasó a un grid de
 * 2 columnas eso ya no hace falta: el propio grid pone una tarjeta a la
 * izquierda y otra a la derecha en cada fila, así que cada tarjeta
 * individual siempre se arma igual (botón + descripción).
 */
export default function SystemCard({
  strNombre,
  svgIcono,
  strDescripcion,
  strUrl = "#",
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
      <a
        href={strUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex-none w-[128px] h-[92px] flex flex-col items-center justify-center gap-1.5 rounded-[12px] border-2 border-primary-navy text-primary-navy font-extrabold text-xs tracking-[0.5px] transition-all duration-300 hover:bg-primary-navy hover:text-white hover:shadow-[0_0_20px_4px_rgba(37,99,235,0.35)]"
      >
        <svg
          className="w-7 h-7 stroke-current fill-none stroke-[1.6]"
          viewBox="0 0 32 32"
        >
          {svgIcono}
        </svg>
        {textoInterfaz(strNombre)}
      </a>

      <p className="flex-1 text-[14px] leading-[1.6] text-text-body text-center sm:text-left sm:pt-1.5">
        {strDescripcion || "Descripción pendiente."}
      </p>
    </div>
  );
}
