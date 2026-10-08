import React, { useCallback, useEffect, useState } from "react";
import { obtenerAsignaturas, obtenerCatalogoGrupos, obtenerVinculaciones } from "../../../services/grupoService";
import { RefreshCw, BookOpen } from "lucide-react";

export default function CatalogoAcademicoTable({ revision = 0, docentes = [] }) {
  const [asignaturas, setAsignaturas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [vinculaciones, setVinculaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [materias, listaGrupos, relaciones] = await Promise.all([obtenerAsignaturas(), obtenerCatalogoGrupos(), obtenerVinculaciones()]);
      setAsignaturas(materias); setGrupos(listaGrupos); setVinculaciones(relaciones.filter(v => v.rol === "DOCENTE"));
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar, revision]);
  const visibles = asignaturas.filter(a => `${a.nombreAsignatura} ${a.idAsignatura} ${a.codigoOficial || ""}`.toLowerCase().includes(busqueda.toLowerCase()));
  const nombresDocentes = idGrupo => vinculaciones.filter(v => v.idGrupo === idGrupo).map(v => {
    const d = docentes.find(u => u.idUsuario === v.idUsuario);
    return d ? `${d.nombre} ${d.apellido}` : `Docente ${v.idUsuario}`;
  }).join(", ");
  return <section className="rounded-2xl border border-border bg-bg-card p-6 space-y-4 shadow-sm">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <h2 className="text-card-title font-extrabold text-primary-navy flex items-center gap-2"><BookOpen size={22} />Administración de asignaturas y grupos</h2>
      <button type="button" onClick={cargar} disabled={cargando} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-primary-navy font-bold"><RefreshCw size={16} />Actualizar</button>
    </div>
    <p className="text-secondary">{asignaturas.length} asignaturas · {grupos.length} grupos registrados</p>
    <input aria-label="Buscar asignaturas" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, código o ID" className="w-full rounded-xl border border-border bg-bg-app p-3" />
    {error && <p role="alert" className="text-accent-red">{error}</p>}
    {cargando ? <p role="status">Cargando asignaturas y grupos…</p> : <div className="max-h-[650px] overflow-auto space-y-3">
      {!visibles.length && <p className="text-secondary">No hay asignaturas para mostrar.</p>}
      {visibles.map(a => <details key={a.idAsignatura} className="rounded-xl border border-border bg-bg-app/50">
        <summary className="p-4 cursor-pointer text-primary-navy font-bold">{a.nombreAsignatura} <span className="font-normal text-secondary">· Código {a.codigoOficial || a.idAsignatura} · ID {a.idAsignatura} · {grupos.filter(g => g.idAsignatura === a.idAsignatura).length} grupos</span></summary>
        <div className="px-4 pb-4 overflow-x-auto"><table className="w-full text-left text-secondary">
          <thead><tr className="text-primary-navy"><th className="py-2 pr-3">Grupo</th><th className="py-2 pr-3">Estado</th><th className="py-2">Docentes</th></tr></thead>
          <tbody>{grupos.filter(g => g.idAsignatura === a.idAsignatura).map(g => <tr key={g.idGrupo} className="border-t border-border"><td className="py-2 pr-3">{g.nombreGrupo}</td><td className="py-2 pr-3">{g.estadoGrupo ? "Activo" : "Inactivo"}</td><td className="py-2">{nombresDocentes(g.idGrupo) || "Sin docente asignado"}</td></tr>)}</tbody>
        </table>{!grupos.some(g => g.idAsignatura === a.idAsignatura) && <p className="text-secondary">Esta asignatura todavía no tiene grupos.</p>}</div>
      </details>)}
    </div>}
  </section>;
}
