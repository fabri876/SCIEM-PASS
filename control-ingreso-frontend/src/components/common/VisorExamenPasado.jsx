import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { descargarExamenPasado } from "../../services/examenesPasadosService";

export default function VisorExamenPasado({ documento, onCerrar }) {
  const [url,setUrl]=useState("");
  const [error,setError]=useState("");
  const cerrar=useRef(null);
  useEffect(()=>{
    let activo=true, recurso;
    const foco=document.activeElement, overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    cerrar.current?.focus();
    descargarExamenPasado(documento.intId).then(blob=>{
      if(activo){recurso=URL.createObjectURL(blob);setUrl(recurso);}
    }).catch(()=>{if(activo)setError("No se pudo abrir el PDF del examen. Intenta nuevamente.");});
    const teclado=e=>{if(e.key==="Escape")onCerrar();};
    document.addEventListener("keydown",teclado);
    return()=>{activo=false;if(recurso)URL.revokeObjectURL(recurso);document.body.style.overflow=overflow;document.removeEventListener("keydown",teclado);foco?.focus();};
  },[documento.intId,onCerrar]);
  return createPortal(<div className="fixed inset-0 z-[100] bg-slate-900/70 p-3 sm:p-6 flex items-center justify-center">
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-pdf-publico" className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center gap-3 p-4 border-b"><h2 id="titulo-pdf-publico" className="font-bold truncate">{documento.strNombre}</h2><button ref={cerrar} type="button" onClick={onCerrar} className="p-2 border rounded-lg">Cerrar vista previa</button></div>
      {error ? <p role="alert" className="p-5 text-red-700">{error}</p> : url ? <iframe title={documento.strNombre} src={url} className="flex-1 w-full border-0" /> : <p role="status" className="p-5">Abriendo PDF…</p>}
    </section>
  </div>,document.body);
}
