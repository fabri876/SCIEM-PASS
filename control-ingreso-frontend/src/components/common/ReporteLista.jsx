import { createElement, useState, useEffect, useRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Download } from 'lucide-react';
import { descargarCsv } from '../../utils/exportarCsv';
import { obtenerFilasReporte } from '../../utils/filasReporte';

// El renderizador recibe todos los registros filtrados, antes de paginarlos.
// Reutiliza las mismas columnas y máscaras que ve el usuario, sin exportar objetos internos.
export default function ReporteLista({ titulo, contenido, datos, filtros = [], as: Contenedor = 'div' }) {
  const contenedor = useRef(null);
  const [mensaje, setMensaje] = useState(null);
  const [exportando, setExportando] = useState(false);
  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(() => setMensaje(null), 5000);
    return () => clearTimeout(temporizador);
  }, [mensaje]);
  const claveFiltros = JSON.stringify([titulo, filtros]);
  const avisar = texto => setMensaje({ texto, claveFiltros });
  const exportar = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      setMensaje(null);
      let reporte;
      if (datos) reporte = datos();
      else {
        const { renderToStaticMarkup } = await import('react-dom/server');
        reporte = obtenerFilasReporte(renderToStaticMarkup(createElement(MemoryRouter, null, contenido())), titulo);
      }
      const { cabeceras, filas } = reporte;
      if (!filas.length) { avisar('No hay registros para generar el reporte.'); return; }
      const contexto = contenedor.current?.closest('section') || contenedor.current?.parentElement;
      const filtrosVisibles = filtros.length ? filtros : Array.from(contexto?.querySelectorAll('select, input[type="search"], input[type="text"], [aria-pressed="true"], [aria-selected="true"]') || [])
        .map(el => el.tagName === 'SELECT' ? el.selectedOptions[0]?.textContent : el.value || el.textContent).filter(Boolean);
      descargarCsv(titulo, cabeceras, filas, filtrosVisibles);
      avisar(`Reporte generado: ${filas.length} registros.`);
    } catch {
      avisar('No se pudo generar el reporte. Intenta nuevamente.');
    } finally {
      setExportando(false);
    }
  };
  return <Contenedor ref={contenedor} className="col-span-full flex flex-wrap items-center justify-start gap-2 py-2 px-2 list-none">
    <button type="button" onClick={exportar} disabled={exportando} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#003770] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60" aria-label={`Exportar reporte de ${titulo}`}>
      <Download size={15} aria-hidden="true" /> {exportando ? 'Generando reporte…' : 'Exportar reporte (CSV)'}
    </button>
    {mensaje?.claveFiltros === claveFiltros && <span role="status" className="text-xs text-slate-600">{mensaje.texto}</span>}
  </Contenedor>;
}

export function TablaConReporte({ titulo, children, ...opciones }) {
  return <>
    <ReporteLista titulo={titulo} contenido={() => children(true)} {...opciones} />
    {children(false)}
  </>;
}
