import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/layout/Header";
import ExamenCard from "../../components/examenes/examenesHome/ExamenCard";
import { ExamenesSkeleton, ExamenesError, ExamenesVacio } from "../../components/examenes/examenesHome/ExamenesEstados";

/**
 * ExamenesPasados.jsx  (ruta: /examenes/pasados)
 *
 * Lista de exámenes ya realizados, cada uno con botón "Descargar".
 * Usa datos de prueba (arrExamenesMock). Para conectar con el backend hay
 * dos bloques marcados con "TODO BACKEND": uno en fnCargarExamenes (la lista)
 * y otro en fnDescargar (el archivo). Contrato de datos: docs/EXAMENES.md
 */

// Datos de prueba. strFecha en YYYY-MM-DD y horas en HH:mm (24 h).
const arrExamenesMock = [
  {
    intId: 91,
    strFecha: "2026-09-20",
    strNombre: "Programación II - Grupo A",
    strDocente: "Ing. Carla Mendoza",
    strAmbiente: "Aula 612 - Bloque F",
    strHoraInicio: "08:00",
    strHoraFin: "11:00",
  },
  {
    intId: 90,
    strFecha: "2026-09-18",
    strNombre: "Física II - Grupo B",
    strDocente: "Ing. Marco Quiroga",
    strAmbiente: "Aula 305 - Bloque C",
    strHoraInicio: "14:00",
    strHoraFin: "17:00",
  },
  {
    intId: 89,
    strFecha: "2026-09-15",
    strNombre: "Cálculo I - Grupo C",
    strDocente: "Lic. Rosa Villarroel",
    strAmbiente: "Aula 410 - Bloque A",
    strHoraInicio: "09:00",
    strHoraFin: "12:00",
  },
  {
    intId: 88,
    strFecha: "2026-09-12",
    strNombre: "Álgebra Lineal - Grupo A",
    strDocente: "Ing. Daniel Rojas",
    strAmbiente: "Aula 208 - Bloque D",
    strHoraInicio: "15:00",
    strHoraFin: "18:00",
  },
];

export default function ExamenesPasados() {
  const [arrExamenes, setArrExamenes] = useState([]);
  const [boolCargando, setBoolCargando] = useState(true);
  const [strError, setStrError] = useState("");
  const [intIdDescargando, setIntIdDescargando] = useState(null);
  const [strErrorDescarga, setStrErrorDescarga] = useState("");

  const fnCargarExamenes = useCallback(async () => {
    setBoolCargando(true);
    setStrError("");
    try {
      // ───────────── TODO BACKEND (lista) ─────────────
      // Reemplazar estas dos líneas (simulan la espera y devuelven el mock) por:
      //
      //   const respuesta = await fetch(`${import.meta.env.VITE_API_URL}/examenes/pasados`, {
      //     headers: { Authorization: `Bearer ${obtenerToken()}` },
      //   });
      //   if (!respuesta.ok) throw new Error("No se pudieron obtener los exámenes.");
      //   const arrDatos = await respuesta.json();
      //
      // (importar obtenerToken desde "../../services/authService")
      await new Promise((fnResolver) => setTimeout(fnResolver, 700));
      const arrDatos = arrExamenesMock;
      // ───────────────────────────────────────────────

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

  const fnDescargar = async (examen) => {
    setIntIdDescargando(examen.intId);
    setStrErrorDescarga("");
    try {
      // ───────────── TODO BACKEND (descarga) ─────────────
      // Reemplazar estas líneas (generan un .txt de prueba) por:
      //
      //   const respuesta = await fetch(`${import.meta.env.VITE_API_URL}/examenes/${examen.intId}/descarga`, {
      //     headers: { Authorization: `Bearer ${obtenerToken()}` },
      //   });
      //   if (!respuesta.ok) throw new Error("No se pudo descargar el archivo del examen.");
      //   const blobArchivo = await respuesta.blob();
      //   const strNombreArchivo = `examen-${examen.intId}.pdf`;
      await new Promise((fnResolver) => setTimeout(fnResolver, 700));
      const blobArchivo = new Blob(
        [`Archivo de prueba\n${examen.strNombre}\n${examen.strFecha}\n${examen.strAmbiente}`],
        { type: "text/plain" }
      );
      const strNombreArchivo = `examen-${examen.intId}-prueba.txt`;
      // ────────────────────────────────────────────────────

      // Esto se queda igual: dispara la descarga en el navegador
      const strUrlTemporal = URL.createObjectURL(blobArchivo);
      const elementoEnlace = document.createElement("a");
      elementoEnlace.href = strUrlTemporal;
      elementoEnlace.download = strNombreArchivo;
      document.body.appendChild(elementoEnlace);
      elementoEnlace.click();
      elementoEnlace.remove();
      URL.revokeObjectURL(strUrlTemporal);
    } catch (error) {
      setStrErrorDescarga(error.message || "No se pudo descargar el archivo.");
    } finally {
      setIntIdDescargando(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FC]">
      <Header />

      <main className="max-w-[920px] mx-auto px-5 md:px-8 py-8 md:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#123F7B]">Exámenes pasados</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Historial de exámenes realizados. Descarga el archivo de cada uno cuando lo necesites.
            </p>
          </div>

          <Link
            to="/examenes"
            className="inline-flex items-center justify-center gap-2 h-[42px] px-4 rounded-[10px] border border-[#B9CDF5] bg-[#F5F8FF] text-[#2563EB] text-[13px] font-bold whitespace-nowrap transition-colors duration-200 hover:bg-[#E3ECFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4 stroke-[#2563EB] fill-none stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Volver a próximos
          </Link>
        </div>

        {strErrorDescarga && (
          <p
            role="alert"
            className="mb-4 px-4 py-3 rounded-xl bg-[#FDEEF1] border border-[#F5C6CF] text-sm text-[#D93856]"
          >
            {strErrorDescarga}
          </p>
        )}

        {boolCargando && <ExamenesSkeleton intCantidad={4} />}

        {!boolCargando && strError && (
          <ExamenesError strMensaje={strError} fnReintentar={fnCargarExamenes} />
        )}

        {!boolCargando && !strError && arrExamenes.length === 0 && (
          <ExamenesVacio
            strTitulo="Aún no hay exámenes pasados"
            strDescripcion="Los exámenes que ya se hayan realizado aparecerán aquí para que puedas descargarlos."
          />
        )}

        {!boolCargando && !strError && arrExamenes.length > 0 && (
          <div className="flex flex-col gap-4">
            {arrExamenes.map((examen) => (
              <ExamenCard
                key={examen.intId}
                examen={examen}
                boolPasado
                boolDescargando={intIdDescargando === examen.intId}
                fnAlDescargar={fnDescargar}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
