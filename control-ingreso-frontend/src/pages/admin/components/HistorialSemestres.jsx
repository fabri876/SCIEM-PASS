import { textoNombre } from '../../../components/common/textoNombre.js';
import { textoAsignatura } from '../../../utils/textoInterfaz.js';
import { TablaConReporte } from '../../../components/common/ReporteLista.jsx';
import { textoInterfaz } from '../../../utils/textoInterfaz.js';
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Download, X, CalendarDays } from 'lucide-react';
import { listarSemestres, compararSemestre, previsualizarSemestre, abrirSemestre, guardarHistorico, configurarFechasSemestre, descargarSemestre, obtenerListadoSemestre, obtenerPdfSemestre } from '../../../services/semestreService';

const nombre = s => s ? `${s.numero}-${s.anio}` : '';
const fecha = valor => valor ? valor.split('-').reverse().join('/') : 'Sin configurar';
const etiquetas = { CAMBIO_DOCENTE: 'Cambio de docente', GRUPO_NUEVO: 'Grupo nuevo', GRUPO_RETIRADO: 'Grupo retirado', SIN_CAMBIOS: 'Sin cambios' };
function Diferencias({ filas = [] }) {
  const [todos, setTodos] = useState(false);
  const cambios = filas.filter(f => f.tipo !== 'SIN_CAMBIOS');
  return <div className="space-y-3">
    <p>{cambios.length} cambios y {filas.length - cambios.length} grupos sin cambios.</p>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={todos} onChange={e => setTodos(e.target.checked)} />Mostrar también los grupos sin cambios</label>
    <div className="overflow-auto max-h-96 rounded-xl border border-slate-200"><TablaConReporte titulo="Comparación de semestres">{(_paraReporte) => (<table className="w-full text-sm text-left"><thead className="bg-slate-100 sticky top-0"><tr>{['Asignatura / grupo', 'Cambio', 'Semestre seleccionado', 'Semestre actual / nuevo'].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>
      {(todos ? filas : cambios).map(f => <tr key={`${f.codigo}:${f.grupo}`} className="border-t border-slate-100"><td className="p-3">{f.codigo} · {textoAsignatura(f.asignatura)}<br />Grupo {f.grupo}</td><td className="p-3">{textoInterfaz(etiquetas[f.tipo])}</td><td className="p-3">{f.anterior?.join(', ') || 'Sin docente / sin grupo'}</td><td className="p-3">{f.actual?.join(', ') || 'Sin docente / sin grupo'}</td></tr>)}
    </tbody></table>)}</TablaConReporte></div>
    {!cambios.length && <p className="text-emerald-700">Las asignaciones de docentes y grupos coinciden.</p>}
  </div>;
}

export default function HistorialSemestres({ onCambio }) {
  const [panel, setPanel] = useState(null), [error, setError] = useState(''), [mensaje, setMensaje] = useState('');
  const [modal, setModal] = useState(null), [detalle, setDetalle] = useState(null), [ocupado, setOcupado] = useState(false);
  const [periodo, setPeriodo] = useState(''), [archivo, setArchivo] = useState(null), [observaciones, setObservaciones] = useState(''), [previa, setPrevia] = useState(null);
  const [seleccion, setSeleccion] = useState(null), [listado, setListado] = useState([]), [busqueda, setBusqueda] = useState(''), [cargandoListado, setCargandoListado] = useState(false);
  const [visor, setVisor] = useState(null), [cargandoPdf, setCargandoPdf] = useState(false);
  const [fechaInicio,setFechaInicio]=useState(''),[fechaFin,setFechaFin]=useState('');
  const cierre = useRef(null);
  useEffect(() => { if (panel?.actual) setSeleccion(panel.actual); }, [panel?.actual?.id]);
  useEffect(() => {
    if (!seleccion) return;
    let vigente = true; setCargandoListado(true); setListado([]); setBusqueda('');
    obtenerListadoSemestre(seleccion.id).then(f => { if (vigente) setListado(f); }).catch(e => { if (vigente) setError(e.message); }).finally(() => { if (vigente) setCargandoListado(false); });
    return () => { vigente = false; };
  }, [seleccion?.id]);
  useEffect(() => () => { if (visor?.url) URL.revokeObjectURL(visor.url); }, [visor]);
  const verPdf = async s => {
    setCargandoPdf(true); setError('');
    try { const blob = await obtenerPdfSemestre(s.id); setVisor({ url: URL.createObjectURL(blob), semestre: nombre(s) }); }
    catch (e) { setError(e.message); } finally { setCargandoPdf(false); }
  };
  useEffect(() => { let vivo = true; listarSemestres().then(p => vivo && setPanel(p)).catch(e => vivo && setError(e.message)); return () => { vivo = false; }; }, []);
  useEffect(() => { if (modal) cierre.current?.focus(); }, [modal]);
  const abrir = tipo => { setError(''); setMensaje(''); setPeriodo(tipo === 'fechas' ? nombre(panel.actual) : ''); setFechaInicio(tipo === 'fechas' ? panel.actual.fechaInicio || '' : '');setFechaFin(tipo === 'fechas' ? panel.actual.fechaFin || '' : '');setArchivo(null); setObservaciones(''); setPrevia(null); setModal(tipo); };
  const datos = () => { const f = new FormData(); f.append('nombre', periodo); f.append('fechaInicio',fechaInicio);f.append('fechaFin',fechaFin);f.append('observaciones', observaciones); if (archivo) f.append('archivo', archivo); return f; };
  const guardar = async e => {
    e.preventDefault(); setOcupado(true); setError('');
    try {
      const f = datos();
      if (modal === 'cambio' && !previa) { setPrevia(await previsualizarSemestre(f)); return; }
      if (previa) f.append('confirmacion', previa.confirmacion);
      const p = await (modal === 'cambio' ? abrirSemestre(f) : modal === 'fechas' ? configurarFechasSemestre(f) : guardarHistorico(f));
      setPanel(p); setModal(null); setDetalle(null); setMensaje('Semestre guardado correctamente.');
      if (modal === 'fechas') setMensaje('Fechas del semestre actualizadas.');
      onCambio?.();
    } catch (e) { setError(e.message); setPrevia(null); } finally { setOcupado(false); }
  };
  const comparar = async id => { setOcupado(true); setError(''); try { setDetalle(await compararSemestre(id)); } catch (e) { setError(e.message); } finally { setOcupado(false); } };
  const descargar = async (s, original = false) => { setError(''); try { await descargarSemestre(s.id, nombre(s), original); } catch (e) { setError(e.message); } };
  const boton = 'px-4 py-2 rounded-xl bg-primary-blue text-white font-semibold disabled:opacity-50';
  return <section className="space-y-6 pb-24">
    <div className="flex flex-wrap justify-between gap-4 items-center"><div><h1 className="text-2xl font-bold text-primary-navy">Historial de Semestres</h1><p className="text-slate-500">Asignaturas, grupos y docentes conservados por semestre.</p></div><button className={boton} onClick={() => abrir('cambio')} disabled={!panel || ocupado}>Cambiar semestre</button></div>
    {panel && <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3"><CalendarDays className="text-primary-blue" /><div><strong>Semestre actual: {nombre(panel.actual)}</strong><p className="text-sm">Los usuarios se vinculan al semestre a traves de sus grupos. Las cuentas se conservan.</p>
      <p className="text-sm mt-2">Inicio: {fecha(panel.actual.fechaInicio)} · Fin: {fecha(panel.actual.fechaFin)} (incluye todo el último día, hora de Bolivia).</p>
      {panel.actual.archivadoEn ? <p className="text-sm font-semibold text-primary-navy">Semestre vencido: el PDF y sus asignaciones quedaron archivados. Abra el siguiente semestre para continuar registrando.</p> : <button type="button" className="underline text-sm mt-2 text-primary-blue" onClick={() => abrir('fechas')} disabled={ocupado}>Configurar fechas del semestre</button>}
      <div className="flex flex-wrap gap-3 mt-3"><button className={boton} onClick={() => verPdf(panel.actual)} disabled={cargandoPdf}>Ver PDF actual</button><button className={boton} onClick={() => descargar(panel.actual)}>Descargar listado actual</button><button className="underline text-sm" onClick={() => setSeleccion(panel.actual)}>Ver docentes actuales</button></div></div></div>}
    {error && <p role="alert" className="p-4 rounded-xl bg-red-50 text-red-700">{error}</p>}
    {mensaje && <p role="status" className="p-4 bg-emerald-50 text-emerald-700 rounded-xl">{mensaje}</p>}
    {!panel && !error && <p role="status">Cargando semestres…</p>}
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{panel?.historial.map(s => <article key={s.id} onClick={e => { if (!e.target.closest("button") && !ocupado) void comparar(s.id); }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <p className="text-sm text-slate-500">{fecha(s.fechaInicio)} — {fecha(s.fechaFin)}</p>
      <button className="block text-left w-full rounded-lg focus-visible:outline-primary-blue" onClick={() => comparar(s.id)} disabled={ocupado}><h2 className="text-xl font-bold text-primary-navy">{nombre(s)}</h2><p className="text-sm text-slate-500">{s.simulado ? 'Datos simulados · ejemplo' : 'Semestre finalizado'}</p><p className="text-sm mt-2">{s.observaciones}</p><span className="block text-primary-blue mt-3 font-semibold">Comparar con {nombre(panel.actual)} →</span></button>
      <button className={`${boton} flex gap-2 items-center`} onClick={() => descargar(s)}><Download size={16} />Descargar listado</button><div className="flex gap-3"><button className="text-primary-blue underline text-sm" onClick={() => verPdf(s)} disabled={cargandoPdf}>Ver PDF</button><button className="text-primary-blue underline text-sm" onClick={() => setSeleccion(s)}>Ver listado</button></div>{s.original && <button className="text-sm text-primary-blue underline" onClick={() => descargar(s, true)}>Descargar PDF original</button>}
    </article>)}</div>
    {panel?.historial.length === 0 && <p>Aún no hay semestres finalizados. Registre un histórico con el botón +.</p>}
    {seleccion && <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-lg">Listado de docentes · {nombre(seleccion)}</h2><p className="text-sm text-slate-500">{listado.length} asignaciones {seleccion.simulado ? 'ficticias de demostracion' : 'registradas'}. Una fila por docente, asignatura y grupo.</p></div><button className={boton} onClick={() => verPdf(seleccion)} disabled={cargandoPdf}>Ver PDF del listado</button></div>
      <label className="block text-sm">Buscar docente, CI, asignatura o grupo<input className="block w-full border rounded-lg p-2 mt-1" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escribe para filtrar el listado" /></label>
      {cargandoListado ? <p role="status">Cargando listado...</p> : <div className="max-h-[32rem] overflow-auto border rounded-xl"><table className="w-full text-sm text-left"><thead className="sticky top-0 bg-slate-100"><tr>{['Nombre','Apellido','CI','SIS','Asignatura','Grupo','Correo','Telefono'].map(t => <th key={t} className="p-3 whitespace-nowrap">{t}</th>)}</tr></thead><tbody>{listado.filter(f => Object.values(f).join(' ').toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).map((f,i) => <tr key={`${f.codigo}:${f.grupo}:${f.ci}:${i}`} className="border-t border-slate-100"><td className="p-3">{textoNombre(f.nombre)}</td><td className="p-3">{textoNombre(f.apellido || '-')}</td><td className="p-3">{f.ci || 'Sin dato'}</td><td className="p-3">{f.sis || 'Sin dato'}</td><td className="p-3">{f.codigo} · {textoAsignatura(f.asignatura)}</td><td className="p-3">{f.grupo}</td><td className="p-3">{f.correo || '-'}</td><td className="p-3">{f.telefono || '-'}</td></tr>)}</tbody></table>{!listado.length && <p className="p-4">No hay asignaciones docentes en este semestre.</p>}</div>}
    </div>}
    {visor && <div className="fixed inset-0 z-[60] bg-slate-900/70 p-3 flex items-center justify-center" onKeyDown={e => { if(e.key === 'Escape') setVisor(null); }}><div role="dialog" aria-modal="true" aria-label={`PDF del semestre ${visor.semestre}`} className="bg-white rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden"><div className="p-4 flex items-center justify-between"><strong>Listado de docentes · {visor.semestre}</strong><button autoFocus onClick={() => setVisor(null)} aria-label="Cerrar PDF"><X /></button></div><iframe title={`Listado docente ${visor.semestre}`} src={visor.url} className="flex-1 w-full border-0" /><p className="p-2 text-sm">Si tu navegador no muestra el documento, utiliza Descargar listado.</p></div></div>}
    {detalle && <div className="bg-white border rounded-2xl p-5 space-y-4"><div className="flex justify-between gap-4"><h2 className="font-bold text-lg">{nombre(detalle.seleccionado)} frente a {nombre(detalle.actual)}</h2><button aria-label="Cerrar comparación" onClick={() => setDetalle(null)}><X /></button></div>{detalle.seleccionado.simulado && <p className="text-amber-700">Este histórico es un ejemplo ficticio; sus diferencias no representan cambios reales.</p>}<Diferencias filas={detalle.diferencias} /></div>}
    <button className="fixed bottom-6 right-6 rounded-full bg-primary-blue text-white p-4 shadow-xl z-30" aria-label="Registrar semestre finalizado" onClick={() => abrir('historico')} disabled={!panel}><Plus size={28} /></button>
    {modal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex justify-center items-center p-4" onKeyDown={e => { if (e.key === 'Escape' && !ocupado) setModal(null); }}><div role="dialog" aria-modal="true" aria-labelledby="titulo-semestre" className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto p-6 space-y-4">
      <div className="flex justify-between"><h2 id="titulo-semestre" className="text-xl font-bold">{modal === 'cambio' ? 'Abrir un nuevo semestre' : modal === 'fechas' ? 'Configurar fechas del semestre' : 'Registrar semestre finalizado'}</h2><button ref={cierre} aria-label="Cerrar formulario" disabled={ocupado} onClick={() => setModal(null)}><X /></button></div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <form onSubmit={guardar} className="space-y-4">
        {modal === 'cambio' && <p className="bg-amber-50 p-4 rounded-xl">Al confirmar, {nombre(panel?.actual)} se conservará como histórico. Se crearán los grupos del nuevo semestre con sus docentes. Los estudiantes, ayudantes y exámenes anteriores permanecerán en el histórico y deberán registrarse nuevamente para el nuevo semestre.</p>}
        <label className="block">Nombre del semestre<input className="block w-full border rounded-lg p-2 mt-1" placeholder="1-2027" pattern="[12]-20[0-9]{2}" required value={periodo} disabled={ocupado || !!previa || modal === 'fechas'} onChange={e => setPeriodo(e.target.value)} /></label>
        <div className="grid sm:grid-cols-2 gap-4"><label className="block">Fecha de inicio<input type="date" required value={fechaInicio} disabled={ocupado || !!previa} onChange={e=>setFechaInicio(e.target.value)} className="block w-full border rounded-lg p-2 mt-1" /></label><label className="block">Fecha de fin<input type="date" required min={fechaInicio || undefined} value={fechaFin} disabled={ocupado || !!previa} onChange={e=>setFechaFin(e.target.value)} className="block w-full border rounded-lg p-2 mt-1" /></label></div>
        {modal === 'fechas' && <p className="text-sm text-slate-600">Las fechas son administrables. Si guarda una fecha de fin ya pasada, el listado quedará archivado y no se podrán cambiar las asignaciones de ese semestre.</p>}
        {modal !== 'fechas' && <label className="block">PDF del horario general {modal === 'cambio' && '(opcional: conservar asignaciones actuales)'}<input type="file" accept=".pdf,application/pdf" className="block w-full border rounded-lg p-2 mt-1" required={modal === 'historico'} disabled={ocupado || !!previa} onChange={e => { setArchivo(e.target.files[0] || null); setPrevia(null); }} /></label>}
        {archivo && <p className="text-sm">Seleccionado: {archivo.name}</p>}
        {modal !== 'fechas' && <label className="block">Observaciones (opcional)<textarea className="block w-full border rounded-lg p-2 mt-1" maxLength={2000} value={observaciones} disabled={ocupado} onChange={e => setObservaciones(e.target.value)} /></label>}
        {previa && <div className="space-y-3"><h3 className="font-bold">Revise los cambios antes de confirmar</h3>{previa.avisos.map((a, i) => <p key={i} className="text-amber-700">{a}</p>)}<Diferencias filas={previa.diferencias} /><button type="button" className="underline" onClick={() => setPrevia(null)}>Modificar selección</button></div>}
        <div className="flex justify-end gap-3"><button type="button" disabled={ocupado} onClick={() => setModal(null)}>Cancelar</button><button className={boton} disabled={ocupado}>{ocupado ? 'Procesando…' : modal === 'historico' || modal === 'fechas' ? 'Guardar' : previa ? 'Confirmar cambio de semestre' : 'Revisar cambios'}</button></div>
      </form>
    </div></div>}
  </section>;
}
