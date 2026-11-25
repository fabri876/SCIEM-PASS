import { textoInterfaz } from '../../utils/textoInterfaz.js';
import { Link } from "react-router-dom";

/**
 * InfoHighlights.jsx
 *
 * Fila de 2 tarjetas informativas debajo del WelcomeBanner. Ahora son
 * funcionales:
 *  - Hover: se levantan un poco y se iluminan alrededor con el azul de
 *    la paleta (primary-blue).
 *  - "Exámenes": es un <Link> que lleva a /examenes.
 *  - "Notificaciones": es un <button> que dispara el evento global
 *    "abrir-notificaciones"; NotificationsMenu (en el Header) escucha ese
 *    evento y abre su ventanita desplegable.
 *  - La tarjeta "Resultados" fue eliminada.
 */

export const EVENTO_ABRIR_NOTIFICACIONES = "abrir-notificaciones";

const strClasesCard =
  "bg-bg-card border border-border rounded-[14px] p-6 flex flex-col items-start gap-3 text-left " +
  "shadow-[0_6px_20px_rgba(15,23,42,0.05)] cursor-pointer " +
  "transition-all duration-300 ease-out " +
  "hover:-translate-y-1.5 hover:border-primary-blue/50 " +
  "hover:shadow-[0_0_0_3px_rgba(37,99,235,0.12),0_12px_32px_rgba(37,99,235,0.28)] " +
  "focus-visible:-translate-y-1.5 focus-visible:border-primary-blue/50 focus-visible:outline-none " +
  "focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.25),0_12px_32px_rgba(37,99,235,0.28)]";

const arrDestacados = [
  {
    strTitulo: "Exámenes",
    strTexto: "Consulta fechas, aulas y horarios de tus próximos exámenes.",
    strRuta: "/examenes",
    svgIcono: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
  },
  {
    strTitulo: "Notificaciones",
    strTexto: "Entérate al instante de cualquier cambio o aviso importante.",
    fnAlHacerClick: () => {
      // Las notificaciones viven en el Header: subimos para que se vean
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_NOTIFICACIONES));
    },
    svgIcono: (
      <>
        <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  },
];

function ContenidoCard({ destacado }) {
  return (
    <>
      <span className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-primary-blue/10 text-primary-blue">
        <svg
          className="w-5 h-5 stroke-current fill-none stroke-[1.8]"
          viewBox="0 0 24 24"
        >
          {destacado.svgIcono}
        </svg>
      </span>
      <h3 className="text-[17px] font-extrabold text-primary-navy m-0">
        {textoInterfaz(destacado.strTitulo)}
      </h3>
      <p className="text-[14px] leading-[1.5] text-text-body m-0">
        {textoInterfaz(destacado.strTexto)}
      </p>
    </>
  );
}

export default function InfoHighlights() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
      {arrDestacados.map((destacado) =>
        destacado.strRuta ? (
          <Link
            key={destacado.strTitulo}
            to={destacado.strRuta}
            className={strClasesCard}
          >
            <ContenidoCard destacado={destacado} />
          </Link>
        ) : (
          <button
            key={destacado.strTitulo}
            type="button"
            onClick={destacado.fnAlHacerClick}
            className={strClasesCard}
          >
            <ContenidoCard destacado={destacado} />
          </button>
        )
      )}
    </div>
  );
}
