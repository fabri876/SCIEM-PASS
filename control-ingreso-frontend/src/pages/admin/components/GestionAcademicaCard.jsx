import React, { useState, useEffect, useCallback, useRef } from "react";
import { obtenerAsignaturas, crearAsignatura, crearGrupo,
  previsualizarHorario, confirmarHorario, vincularUsuario } from "../../../services/grupoService";
import { UploadCloud, FileText, Loader2, BookOpen, X } from "lucide-react";
import SeleccionGrupoLote from "../../../components/common/SeleccionGrupoLote";
import { createPortal } from "react-dom";
import VentanaEmergente from "../../../components/common/VentanaEmergente";

const input = "w-full mt-1 p-2.5 border border-border rounded-xl bg-bg-app text-primary-navy focus:outline-none focus:ring-2 focus:ring-primary-blue/30";
const boton = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-blue text-white font-bold hover:bg-primary-navy transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary-blue focus-visible:outline-offset-2";

export default function GestionAcademicaCard({ docentes = [], onCatalogChange }) {
  const [asignaturas, setAsignaturas] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [sigla, setSigla] = useState("");
  const [idAsignatura, setIdAsignatura] = useState("");
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [idDocente, setIdDocente] = useState("");
  const [grupoDocente, setGrupoDocente] = useState(null);
  const [versionCatalogo, setVersionCatalogo] = useState(0);
  const inputArchivo = useRef(null);
  const quitarArchivo = () => { setArchivo(null); setPreview(null); if (inputArchivo.current) inputArchivo.current.value = ""; };
  useEffect(() => {
    if (!preview) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const cerrarConEscape = e => { if (e.key === "Escape" && !ocupado) quitarArchivo(); };
    document.addEventListener("keydown", cerrarConEscape);
    return () => { document.body.style.overflow = overflowAnterior; document.removeEventListener("keydown", cerrarConEscape); };
  }, [preview, ocupado]);
  const cargar = useCallback(async () => {
    setAsignaturas(await obtenerAsignaturas());
  }, []);
  useEffect(() => {
    let activo = true;
    const iniciar = async () => { await cargar(); };
    iniciar().catch(e => { if (activo) setError(e.message); }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [cargar]);
  const ejecutar = async (accion) => {
    setOcupado(true); setError(""); setMensaje("");
    try { await accion(); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  };
  const actualizarCatalogo = () => {
    setVersionCatalogo(v => v + 1); onCatalogChange?.();
    cargar().catch(() => setError("Los cambios se guardaron, pero no se pudo actualizar la lista. Recargue el panel."));
  };
  const verHorario = () => ejecutar(async () => {
    setPreview(null);
    const data = await previsualizarHorario(archivo); setPreview(data);
  });
  const importar = () => ejecutar(async () => {
    const resultado = await confirmarHorario(archivo);
    quitarArchivo();
    setMensaje(`Horario procesado: ${resultado.asignaturasCreadas} asignaturas y ${resultado.gruposCreados} grupos nuevos. Ya existían ${resultado.asignaturasExistentes} asignaturas y ${resultado.gruposExistentes} grupos: se conservaron sin duplicarlos.`);
    actualizarCatalogo();
  });
  return <section id="gestion-academica" className="scroll-mt-28 bg-bg-card p-6 border border-border rounded-2xl shadow-sm space-y-6 text-body text-text-body">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-primary-blue/10 p-2 text-primary-blue"><BookOpen size={22} /></span><div><h2 className="text-card-title font-extrabold text-primary-navy">Asignaturas y grupos</h2>
      <p className="text-sm mt-1">Cargue el horario del semestre o registre cambios individuales. Las personas se registran en Gestión de Usuarios.</p></div>
    </div>
    {error && <p role="alert" className="text-accent-red font-semibold">{error}</p>}
    {mensaje && <p role="status" className="text-green-700 font-semibold">{mensaje}</p>}
    {cargando && <p>Cargando catálogo académico…</p>}
    <fieldset disabled={ocupado} className="space-y-4 border border-border rounded-2xl p-4">
      <legend className="px-2 font-bold text-primary-navy">Importar horario PDF</legend>
      <p className="text-sm">Se registran únicamente el código, la asignatura y sus grupos. Los nombres de docentes y auxiliares se descartan.</p>
      <label className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors focus-within:ring-2 focus-within:ring-primary-blue/40 ${ocupado ? "opacity-60" : "cursor-pointer hover:border-primary-blue hover:bg-primary-blue/5"} ${archivo ? "border-primary-blue bg-primary-blue/5" : "border-primary-blue/40 bg-bg-app"}`}>
        {archivo ? <FileText className="text-primary-blue" size={30} /> : <UploadCloud className="text-primary-blue" size={30} />}
        <span className="font-bold text-primary-navy">{archivo ? archivo.name : "Seleccionar horario PDF"}</span>
        <span className="text-secondary">{archivo ? `${(archivo.size / 1024 / 1024).toFixed(2)} MB · Pulse para cambiar el archivo` : "Pulse aquí para elegir un archivo · PDF hasta 10 MB"}</span>
        <input ref={inputArchivo} className="sr-only" type="file" accept=".pdf" aria-label="Seleccionar horario PDF" onChange={e => { const f = e.target.files?.[0]; quitarArchivo(); setError(""); if (!f) return; if (!f.name.toLowerCase().endsWith(".pdf") || f.size > 10 * 1024 * 1024) { setError("Seleccione un horario PDF de hasta 10 MB."); return; } setArchivo(f); }} />
      </label>
      {archivo && <button type="button" disabled={ocupado} onClick={quitarArchivo} className="inline-flex items-center gap-2 text-accent-red font-bold"><X size={16} />Quitar archivo</button>}
      <p className="text-secondary">1. Seleccione el PDF. 2. Revise asignaturas y grupos. 3. Confirme la carga.</p>
      <button className={boton} disabled={!archivo || ocupado} onClick={verHorario}>{ocupado && <Loader2 className="animate-spin" size={16} />}Revisar horario</button>
      {!archivo && <p className="text-secondary">El botón se habilita al seleccionar un archivo.</p>}
    </fieldset>
    {preview && createPortal(<VentanaEmergente boolAbierto onCerrar={() => { if (!ocupado) setPreview(null); }} strMaxWidth="max-w-6xl">
      <div className="p-5 sm:p-7 space-y-4" role="dialog" aria-modal="true" aria-labelledby="titulo-horario">
        <div className="flex items-center justify-between gap-3"><h2 id="titulo-horario" className="text-card-title font-extrabold text-primary-navy">Vista previa del horario</h2>
          <button autoFocus type="button" disabled={ocupado} onClick={quitarArchivo} className="px-3 py-2 rounded-xl text-primary-navy hover:bg-bg-app">Cerrar</button></div>
        <p className="text-secondary">{preview.filas.length} grupos de {new Set(preview.filas.map(f => f.codigoAsignatura)).size} asignaturas. Los grupos repetidos se muestran una sola vez por materia.</p>
        {error && <p role="alert" className="text-accent-red font-bold">{error}</p>}
        <p className="text-secondary">Después podrá registrar docentes con sus asignaturas y grupos, individualmente o mediante Excel.</p>
        <div className="overflow-auto max-h-[55vh] border border-border rounded-xl"><table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-bg-app text-primary-navy"><tr><th className="p-3">Código</th><th className="p-3">Asignatura</th><th className="p-3">Grupo</th></tr></thead>
          <tbody>{preview.filas.map(f => <tr key={`${f.codigoAsignatura}-${f.nombreGrupo}`} className="border-t border-border">
            <td className="p-3">{f.codigoAsignatura}</td>
            <td className="p-3 font-semibold text-primary-navy">{f.nombreAsignatura}</td>
            <td className="p-3 whitespace-nowrap">{f.nombreGrupo}</td>
          </tr>)}</tbody>
        </table></div>
        {ocupado && <p role="status" className="text-secondary text-primary-blue font-bold">Guardando asignaturas y grupos… La ventana se cerrará al terminar.</p>}
        <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={ocupado} onClick={quitarArchivo} className="px-4 py-2 rounded-xl border border-border text-primary-navy">Volver y quitar archivo</button>
          <button className={boton} disabled={ocupado} onClick={importar}>{ocupado && <Loader2 className="animate-spin" size={16} />}Confirmar y guardar horario</button></div>
      </div>
    </VentanaEmergente>, document.body)}
    <div className="grid grid-cols-1 gap-4">
      <form className="border rounded-xl p-4 space-y-3" onSubmit={e => { e.preventDefault(); ejecutar(async () => {
        await crearAsignatura({ codigo: Number(codigo), nombre, sigla }); setCodigo(""); setNombre(""); setSigla("");
        setMensaje("Asignatura guardada. Ahora puede crear sus grupos."); actualizarCatalogo();
      }); }}>
        <h3 className="font-bold">Nueva asignatura</h3>
        <label className="block">Código oficial<input required type="number" min="1" value={codigo} onChange={e => setCodigo(e.target.value)} className={input} /></label>
        <label className="block">Nombre<input required maxLength={255} value={nombre} onChange={e => setNombre(e.target.value)} className={input} /></label>
        <label className="block">Sigla (opcional)<input maxLength={50} value={sigla} onChange={e => setSigla(e.target.value)} className={input} /></label>
        <button disabled={ocupado || cargando} className={boton}>Guardar asignatura</button>
      </form>
      <form className="border rounded-xl p-4 space-y-3" onSubmit={e => { e.preventDefault(); ejecutar(async () => {
        await crearGrupo({ idAsignatura: Number(idAsignatura), nombreGrupo }); setNombreGrupo("");
        setMensaje("Grupo guardado. Puede asignarle un docente ahora o después."); actualizarCatalogo();
      }); }}>
        <h3 className="font-bold">Nuevo grupo</h3>
        <label className="block">Asignatura<select required value={idAsignatura} onChange={e => setIdAsignatura(e.target.value)} className={input}>
          <option value="">Seleccione una asignatura</option>{asignaturas.map(a => <option key={a.idAsignatura} value={a.idAsignatura}>ID {a.idAsignatura}{a.codigoOficial ? ` · Código ${a.codigoOficial}` : ""} · {a.nombreAsignatura}</option>)}
        </select></label>
        <label className="block">Nombre del grupo<input required maxLength={50} placeholder="Ej.: 2, 14, C1 o 6A" value={nombreGrupo} onChange={e => setNombreGrupo(e.target.value)} className={input} /></label>
        <button disabled={ocupado || cargando} className={boton}>Guardar grupo</button>
      </form>
    </div>
    <form className="rounded-xl border border-border p-4 space-y-4" onSubmit={e => { e.preventDefault(); ejecutar(async () => {
      const resultado = await vincularUsuario({ idUsuario: Number(idDocente), rol: "DOCENTE", idGrupos: [grupoDocente.idGrupo] });
      setMensaje(resultado.mensaje);
      setGrupoDocente(null); actualizarCatalogo();
    }); }}>
      <h3 className="font-bold text-primary-navy">Asignar un docente registrado</h3>
      <p className="text-secondary">Para nuevos grupos o cambios posteriores al registro del docente.</p>
      <label className="block text-secondary font-bold">Docente<select required disabled={ocupado} value={idDocente} onChange={e => setIdDocente(e.target.value)} className={input}>
        <option value="">Seleccione un docente</option>
        {docentes.filter(d => d.estado !== false).map(d => <option key={d.idUsuario} value={d.idUsuario}>{d.nombre} {d.apellido} · SIS {d.codigoSis}</option>)}
      </select></label>
      <SeleccionGrupoLote value={grupoDocente} onChange={setGrupoDocente} disabled={ocupado} revision={versionCatalogo} />
      <button type="submit" disabled={ocupado || !idDocente || !grupoDocente} className={boton}>Asignar docente</button>
    </form>
  </section>;
}
