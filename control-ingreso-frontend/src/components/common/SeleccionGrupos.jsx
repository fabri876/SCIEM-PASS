import { textoInterfaz } from '../../utils/textoInterfaz.js';
import SelectorAsignatura from "./SelectorAsignatura";
import React, { useState, useEffect } from "react";
import { obtenerAsignaturas, obtenerGruposPorAsignatura, obtenerGruposPorDocente } from "../../services/grupoService";
import { obtenerUsuarioActual } from "../../services/authService";
import { obtenerAsignaturasPorDocente } from "../../services/examenService";

/** El grupo identifica su asignatura; se pueden añadir grupos de varias materias. */
export default function SeleccionGrupos({ value = [], onChange, disabled = false, required = false, unGrupoPorAsignatura = false }) {
  const [asignaturas, setAsignaturas] = useState([]);
  const [asignatura, setAsignatura] = useState("");
  const [clasificacion,setClasificacion]=useState(null);
  const [grupos, setGrupos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoAsignaturas, setCargandoAsignaturas] = useState(true);
  useEffect(() => {
    let activo = true;
    const usuario = obtenerUsuarioActual();
    const consulta = usuario?.rol === "DOCENTE" ? obtenerAsignaturasPorDocente(usuario.idUsuario, usuario.codigoSis) : obtenerAsignaturas();
    consulta.then(datos => { if (activo) setAsignaturas(datos || []); })
      .catch(err => { if (activo) setError(err.message); })
      .finally(() => { if (activo) setCargandoAsignaturas(false); });
    return () => { activo = false; };
  }, []);
  useEffect(() => {
    let activo = true;
    if (!asignatura) return () => { activo = false; };
    const usuario = obtenerUsuarioActual();
    const consulta = usuario?.rol === "DOCENTE"
      ? obtenerGruposPorDocente(asignatura, usuario.idUsuario)
      : obtenerGruposPorAsignatura(asignatura);
    consulta.then(datos => { if (activo) setGrupos(datos || []); })
      .catch(err => { if (activo) setError(err.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [asignatura]);
  return <fieldset disabled={disabled} className="space-y-3 p-4 border border-border rounded-xl">
    <legend className="px-2 font-bold text-primary-navy">Asignaturas y grupos{required ? " *" : ""}</legend>
    <p className="text-secondary">{unGrupoPorAsignatura ? "Seleccione un solo grupo por asignatura. Para cambiarlo, quite primero el grupo seleccionado. Puede añadir otras asignaturas." : "Seleccione una materia y marque sus grupos. Se añaden al instante; puede repetir con otras materias."}</p>
    {error && <p role="alert" className="text-accent-red">{error}</p>}
    <SelectorAsignatura value={asignatura} permitidas={asignaturas} disabled={disabled||cargandoAsignaturas}
      onClasificacion={setClasificacion}
      onChange={valor=>{setAsignatura(valor);setGrupos([]);setError("");setCargando(Boolean(valor));}} />
    {cargando ? <p>Cargando grupos…</p> : asignatura && <div className="flex flex-wrap gap-3">
      {grupos.filter(g => g.estadoGrupo).map(g => <label key={g.idGrupo} className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer ${value.some(v => v.idGrupo === g.idGrupo) ? "border-primary-blue bg-primary-blue/10 text-primary-navy" : "border-border"}`}>
        <input type="checkbox" className="accent-primary-blue" checked={value.some(v => v.idGrupo === g.idGrupo)}
          disabled={unGrupoPorAsignatura && value.some(v => v.idAsignatura === g.idAsignatura && v.idGrupo !== g.idGrupo)}
          onChange={e => onChange(e.target.checked ? [...value, {...g,idCarrera:clasificacion?.idCarrera}] : value.filter(v => v.idGrupo !== g.idGrupo))} />
        Grupo {g.nombreGrupo}
      </label>)}
      {!grupos.length && <p className="text-sm">No hay grupos registrados. Un administrador debe crearlos primero.</p>}
    </div>}
    <p className="text-secondary font-semibold text-primary-navy">{value.length ? `${value.length} grupo(s) seleccionados` : required ? "Seleccione al menos un grupo para poder registrar." : "Sin grupos seleccionados (opcional)."}</p>
    {value.map(g => <div key={g.idGrupo} className="flex justify-between gap-3 text-sm bg-bg-app p-2 rounded-lg">
      <span>{textoInterfaz(g.nombreAsignatura)} · {asignaturas.find(a=>a.idAsignatura===g.idAsignatura)?.codigoOficial ? `Código ${asignaturas.find(a=>a.idAsignatura===g.idAsignatura).codigoOficial}` : `ID ${g.idAsignatura}`} · Grupo {g.nombreGrupo}</span>
      <button type="button" aria-label={`Quitar ${g.nombreAsignatura}, grupo ${g.nombreGrupo}`} onClick={() => onChange(value.filter(v => v.idGrupo !== g.idGrupo))}>Quitar</button>
    </div>)}
  </fieldset>;
}
