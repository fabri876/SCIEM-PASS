import { useCallback, useEffect, useState } from "react";
import Header from "../../components/layout/Header";
import ExamenCard from "../../components/examenes/examenesHome/ExamenCard";
import { ExamenesSkeleton, ExamenesError, ExamenesVacio } from "../../components/examenes/examenesHome/ExamenesEstados";

import { obtenerExamenesProximos } from "../../services/examenService";

export default function Examenes() {
  const [arrExamenes, setArrExamenes] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");

  const fnCargarExamenes = useCallback(async () => {
    setBoolCargando(true);
    setStrError("");
    try {
      const arrDatos = await obtenerExamenesProximos();

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


        </div>

        {boolCargando && <ExamenesSkeleton intCantidad={4} />}

        {!boolCargando && strError && (
          <ExamenesError strMensaje={strError} fnReintentar={fnCargarExamenes} />
        )}

        {!boolCargando && !strError && arrExamenes.length === 0 && (
          <ExamenesVacio
            strTitulo="No hay exámenes próximos"
            strDescripcion="Cuando se programe un examen, lo verás aquí con su fecha, ambiente y horario de ingreso."
          />
        )}

        {!boolCargando && !strError && arrExamenes.length > 0 && (
          <div className="flex flex-col gap-4">
            {arrExamenes.map((examen) => (
              <ExamenCard key={`${examen.intId}-${examen.idAmbiente ?? "sin-aula"}`} examen={examen} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
