/**
 * InfoHighlights.jsx
 *
 * Fila de 3 tarjetas informativas debajo del WelcomeBanner ("información
 * sobre el sistema", bonita pero simple). Los íconos de Exámenes y
 * Notificaciones son los mismos que ya usa el Header, para que se
 * sientan consistentes en toda la app; el de Resultados es nuevo acá
 * (no está en el menú principal, pero tiene sentido como highlight de
 * lo que ofrece el sistema).
 */
const arrDestacados = [
  {
    strTitulo: "Exámenes",
    strTexto: "Consulta fechas, aulas y horarios de tus próximos exámenes.",
    svgIcono: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
  },
  {
    strTitulo: "Resultados",
    strTexto: "Accede a tus calificaciones apenas se publican.",
    svgIcono: <path d="M5 20V10M12 20V4M19 20v-7" />,
  },
  {
    strTitulo: "Notificaciones",
    strTexto: "Entérate al instante de cualquier cambio o aviso importante.",
    svgIcono: (
      <>
        <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  },
];

export default function InfoHighlights() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
      {arrDestacados.map((destacado) => (
        <article
          key={destacado.strTitulo}
          className="bg-bg-card border border-border rounded-[14px] p-6 flex flex-col items-start gap-3 shadow-[0_6px_20px_rgba(15,23,42,0.05)]"
        >
          <span className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-primary-blue/10 text-primary-blue">
            <svg
              className="w-5 h-5 stroke-current fill-none stroke-[1.8]"
              viewBox="0 0 24 24"
            >
              {destacado.svgIcono}
            </svg>
          </span>
          <h3 className="text-[17px] font-extrabold text-primary-navy m-0">
            {destacado.strTitulo}
          </h3>
          <p className="text-[14px] leading-[1.5] text-text-body m-0">
            {destacado.strTexto}
          </p>
        </article>
      ))}
    </div>
  );
}
