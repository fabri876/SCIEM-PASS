import { useState } from "react";
import { Camera, ScanLine, Search } from "lucide-react";
import { useOperador } from "../operadorContexto";

export default function CamaraYFormulario() {
  const { fnValidar, fnEscaneoCamara } = useOperador();
  const [strBusqueda, setStrBusqueda] = useState("");
  const [boolHit, setBoolHit] = useState(false);

  const fnEnviar = (e) => {
    e.preventDefault();
    if (!strBusqueda.trim()) return;
    fnValidar(strBusqueda);
  };

  const fnEscanear = () => {
    const ci = fnEscaneoCamara();
    if (ci) {
      setStrBusqueda(ci);
      setBoolHit(true);
      setTimeout(() => setBoolHit(false), 450);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={fnEscanear}
        aria-label="Escáner de código QR. Toca para simular un escaneo"
        className={
          "w-full border-2 border-dashed rounded-2xl py-6 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer " +
          (boolHit ? "border-[#4A97D3] bg-[#F0F6FC]" : "border-slate-200 bg-slate-50 hover:border-[#003770]")
        }
      >
        <div className="relative">
          <Camera className="w-8 h-8 text-slate-400" />
          <span className="absolute -inset-2 rounded-full border border-[#4A97D3]/40 animate-pulse"></span>
        </div>
        <span className="text-xs font-extrabold text-slate-600">Apunta al código QR</span>
        <span className="text-[11px] text-slate-400 font-medium">Toca para simular el escaneo del carnet</span>
      </button>

      <form onSubmit={fnEnviar} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Escanea el QR o ingresa CI / Código SIS..."
            value={strBusqueda}
            onChange={(e) => setStrBusqueda(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20 text-xs font-bold outline-none transition-all"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 h-12 px-6 bg-[#003770] hover:bg-[#124B83] text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          <Search className="w-4 h-4" /> Validar
        </button>
      </form>
    </div>
  );
}