import React, { useCallback, useEffect, useState } from "react";
import { obtenerAsignaturas, obtenerCatalogoGrupos, obtenerVinculaciones, quitarVinculacion, invalidarCatalogo, clasificarAsignatura } from "../../../services/grupoService";
import { RefreshCw, BookOpen } from "lucide-react";
import SelectorAsignatura from "../../../components/common/SelectorAsignatura";

export default function CatalogoAcademicoTable({ revision = 0, docentes = [], usuarios = [] }) {
  const [asignaturas, setAsignaturas] = useState([]);
  const [filtroMaterias,setFiltroMaterias]=useState(null);
  const [clasificando,setClasificando]=useState(null);
  const [datosClasificacion,setDatosClasificacion]=useState(null);
  const [guardandoClasificacion,setGuardandoClasificacion]=useState(false);
  const [grupos, setGrupos] = useState([]);
  const [vinculaciones, setVinculaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [quitando, setQuitando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [pendiente, setPendiente] = useState("todos");
  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [materias, listaGrupos, relaciones] = await Promise.all([obtenerAsignaturas(), obtenerCatalogoGrupos(), obtenerVinculaciones()]);
      setAsignaturas(materias); setGrupos(listaGrupos); setVinculaciones(relaciones);
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar, revision]);
  const gruposAsignados = new Set(vinculaciones.filter(v => v.rol === "DOCENTE").map(v => v.idGrupo));
  const docentesAsignados = new Set(vinculaciones.filter(v => v.rol === "DOCENTE").map(v => v.idUsuario));
  const docentesPendientes = docentes.filter(d => !docentesAsignados.has(d.idUsuario));
  const gruposPendientes = grupos.filter(g => !gruposAsignados.has(g.idGrupo));
  const asignaturasPendientes = asignaturas.filter(a => !grupos.some(g => g.idAsignatura === a.idAsignatura && gruposAsignados.has(g.idGrupo)));
  const visibles = asignaturas.filter(a => `${a.nombreAsignatura} ${a.idAsignatura} ${a.codigoOficial || ""}`.toLowerCase().includes(busqueda.toLowerCase()))
    .filter(a=>filtroMaterias===null||filtroMaterias.includes(a.idAsignatura))
    .filter(a => pendiente === "todos" || (pendiente === "asignaturas" ? asignaturasPendientes.some(p => p.idAsignatura === a.idAsignatura) : gruposPendientes.some(g => g.idAsignatura === a.idAsignatura)));
  const nombreUsuario = v => {
    const u = usuarios.find(u => u.idUsuario === v.idUsuario) || docentes.find(u => u.idUsuario === v.idUsuario);
    return u ? `${u.nombre} ${u.apellido}` : `Usuario ${v.idUsuario}`;
  };
  const quitar = async () => {
    setQuitando(true); setError("");
    try { await quitarVinculacion(seleccion); setSeleccion(null); await cargar(); setMensaje("Asignación quitada. La cuenta se conserva."); }
    catch (e) { setError(e.message); } finally { setQuitando(false); }
  };
  const nombresDocentes = idGrupo => vinculaciones.filter(v => v.idGrupo === idGrupo && v.rol === "DOCENTE").map(v => {
    const d = docentes.find(u => u.idUsuario === v.idUsuario);
    return d ? `${d.nombre} ${d.apellido}` : `Docente ${v.idUsuario}`;
  }).join(", ");
  return <section className="rounded-2xl border border-border bg-bg-card p-6 space-y-4 shadow-sm">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <h2 className="text-card-title font-extrabold text-primary-navy flex items-center gap-2"><BookOpen size={22} />Administración de asignaturas y grupos</h2>
      <button type="button" onClick={() => { invalidarCatalogo(); void cargar(); }} disabled={cargando} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-primary-navy font-bold"><RefreshCw size={16} />Actualizar</button>
    </div>
    <p className="text-secondary">{asignaturas.length} asignaturas · {grupos.length} grupos registrados</p>
    {!cargando && !error && <aside className="rounded-xl border border-border bg-bg-app p-4 space-y-3">
      <h3 className="font-bold text-primary-navy">Pendientes de asignación</h3>
      <p className="text-secondary text-sm">Estos pendientes son independientes del estado activo o inactivo. Asigne docentes desde el formulario de gestión académica.</p>
      <div className="flex flex-wrap gap-2">
        {[["todos", "Todo el catálogo"], ["asignaturas", `${asignaturasPendientes.length} asignaturas sin docente`], ["grupos", `${gruposPendientes.length} grupos sin docente`]].map(([valor, etiqueta]) => <button key={valor} type="button" aria-pressed={pendiente === valor} onClick={() => setPendiente(valor)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${pendiente === valor ? "bg-primary-navy text-white" : "border-border text-primary-navy"}`}>{etiqueta}</button>)}
      </div>
      <details><summary className="cursor-pointer font-bold text-primary-navy">{docentesPendientes.length} docentes sin grupos asignados</summary>
        <ul className="mt-2 max-h-48 overflow-auto space-y-2 text-secondary">{docentesPendientes.map(d => <li key={d.idUsuario}>{d.nombre} {d.apellido} · {d.estado ? "Activo" : "Inactivo"}</li>)}</ul>
        {!docentesPendientes.length && <p className="text-secondary">Todos los docentes tienen grupos asignados.</p>}
      </details>
    </aside>}
    <input aria-label="Buscar asignaturas" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, código o ID" className="w-full rounded-xl border border-border bg-bg-app p-3" />
    <details className="rounded-xl border border-border p-3"><summary className="font-bold cursor-pointer">Filtrar por carrera y nivel</summary>
      <div className="mt-3"><SelectorAsignatura soloFiltros onMaterias={setFiltroMaterias} revision={revision} /></div>
    </details>
    {mensaje && <p role="status" className="text-primary-navy">{mensaje}</p>}
    {error && <p role="alert" className="text-accent-red">{error}</p>}
    {cargando ? <p role="status">Cargando asignaturas y grupos…</p> : <div className="max-h-[650px] overflow-auto space-y-3">
      {!visibles.length && <p className="text-secondary">No hay asignaturas para mostrar.</p>}
      {visibles.map(a => <details key={a.idAsignatura} className="rounded-xl border border-border bg-bg-app/50">
        <summary className="p-4 cursor-pointer text-primary-navy font-bold">{a.nombreAsignatura} <span className="font-normal text-secondary">· Código {a.codigoOficial || a.idAsignatura} · ID {a.idAsignatura} · {grupos.filter(g => g.idAsignatura === a.idAsignatura).length} grupos</span></summary>
        <div className="px-4 pb-4 overflow-x-auto"><table className="w-full text-left text-secondary">
          <thead><tr className="text-primary-navy"><th className="py-2 pr-3">Grupo</th><th className="py-2 pr-3">Estado</th><th className="py-2">Docentes</th></tr></thead>
          <tbody>{grupos.filter(g => g.idAsignatura === a.idAsignatura && (pendiente !== "grupos" || !gruposAsignados.has(g.idGrupo))).map(g => <tr key={g.idGrupo} className="border-t border-border"><td className="py-2 pr-3">{g.nombreGrupo}</td><td className="py-2 pr-3">{g.estadoGrupo ? "Activo" : "Inactivo"}</td><td className="py-2">{nombresDocentes(g.idGrupo) || "Sin docente asignado"}</td></tr>)}</tbody>
        </table>
          <button type="button" onClick={()=>{setClasificando(a);setDatosClasificacion(null);setError("");}} className="mt-3 rounded-lg border border-border px-3 py-2 font-bold text-primary-navy">Añadir a carrera y nivel</button>
          <details className="mt-3"><summary className="cursor-pointer font-bold text-primary-navy">Personas asignadas · corregir asignaciones</summary>
            <div className="mt-2 max-h-64 overflow-auto space-y-2">{vinculaciones.filter(v => v.idAsignatura === a.idAsignatura).map(v => <div key={`${v.rol}-${v.idUsuario}-${v.idGrupo}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-secondary">
              <span>{nombreUsuario(v)} · {v.rol === "OPERADOR" ? "Ayudante" : v.rol === "DOCENTE" ? "Docente" : "Estudiante"} · Grupo {v.nombreGrupo}</span>
              <button type="button" onClick={() => { setError(""); setSeleccion(v); }} className="rounded-lg border border-accent-red px-3 py-2 text-accent-red font-bold">Quitar del grupo</button>
            </div>)}{!vinculaciones.some(v => v.idAsignatura === a.idAsignatura) && <p>No hay personas asignadas.</p>}</div>
          </details>{!grupos.some(g => g.idAsignatura === a.idAsignatura) && <p className="text-secondary">Esta asignatura todavía no tiene grupos.</p>}</div>
      </details>)}
    </div>}
    {clasificando&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form role="dialog" aria-modal="true" aria-labelledby="clasificar-titulo" className="w-full max-w-xl rounded-2xl bg-bg-card p-6 space-y-4" onSubmit={async e=>{
      e.preventDefault();setGuardandoClasificacion(true);setError("");
      try{await clasificarAsignatura({idAsignatura:clasificando.idAsignatura,...datosClasificacion});setClasificando(null);await cargar();setMensaje("Asignatura añadida a la carrera y nivel. Sus grupos se conservan.");}
      catch(e){setError(e.message);}finally{setGuardandoClasificacion(false);}
    }}>
      <h3 id="clasificar-titulo" className="font-bold text-primary-navy">Clasificar asignatura existente</h3>
      <p>{clasificando.nombreAsignatura} · Código {clasificando.codigoOficial||clasificando.idAsignatura}</p>
      <SelectorAsignatura soloClasificacion required disabled={guardandoClasificacion} onClasificacion={setDatosClasificacion} />
      {error&&<p role="alert" className="text-accent-red">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={guardandoClasificacion} onClick={()=>setClasificando(null)} className="rounded-xl border border-border px-4 py-2">Cancelar</button>
        <button disabled={guardandoClasificacion||!datosClasificacion?.idNivel} className="rounded-xl bg-primary-blue text-white px-4 py-2 font-bold">{guardandoClasificacion?"Guardando…":"Guardar clasificación"}</button></div>
    </form></div>}
    {seleccion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div role="dialog" aria-modal="true" aria-labelledby="quitar-asignacion-titulo" className="w-full max-w-lg rounded-2xl bg-bg-card p-6 shadow-xl space-y-4">
      <h3 id="quitar-asignacion-titulo" className="font-bold text-primary-navy">¿Quitar esta asignación?</h3>
      <p className="text-secondary">{nombreUsuario(seleccion)} · {asignaturas.find(a => a.idAsignatura === seleccion.idAsignatura)?.nombreAsignatura} · Grupo {seleccion.nombreGrupo}.</p>
      <p className="text-secondary">Se conservan la cuenta y los registros de exámenes. Si esta es su última asignación, quedará sin grupos.</p>
      {error && <p role="alert" className="text-accent-red">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={quitando} onClick={() => setSeleccion(null)} className="rounded-xl border border-border px-4 py-2">Cancelar</button><button type="button" disabled={quitando} onClick={quitar} className="rounded-xl bg-accent-red text-white px-4 py-2 font-bold">{quitando ? "Quitando…" : "Confirmar"}</button></div>
    </div></div>}
  </section>;
}
