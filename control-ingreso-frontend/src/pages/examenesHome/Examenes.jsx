import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/layout/Header";
import ExamenCard from "../../components/examenes/examenesHome/ExamenCard";
import { ExamenesSkeleton, ExamenesError, ExamenesVacio } from "../../components/examenes/examenesHome/ExamenesEstados";

/**
 * Examenes.jsx  (ruta: /examenes)
 *
 * Lista de exámenes próximos. Hoy usa datos de prueba (arrExamenesMock);
 * para conectar con el backend solo hay que cambiar el bloque marcado con
 * "TODO BACKEND" dentro de fnCargarExamenes. El resto de la pantalla no se toca.
 * Contrato de datos y endpoint: docs/EXAMENES.md
 */

// Datos de prueba. strFecha en YYYY-MM-DD y horas en HH:mm (24 h).
const arrExamenesMock = [
  {
    intId: 101,
    strFecha: "2026-10-20",
    strNombre: "Programación II - Grupo A",
    strDocente: "Ing. Carla Mendoza",
    strAmbiente: "Aula 612 - Bloque F",
    strHoraInicio: "08:00",
    strHoraFin: "11:00",
  },
  {
    intId: 102,
    strFecha: "2026-10-21",
    strNombre: "Física II - Grupo B",
    strDocente: "Ing. Marco Quiroga",
    strAmbiente: "Aula 305 - Bloque C",
    strHoraInicio: "14:00",
    strHoraFin: "17:00",
  },
  {
    intId: 103,
    strFecha: "2026-10-23",
    strNombre: "Cálculo I - Grupo C",
    strDocente: "Lic. Rosa Villarroel",
    strAmbiente: "Aula 410 - Bloque A",
    strHoraInicio: "09:00",
    strHoraFin: "12:00",
  },
  {
    intId: 104,
    strFecha: "2026-10-25",
    strNombre: "Álgebra Lineal - Grupo A",
    strDocente: "Ing. Daniel Rojas",
    strAmbiente: "Aula 208 - Bloque D",
    strHoraInicio: "15:00",
    strHoraFin: "18:00",
  },
];

export default function Examenes() {
  const [arrExamenes, setArrExamenes] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");

  const fnCargarExamenes = useCallback(async () => {
    setBoolCargando(true);
    setStrError("");
    try {
      // ───────────── TODO BACKEND ─────────────
      // Reemplazar estas dos líneas (simulan la espera y devuelven el mock) por:
      //
      //   const respuesta = await fetch(`${import.meta.env.VITE_API_URL}/examenes/proximos`, {
      //     headers: { Authorization: `Bearer ${obtenerToken()}` },
      //   });
      //   if (!respuesta.ok) throw new Error("No se pudieron obtener los exámenes.");
      //   const arrDatos = await respuesta.json();
      //
      // (importar obtenerToken desde "../../services/authService")
      await new Promise((fnResolver) => setTimeout(fnResolver, 700));
      const arrDatos = arrExamenesMock;
      // ────────────────────────────────────────

      setArrExamenes(arrDatos);
    } catch (error) {
      setStrError(error.message || "Ocurrió un error inesperado. Intenta nuevamente.");
    } finally {
      setBoolCargando(false);
    }
  }, []);

  useEffect(() => {
    fnCargarExamenes();
  }, [fnCargarExamenes]);

  return (
    <div className="min-h-screen bg-[#F4F6FC]">
      <Header />

      <main className="max-w-[920px] mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#123F7B]">Exámenes próximos</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Revisa la fecha, el ambiente y el horario de ingreso de cada examen.
            </p>
          </div>

          <Link
            to="/examenes/pasados"
            className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[10px] border border-[#B9CDF5] bg-[#F5F8FF] text-[#2563EB] text-[13px] font-bold whitespace-nowrap transition-colors duration-200 hover:bg-[#E3ECFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4 stroke-[#2563EB] fill-none stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
            Exámenes pasados
          </Link>
        </div>

        {boolCargando && <ExamenesSkeleton intCantidad={4} />}

        {!boolCargando && strError && (
          <ExamenesError strMensaje={strError} fnReintentar={fnCargarExamenes} />
        )}

        {!boolCargando && !strError && arrExamenes.length === 0 && (
          <ExamenesVacio
            strTitulo="No tienes exámenes próximos"
            strDescripcion="Cuando se programe un examen, lo verás aquí con su fecha, ambiente y horario de ingreso."
          />
        )}

        {!boolCargando && !strError && arrExamenes.length > 0 && (
          <div className="flex flex-col gap-4">
            {arrExamenes.map((examen) => (
              <ExamenCard key={examen.intId} examen={examen} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
