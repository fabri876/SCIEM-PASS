import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, LoaderCircle, RefreshCw, X } from "lucide-react";
import { descargarExamenPasado, obtenerExamenesPasados } from "../../../services/examenesPasadosService";
import useDescargaDocumento from "../../../hooks/useDescargaDocumento";

export default function DocumentosPasadosPanel({ actualizacion }) {
  const [documentos, setDocumentos] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [visor, setVisor] = useState(null);
  const [abriendo, setAbriendo] = useState(null);
  const solicitud = useRef(0);
  const cargaLista = useRef(0);
  const cerrarVisor = useRef(null);
  const { descargar, pendientes, errorDescarga } = useDescargaDocumento();

  const cargar = useCallback(async () => {
    const numero = ++cargaLista.current;
    setCargando(true); setError("");
    try {
      const datos = await obtenerExamenesPasados(pagina * 20, 21);
      if (numero !== cargaLista.current) return;
      setDocumentos(datos.slice(0, 20)); setHayMas(datos.length > 20);
    } catch (e) { if (numero === cargaLista.current) setError(e.message); }
    finally { if (numero === cargaLista.current) setCargando(false); }
  }, [pagina]);
  useEffect(() => { setPagina(0); }, [actualizacion]);
  useEffect(() => { cargar(); return () => { cargaLista.current++; }; }, [cargar, actualizacion]);
  useEffect(() => () => { solicitud.current++; }, []);
  useEffect(() => {
    if (!visor) return;
    const anterior = document.activeElement;
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarVisor.current?.focus();
    function teclado(e) {
      if (e.key === "Escape") setVisor(null);
    }
    document.addEventListener("keydown", teclado);
    return () => {
      URL.revokeObjectURL(visor.url);
      document.body.style.overflow = desbordamiento;
      document.removeEventListener("keydown", teclado);
      anterior?.focus();
    };
  }, [visor]);
  async function ver(documento) {
    const numero = ++solicitud.current;
    setAbriendo(documento.intId); setError("");
    try {
      const blob = await descargarExamenPasado(documento.intId);
      if (numero === solicitud.current) setVisor({ titulo: documento.strNombre, url: URL.createObjectURL(blob) });
    } catch (e) { if (numero === solicitud.current) setError(e.message); }
    finally { if (numero === solicitud.current) setAbriendo(null); }
  }
  return <aside className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col self-start">
    <div className="p-5 border-b border-slate-100 flex justify-between gap-3 items-start">
      <div><h2 className="font-bold text-lg text-[#123F7B]">Documentos cargados</h2><p className="text-sm text-slate-500 mt-1">Revisa el PDF original o descárgalo. Los más recientes aparecen primero.</p></div>
      <button type="button" onClick={cargar} disabled={cargando} aria-label="Actualizar documentos" className="p-2 rounded-lg border text-blue-700 hover:bg-blue-50"><RefreshCw size={18} className={cargando ? "animate-spin" : ""} /></button>
    </div>
    {(error || errorDescarga) && <p role="alert" className="m-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error || errorDescarga}</p>}
    {cargando ? <p role="status" className="p-6 text-sm text-slate-500">Cargando documentos…</p> : <>
      {!documentos.length && !error && <p className="p-6 text-sm text-slate-500">Aún no hay documentos. El primer PDF que guardes aparecerá aquí.</p>}
      <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">{documentos.map(d => <article key={d.intId} className="p-5 hover:bg-slate-50">
        <div className="flex gap-3"><FileText size={22} className="text-blue-700 shrink-0 mt-1" /><div className="min-w-0"><span className="text-xs font-semibold text-blue-700">Gestión {d.strPeriodo}</span><h3 className="font-semibold text-[#123F7B] break-words mt-1">{d.strNombre}</h3>{d.strFecha && <p className="text-xs text-slate-500 mt-1">{d.strFecha}</p>}</div></div>
        <div className="flex flex-wrap gap-2 mt-3 pl-8">
          <button type="button" onClick={() => ver(d)} disabled={abriendo === d.intId} className="inline-flex items-center gap-2 text-sm px-3 py-2 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-50 disabled:cursor-wait">{abriendo === d.intId ? <LoaderCircle size={16} className="animate-spin" /> : <Eye size={16} />}{abriendo === d.intId ? "Abriendo…" : "Ver PDF"}</button>
          <button type="button" onClick={() => descargar(d)} disabled={pendientes.has(d.intId)} aria-busy={pendientes.has(d.intId)} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[#123F7B] text-white disabled:cursor-wait">{pendientes.has(d.intId) ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}{pendientes.has(d.intId) ? "Descargando…" : "Descargar"}</button>
        </div>
      </article>)}</div>
      <nav aria-label="Páginas de documentos cargados" className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 text-sm"><button type="button" disabled={!pagina} onClick={() => setPagina(n => n - 1)} className="border rounded-lg px-3 py-2 disabled:opacity-40">Anterior</button><span>Página {pagina + 1}</span><button type="button" disabled={!hayMas} onClick={() => setPagina(n => n + 1)} className="border rounded-lg px-3 py-2 disabled:opacity-40">Siguiente</button></nav>
    </>}
    {visor && <div className="fixed inset-0 z-[70] bg-slate-900/70 p-3 sm:p-6 flex items-center justify-center"><div role="dialog" aria-modal="true" aria-labelledby="titulo-vista-documento" className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden"><div className="flex items-center justify-between gap-4 p-4 border-b"><h2 id="titulo-vista-documento" className="font-bold text-[#123F7B] truncate">{visor.titulo}</h2><button ref={cerrarVisor} type="button" onClick={() => setVisor(null)} aria-label="Cerrar vista previa" className="p-2 rounded-lg hover:bg-slate-100"><X /></button></div><iframe title={visor.titulo} src={visor.url} className="flex-1 w-full border-0" /><p className="p-3 text-xs text-slate-500">Si el navegador no muestra el PDF, ciérralo y utiliza Descargar.</p></div></div>}
  </aside>;
}
