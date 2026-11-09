import { useEffect, useState } from "react";
import { ScanFace } from "lucide-react";
import { cambiarEstadoEnrolamiento, listarEnrolamientos } from "../../services/facialService";

/** Requiere el futuro GET administrativo: el backend actual solo ofrece PATCH por id. */
export default function GestionEnrolamientosAdmin() {
  const [filas, setFilas] = useState([]); const [error, setError] = useState("");
  const cargar = () => listarEnrolamientos().then(setFilas).catch((e) => setError(e.message));
  useEffect(cargar, []);
  const cambiar = async (fila, estado) => { await cambiarEstadoEnrolamiento(fila.idEnrollment, estado); cargar(); };
  return <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 font-sans"><div className="flex gap-3"><ScanFace className="text-[var(--color-primary-blue)]"/><div><h2 className="font-extrabold text-[var(--color-primary-navy)]">Gestión de enrolamientos</h2><p className="text-sm text-[var(--color-text-body)]">Identidades biométricas registradas.</p></div></div>{error && <p className="mt-4 text-sm text-[var(--color-accent-red)]">{error}</p>}<div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead className="text-[var(--color-secondary-data)]"><tr><th className="text-left p-2">Estudiante</th><th>Estado</th><th>Registro</th><th /></tr></thead><tbody>{filas.map((f) => <tr key={f.idEnrollment} className="border-t border-[var(--color-border)]"><td className="p-2 font-bold text-[var(--color-text-title)]">{f.nombreCompleto}<small className="block text-[var(--color-text-body)]">SIS {f.codsisEstudiante}</small></td><td className="text-center">{f.estado}</td><td className="text-center">{f.fechaRegistro?.slice(0, 10)}</td><td className="p-2 text-right"><button onClick={() => cambiar(f, f.estado === "bloqueado" ? "reemplazado" : "bloqueado")} className="rounded-lg border border-[var(--color-primary-blue)] px-2 py-1 font-bold text-[var(--color-primary-blue)]">{f.estado === "bloqueado" ? "Permitir re-enrolamiento" : "Bloquear"}</button></td></tr>)}</tbody></table></div></section>;
}
