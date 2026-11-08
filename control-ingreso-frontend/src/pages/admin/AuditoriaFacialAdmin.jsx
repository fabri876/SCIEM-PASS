import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { listarAuditoriaFacial } from "../../services/facialService";

/** Requiere endpoints administrativos de lectura para ingreso auditado e intentos faciales. */
export default function AuditoriaFacialAdmin() {
  const [filas, setFilas] = useState([]); const [error, setError] = useState("");
  useEffect(() => { listarAuditoriaFacial().then(setFilas).catch((e) => setError(e.message)); }, []);
  return <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 font-sans"><div className="flex gap-3"><AlertTriangle className="text-[var(--color-accent-red)]"/><div><h2 className="font-extrabold text-[var(--color-primary-navy)]">Auditoría facial</h2><p className="text-sm text-[var(--color-text-body)]">Colisiones offline y excepciones manuales.</p></div></div>{error && <p className="mt-4 text-sm text-[var(--color-accent-red)]">{error}</p>}<div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[var(--color-secondary-data)]"><th className="text-left p-2">Estudiante</th><th>Método</th><th>Motivo</th><th>Hora</th></tr></thead><tbody>{filas.map((f) => <tr key={f.idIngreso} className="border-t border-[var(--color-border)]"><td className="p-2 font-bold text-[var(--color-text-title)]">{f.nombreCompleto || `SIS ${f.codsisEstudiante}`}</td><td className="text-center">{f.metodoIngreso}</td><td className="text-center text-[var(--color-accent-red)]">{f.motivoExcepcion || "Colisión offline"}</td><td className="text-center">{f.horaIngreso?.replace("T", " ")}</td></tr>)}</tbody></table></div></section>;
}
