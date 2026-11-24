import { createElement, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Download } from 'lucide-react';
import { descargarCsv } from '../../utils/exportarCsv';
import { obtenerFilasReporte } from '../../utils/filasReporte';

// El renderizador recibe todos los registros filtrados, antes de paginarlos.
// Reutiliza las mismas columnas y máscaras que ve el usuario, sin exportar objetos internos.
export default function ReporteLista({ titulo, contenido, as: Contenedor = 'div' }) {
  const [mensaje, setMensaje] = useState('');
  const [exportando, setExportando] = useState(false);
  const exportar = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { cabeceras, filas } = obtenerFilasReporte(renderToStaticMarkup(createElement(MemoryRouter, null, contenido())), titulo);
      if (!filas.length) { setMensaje('No hay registros para generar el reporte.'); return; }
      descargarCsv(titulo, cabeceras, filas);
      setMensaje(`Reporte generado: ${filas.length} registros.`);
    } catch {
      setMensaje('No se pudo generar el reporte. Intenta nuevamente.');
    } finally {
      setExportando(false);
    }
  };
  return <Contenedor className="col-span-full flex flex-wrap items-center justify-end gap-2 py-2 px-2 list-none">
    <button type="button" onClick={exportar} disabled={exportando} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#003770] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60" aria-label={`Exportar reporte de ${titulo}`}>
      <Download size={15} aria-hidden="true" /> {exportando ? 'Generando reporte…' : 'Exportar reporte (CSV)'}
    </button>
    {mensaje && <span role="status" className="text-xs text-slate-600">{mensaje}</span>}
  </Contenedor>;
}

export function TablaConReporte({ titulo, children }) {
  return <>
    <ReporteLista titulo={titulo} contenido={() => children(true)} />
    {children(false)}
  </>;
}
