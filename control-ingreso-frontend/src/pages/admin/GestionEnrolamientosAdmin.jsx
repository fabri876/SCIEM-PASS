import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ScanFace } from "lucide-react";
import { cambiarEstadoEnrolamiento, listarEnrolamientos } from "../../services/facialService";

const normalizarEstado = (estado) => String(estado || "").trim().toLowerCase();

export default function GestionEnrolamientosAdmin() {
  const [filas, setFilas] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(null);

  const cargar = async () => {
    try {
      setFilas(await listarEnrolamientos());
      setError("");
    } catch (err) {
      setError(err.message || "No se pudieron cargar los enrolamientos.");
    }
  };

  useEffect(() => { void cargar(); }, []);

  const cambiar = async (fila, siguiente) => {
    setProcesando(fila.idEnrollment);
    setError("");
    setMensaje("");
    try {
      const respuesta = await cambiarEstadoEnrolamiento(fila.idEnrollment, siguiente);
      const final = normalizarEstado(respuesta?.estado || siguiente);
      setMensaje(final === "pendiente_reenrolamiento"
        ? "Re-enrolamiento habilitado. El estudiante ya puede registrar una foto nueva."
        : "Registro facial bloqueado correctamente.");
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el estado del enrolamiento.");
    } finally {
      setProcesando(null);
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 font-sans">
      <div className="flex items-start gap-3">
        <ScanFace className="mt-0.5 text-[var(--color-primary-blue)]" />
        <div>
          <h2 className="font-extrabold text-[var(--color-primary-navy)]">Gestion de enrolamientos</h2>
          <p className="text-sm text-[var(--color-text-body)]">Identidades biometricas registradas.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-[#FEF2F2] p-3 text-sm text-[#B91C1C]">{error}</p>}
      {mensaje && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{mensaje}</p>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[var(--color-secondary-data)]"><tr><th className="p-2 text-left">Estudiante</th><th>Estado</th><th>Registro</th><th /></tr></thead>
          <tbody>{filas.map((fila) => {
            const estado = normalizarEstado(fila.estado);
            const bloqueado = estado === "bloqueado";
            const pendienteReenrolamiento = estado === "pendiente_reenrolamiento";
            const ocupado = procesando === fila.idEnrollment;
            return <tr key={fila.idEnrollment} className="border-t border-[var(--color-border)]">
              <td className="p-2 font-bold text-[var(--color-text-title)]">{fila.nombreCompleto}<small className="block text-[var(--color-text-body)]">SIS {fila.codsisEstudiante}</small></td>
              <td className="text-center">{pendienteReenrolamiento ? "Pendiente de re-enrolamiento" : fila.estado}</td>
              <td className="text-center">{fila.fechaRegistro?.slice(0, 10)}</td>
              <td className="p-2 text-right">
                {pendienteReenrolamiento ? <span className="inline-flex min-h-9 items-center rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Esperando nueva foto</span> : <div className="inline-flex items-center gap-2">
                  {!bloqueado && <button type="button" disabled={ocupado} onClick={() => cambiar(fila, "bloqueado")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DC2626] px-3 py-1.5 text-xs font-bold text-[#B91C1C] transition-all hover:scale-[1.03] hover:bg-[#FEF2F2] hover:shadow-md disabled:cursor-wait disabled:opacity-60">{ocupado && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}{ocupado ? "Actualizando..." : "Bloquear"}</button>}
                  <button type="button" disabled={ocupado} onClick={() => cambiar(fila, "pendiente_reenrolamiento")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-primary-blue)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary-blue)] transition-all hover:scale-[1.03] hover:bg-[#F0F6FC] hover:shadow-md disabled:cursor-wait disabled:opacity-60">{ocupado && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}{ocupado ? "Actualizando..." : "Habilitar re-enrolamiento"}</button>
                </div>}
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}
