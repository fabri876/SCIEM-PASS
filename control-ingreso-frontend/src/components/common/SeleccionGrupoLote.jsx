import React, { useEffect, useState } from "react";
import { obtenerAsignaturas, obtenerGruposPorAsignatura, obtenerGruposPorDocente } from "../../services/grupoService";
import { obtenerUsuarioActual } from "../../services/authService";
import { obtenerAsignaturasPorDocente } from "../../services/examenService";

export default function SeleccionGrupoLote({ value, onChange, disabled = false, revision = 0 }) {
  const [asignaturas, setAsignaturas] = useState([]);
  const [materia, setMateria] = useState("");
  const [grupos, setGrupos] = useState([]);
  const [cargandoMaterias, setCargandoMaterias] = useState(true);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let activo = true;
    setCargandoMaterias(true); setError("");
    const usuario = obtenerUsuarioActual();
    const consulta = usuario?.rol === "DOCENTE"
      ? obtenerAsignaturasPorDocente(usuario.idUsuario, usuario.codigoSis)
      : obtenerAsignaturas();
    consulta.then(datos => { if (activo) setAsignaturas(datos || []); })
      .catch(e => { if (activo) setError(e.message); })
      .finally(() => { if (activo) setCargandoMaterias(false); });
    return () => { activo = false; };
  }, [revision]);
  useEffect(() => {
    let activo = true;
    if (!materia) { setGrupos([]); setCargandoGrupos(false); return; }
    setCargandoGrupos(true); setError("");
    const usuario = obtenerUsuarioActual();
    const consulta = usuario?.rol === "DOCENTE" ? obtenerGruposPorDocente(materia, usuario.idUsuario) : obtenerGruposPorAsignatura(materia);
    consulta.then(datos => { if (activo) setGrupos((datos || []).filter(g => g.estadoGrupo)); })
      .catch(e => { if (activo) setError(e.message); })
      .finally(() => { if (activo) setCargandoGrupos(false); });
    return () => { activo = false; };
  }, [materia, revision]);
  const estilo = "w-full mt-1 p-2.5 border border-border rounded-xl bg-bg-app text-primary-navy disabled:opacity-60";
  return <fieldset disabled={disabled} className="space-y-3 rounded-xl border border-border p-4">
    <legend className="px-2 font-bold text-primary-navy">Asignatura y grupo *</legend>
    {error && <p role="alert" className="text-accent-red text-secondary">{error}</p>}
    <label className="block text-secondary font-bold">Asignatura
      <select aria-label="Asignatura del lote" value={materia} disabled={cargandoMaterias} onChange={e => { setMateria(e.target.value); setGrupos([]); onChange(null); }} className={estilo}>
        <option value="">{cargandoMaterias ? "Cargando asignaturas…" : "Seleccione una asignatura"}</option>
        {asignaturas.map(a => <option key={a.idAsignatura} value={a.idAsignatura}>{a.nombreAsignatura}</option>)}
      </select>
    </label>
    <label className="block text-secondary font-bold">Grupo
      <select aria-label="Grupo del lote" value={value?.idGrupo || ""} disabled={!materia || cargandoGrupos} onChange={e => onChange(grupos.find(g => String(g.idGrupo) === e.target.value) || null)} className={estilo}>
        <option value="">{cargandoGrupos ? "Cargando grupos…" : "Seleccione un grupo"}</option>
        {grupos.map(g => <option key={g.idGrupo} value={g.idGrupo}>Grupo {g.nombreGrupo}</option>)}
      </select>
    </label>
    {!cargandoMaterias && !asignaturas.length && <p className="text-secondary">No hay asignaturas disponibles para su cuenta.</p>}
    {materia && !cargandoGrupos && !grupos.length && <p className="text-secondary">No hay grupos activos disponibles en esta asignatura.</p>}
  </fieldset>;
}
