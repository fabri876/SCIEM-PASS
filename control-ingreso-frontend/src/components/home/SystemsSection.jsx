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
 * No hace falta tocar SystemCard.jsx ni este componente para eso, solo
 * completar los campos acá abajo. Si más adelante agregan un cuarto
 * sistema, es solo sumar un objeto más al array.
 */
const arrSistemas = [
  {
    strNombre: "WEBSISS",
    strUrl: "https://websis.umss.edu.bo",
    strDescripcion: "WebSISS es el sistema de información académica de la Universidad Mayor de San Simón (UMSS), que centraliza y facilita la gestión de información entre estudiantes, docentes y otros miembros de la comunidad universitaria. A través del sistema se pueden realizar procesos como inscripción a materias, consulta de notas y horarios, gestión de planillas y registro de calificaciones, convirtiéndose en una herramienta fundamental para la gestión académica de la universidad.",
    svgIcono: (
      <>
        <rect x="4" y="6" width="24" height="15" rx="2" />
        <path d="M2 25h28" />
      </>
    ),
  },
  {
    strNombre: "SAGAA",
    strUrl: "https://sagaa.fcyt.umss.edu.bo",
    strDescripcion: "SAGAA (Sistema de Apoyo a la Gestión Académica y Administrativa) es una plataforma de la Universidad Mayor de San Simón (UMSS) que centraliza diversos servicios y procesos académicos y administrativos para los estudiantes. Permite consultar información sobre cursos prefacultativos, realizar inscripciones a laboratorios y exámenes de ingreso, acceder a noticias de admisión, consultar exámenes pasados y gestionar información relacionada con el pregrado, la titulación y otros procesos académicos.",
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
    strUrl: "https://cappuccino.scesi.dev",
    strDescripcion: "CAPPUCHINO es una plataforma desarrollada por estudiantes de la Universidad Mayor de San Simón (UMSS) que permite a los estudiantes organizar y planificar sus horarios académicos de acuerdo con sus preferencias. Cuenta con información de diferentes carreras y facilita la combinación de materias y horarios para ayudar a los estudiantes a planificar su semestre de manera sencilla y flexible.",
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
];

export default function SystemsSection() {
  return (
    <section className="mt-14">
      <h2 className="text-[28px] font-extrabold text-primary-navy mb-2">
        Sistemas que te pueden ayudar en tu vida académica
      </h2>
      <p className="text-[15px] text-text-body mb-2 max-w-[640px]">
        Accesos directos a otras plataformas de la universidad que vas a necesitar durante tu paso por la universidad.
      </p>

      <div className="flex flex-col divide-y divide-border">
        {arrSistemas.map((sistema, index) => (
          <SystemCard
            key={sistema.strNombre}
            {...sistema}
            boolInvertido={index % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
}
