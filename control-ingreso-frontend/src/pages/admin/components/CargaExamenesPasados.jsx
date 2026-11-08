import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { guardarExamenPasado } from "../../../services/examenesPasadosService";
import DocumentosPasadosPanel from "./DocumentosPasadosPanel";

const inicial = { strNombre: "", strPeriodo: "", strFecha: "", strObservaciones: "" };
const control = "w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function CargaExamenesPasados() {
  const [datos, setDatos] = useState(inicial);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [actualizacion, setActualizacion] = useState(0);
  const input = useRef(null);
  const campo = e => { setDatos(d => ({ ...d, [e.target.name]: e.target.value })); setExito(""); };
  function quitar() { setArchivo(null); if (input.current) input.current.value = ""; }
  function limpiar() { setDatos(inicial); quitar(); setError(""); setExito(""); }
  function elegir(f) {
    quitar(); setError(""); setExito("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf") || !f.size || f.size > 10 * 1024 * 1024) {
      setError("Selecciona un PDF de hasta 10 MB."); return;
    }
    setArchivo(f);
    const gestion = f.name.match(/(20[0-9]{2})[-_ ]([12])(?:[-_ .]|$)/);
    setDatos(d => ({ ...d,
      strNombre: d.strNombre || f.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "),
      strPeriodo: d.strPeriodo || (gestion ? `${gestion[2]}-${gestion[1]}` : ""),
    }));
  }
  async function guardar(e) {
    e.preventDefault(); if (guardando) return;
    setError(""); setExito("");
    if (!archivo) { setError("Selecciona un PDF."); return; }
    setGuardando(true);
    try {
      const formulario = new FormData();
      Object.entries(datos).forEach(([clave, valor]) => { if (valor) formulario.append(clave, valor.trim()); });
      formulario.append("archivoPdf", archivo);
      await guardarExamenPasado(formulario);
      limpiar(); setExito("PDF guardado. Ya está disponible en Exámenes pasados para todos los visitantes.");
      setActualizacion(n => n + 1);
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }
  return <section className="w-full">
    <p className="text-sm text-slate-600 mb-5">Biblioteca de consulta. Cada PDF se guarda por separado, sin crear exámenes, inscripciones ni asignaciones académicas.</p>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 text-red-700 p-3">{error}</p>}
    {exito && <p role="status" className="mb-4 rounded-lg bg-green-50 text-green-800 p-3">{exito}</p>}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
    <form onSubmit={guardar} className="min-w-0 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="font-bold text-lg text-[#123F7B] mb-5">Cargar nuevo documento</h2>
      <fieldset disabled={guardando} className="space-y-5">
        <div>
          <label className="block border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl p-5 cursor-pointer hover:bg-blue-100">
            <span className="flex gap-2 items-center font-bold text-[#123F7B]"><Upload size={20} />{archivo ? "Cambiar PDF seleccionado" : "Seleccionar PDF del examen"}</span>
            <span className="block text-sm text-slate-600 mt-1">Un archivo PDF de hasta 10 MB. Revisa el título y la gestión antes de guardar.</span>
            <input ref={input} type="file" accept=".pdf,application/pdf" className="sr-only" aria-label="Seleccionar PDF del examen" onChange={e => elegir(e.target.files?.[0])} />
          </label>
          {archivo && <div className="flex items-center gap-2 mt-3 text-sm"><FileText size={18} /><span className="break-all flex-1">{archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB</span><button type="button" onClick={quitar} aria-label="Quitar archivo"><X size={20} /></button></div>}
        </div>
        <label className="block text-sm font-semibold text-[#123F7B]">Título del documento *<input name="strNombre" value={datos.strNombre} onChange={campo} required maxLength={200} placeholder="Primer examen de ingreso FCyT 2-2026" className={control} /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-semibold text-[#123F7B]">Gestión *<input name="strPeriodo" value={datos.strPeriodo} onChange={campo} required pattern="[12]-[12][0-9]{3}" placeholder="2-2026" title="Formato 1-2026 o 2-2026" className={control} /></label>
          <label className="block text-sm font-semibold text-[#123F7B]">Fecha exacta (opcional)<input name="strFecha" type="date" value={datos.strFecha} onChange={campo} className={control} /><span className="block text-xs text-slate-500 mt-1">Déjala vacía si no figura en el documento.</span></label>
        </div>
        <label className="block text-sm font-semibold text-[#123F7B]">Descripción o fuente (opcional)<textarea name="strObservaciones" value={datos.strObservaciones} onChange={campo} maxLength={2000} rows={3} className={control} /><span className="block text-xs text-slate-500 mt-1">Esta información será pública junto al documento.</span></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={limpiar} className="rounded-lg border px-4 py-2">Limpiar</button><button type="submit" className="rounded-lg bg-[#123F7B] text-white font-bold px-4 py-2 disabled:opacity-50">{guardando ? "Guardando PDF…" : "Guardar documento"}</button></div>
      </fieldset>
    </form>
    <DocumentosPasadosPanel actualizacion={actualizacion} />
    </div>
  </section>;
}
