import { useRef, useState } from "react";
import { descargarExamenPasado } from "../services/examenesPasadosService";

export default function useDescargaDocumento() {
  const solicitudes = useRef(new Set());
  const [pendientes, setPendientes] = useState(new Set());
  const [errorDescarga, setErrorDescarga] = useState("");

  async function descargar(documento) {
    const id = documento.intId;
    if (solicitudes.current.has(id)) return;
    solicitudes.current.add(id);
    setPendientes(new Set(solicitudes.current));
    setErrorDescarga("");
    try {
      const blob = await descargarExamenPasado(id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `examen-${id}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setErrorDescarga(e.message || "No se pudo descargar el documento.");
    } finally {
      solicitudes.current.delete(id);
      setPendientes(new Set(solicitudes.current));
    }
  }
  return { descargar, pendientes, errorDescarga };
}
