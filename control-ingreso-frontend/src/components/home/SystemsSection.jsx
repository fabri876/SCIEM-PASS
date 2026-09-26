import SystemCard from "./SystemCard";

/**
 * SystemsSection.jsx
 *
 * La sección de abajo de la Home: encabezado + los accesos a otros
 * sistemas de la universidad. "arrSistemas" es donde va todo lo que
 * falta completar de tu lado:
 *   - strUrl: el link real de cada sistema (por ahora "#").
 *   - strDescripcion: el texto descriptivo de cada uno (por ahora
 *     vacío — SystemCard muestra "Descripción pendiente." si está así).
 *
 * ⚠️ Las descripciones de WEBSISS, SAGAA y CAPPUCCINO quedaron vacías
 * en esta versión — no tengo el texto que ya habías escrito para esas
 * tres (nunca me pasaste ese archivo actualizado), así que hay que
 * volver a pegarlas ahí abajo antes de usar este archivo.
 *
 * Layout: arSistemas se agrupa de a 2 en "arrFilas" y se renderiza como
 * un grid de 2 columnas por fila, con una línea de color (el mismo
 * degradé de marca que ya usan los botones de Registro/Login) antes de
 * la primera fila, entre cada fila, y después de la última — esas
 * líneas de paso separan visualmente esta sección del resto de la Home
 * (InfoHighlights arriba, Footer abajo).
 */
const arrSistemas = [
  {
    strNombre: "WEBSISS",
    strUrl: "https://websis.umss.edu.bo/",
    strDescripcion: "Plataforma de gestión académica para estudiantes y docentes de la UMSS, donde se comunican calificaciones, horarios, inscripciones y diferentes actividades académicas.",
    svgIcono: (
      <>
        <rect x="4" y="6" width="24" height="15" rx="2" />
        <path d="M2 25h28" />
      </>
    ),
  },
  {
    strNombre: "SAGAA",
    strUrl: "https://sagaa.fcyt.umss.edu.bo/",
    strDescripcion: "Página de gestión académica para estudiantes y docentes, donde podrás encontrar información sobre posgrados, pregrados, laboratorios y más.",
    svgIcono: (
      <>
        <rect x="8" y="4" width="16" height="24" rx="2" />
        <path d="M12 4v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4" />
        <path d="M12 17l3 3 5-6" />
      </>
    ),
  },
  {
    strNombre: "CAPPUCCINO",
    strUrl: "https://cappuccino.scesi.dev/",
    strDescripcion: "Plataforma de planificación y organización de horarios para estudiantes de la UMSS, desarrollado por estudiantes de la universidad.",
    svgIcono: (
      <>
        <rect x="2" y="7" width="19" height="18" rx="2" />
        <path d="M2 13h19" />
        <path d="M7.5 4v6M15.5 4v6" />
        <path d="M19 18h9v6a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3v-6Z" />
        <path d="M28 20h1.5a2 2 0 0 1 0 4H28" />
        <path d="M22 15c.6.7.6 1.3 0 2M25.5 15c.6.7.6 1.3 0 2" />
      </>
    ),
  },
  {
    strNombre: "UMSS",
    strUrl: "https://www.umss.edu.bo/",
    strDescripcion: "Página oficial de la Universidad Mayor de San Simón, donde podrás encontrar información sobre la universidad, carreras, eventos y mucho más.",
    svgIcono: (
      // Globo terráqueo: representa la web/portal institucional principal
      <>
        <circle cx="16" cy="16" r="12" />
        <path d="M4 16h24M16 4c4 4 4 20 0 24M16 4c-4 4-4 20 0 24" />
      </>
    ),
  },
  {
    strNombre: "FCyT",
    strUrl: "https://www.fcyt.umss.edu.bo/",
    strDescripcion: "Página oficial de la Facultad de Ciencias y Tecnología de la UMSS, donde podrás encontrar información sobre la facultad, carreras, eventos, normativas y diferentes actividades académicas.",
    svgIcono: (
      // Matraz: representa Ciencias (y por extensión, la Facultad)
      <>
        <path d="M13 4h6" />
        <path d="M14 4v7l-7 13a2 2 0 0 0 1.8 3h14.4a2 2 0 0 0 1.8-3l-7-13V4" />
        <path d="M10 20h12" />
      </>
    ),
  },
  {
    strNombre: "Calendario",
    strUrl: "https://www.fcyt.umss.edu.bo/calendario-academico-detallado-fcyt-1-2026/",
    strDescripcion: "Calendario y comunicados oficiales de la UMSS, para mantenerte informado sobre las fechas importantes de la universidad, la facultad y tu carrera.",
    svgIcono: (
      // Calendario + burbuja de comunicado: fechas + avisos
      <>
        <rect x="2" y="7" width="19" height="18" rx="2" />
        <path d="M2 13h19" />
        <path d="M7.5 4v6M15.5 4v6" />
        <path d="M19 17h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-5l-3 3v-3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" />
      </>
    ),
  },
];

// Agrupa arrSistemas de a 2 para armar las filas del grid. Si en algún
// momento queda una cantidad impar de sistemas, la última fila
// simplemente queda con una sola tarjeta — no hace falta tocar nada acá.
const arrFilas = [];
for (let index = 0; index < arrSistemas.length; index += 2) {
  arrFilas.push(arrSistemas.slice(index, index + 2));
}

function LineaDivisoria() {
  return (
    <div className="h-[4px] rounded-full bg-[image:var(--gradient-button)] opacity-80" />
  );
}

export default function SystemsSection() {
  return (
    <section className="mt-14">
      <h2 className="text-[28px] font-extrabold text-primary-navy mb-2">
        Sistemas que te pueden servir
      </h2>
      <p className="text-[15px] text-text-body mb-8 max-w-[640px]">
        Accesos directos a otras plataformas de la universidad que vas a
        necesitar durante tu paso por la facultad.
      </p>

      <LineaDivisoria />

      {arrFilas.map((fila, indexFila) => (
        <div key={indexFila}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-14 gap-y-8 py-8">
            {fila.map((sistema) => (
              <SystemCard key={sistema.strNombre} {...sistema} />
            ))}
          </div>
          <LineaDivisoria />
        </div>
      ))}
    </section>
  );
}
