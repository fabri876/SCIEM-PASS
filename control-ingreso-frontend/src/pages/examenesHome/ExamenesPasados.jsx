import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Download, LoaderCircle } from "lucide-react";
import Header from "../../components/layout/Header";
import { ExamenesSkeleton, ExamenesError, ExamenesVacio } from "../../components/examenes/examenesHome/ExamenesEstados";
import { obtenerExamenesPasados } from "../../services/examenesPasadosService";
import useDescargaDocumento from "../../hooks/useDescargaDocumento";

const TAMANO = 20;
export default function ExamenesPasados() {
  const [documentos, setDocumentos] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const { descargar, pendientes, errorDescarga } = useDescargaDocumento();
  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try { const datos = await obtenerExamenesPasados(pagina * TAMANO, TAMANO + 1); setDocumentos(datos.slice(0, TAMANO)); setHayMas(datos.length > TAMANO); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [pagina]);
  useEffect(() => { cargar(); }, [cargar]);
  return <div className="min-h-screen bg-[#F4F6FC]"><Header />
    <main className="max-w-[920px] mx-auto px-5 md:px-8 py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><div><h1 className="text-2xl font-extrabold text-[#123F7B]">Exámenes pasados</h1><p className="text-sm text-slate-600 mt-1">Documentos de consulta por gestión. Descarga el PDF original sin iniciar sesión.</p></div><Link to="/examenes" className="text-blue-700 border rounded-lg px-4 py-2">Volver a próximos</Link></div>
      {errorDescarga && <p role="alert" className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg">{errorDescarga}</p>}
      {cargando ? <ExamenesSkeleton intCantidad={4} /> : error ? <ExamenesError strMensaje={error} fnReintentar={cargar} /> : <>
        {!documentos.length && <ExamenesVacio strTitulo="No hay documentos en esta página" strDescripcion="Los PDFs publicados por el administrador aparecerán aquí." />}
        <div className="space-y-4">{documentos.map(d => <article key={d.intId} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
          <FileText className="text-blue-700 shrink-0" size={30} /><div className="flex-1 min-w-0"><p className="text-sm text-slate-500">Gestión {d.strPeriodo}{d.strFecha ? ` · ${d.strFecha}` : ""}</p><h2 className="text-lg font-bold text-[#123F7B] break-words">{d.strNombre}</h2>{d.strObservaciones && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{d.strObservaciones}</p>}</div>
          <button type="button" disabled={pendientes.has(d.intId)} aria-busy={pendientes.has(d.intId)} onClick={() => descargar(d)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123F7B] text-white px-4 py-2 font-semibold disabled:cursor-wait">{pendientes.has(d.intId) ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}{pendientes.has(d.intId) ? "Descargando…" : "Descargar PDF"}</button>
        </article>)}</div>
        <nav aria-label="Páginas de documentos" className="flex items-center justify-center gap-4 mt-6"><button type="button" disabled={!pagina} onClick={() => setPagina(n => n - 1)} className="border rounded-lg px-4 py-2 disabled:opacity-40">Anterior</button><span>Página {pagina + 1}</span><button type="button" disabled={!hayMas} onClick={() => setPagina(n => n + 1)} className="border rounded-lg px-4 py-2 disabled:opacity-40">Siguiente</button></nav>
      </>}
    </main>
  </div>;
}
