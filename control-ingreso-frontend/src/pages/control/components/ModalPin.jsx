import { useState } from "react";
import { Lock } from "lucide-react";

export default function ModalPin({ visible, mensaje, fnConfirmar, fnCancelar }) {
  const [strPin, setStrPin] = useState("");
  if (!visible) return null;

  const fnEnviar = (e) => {
    e.preventDefault();
    const ok = fnConfirmar(strPin.trim());
    if (ok === true) setStrPin("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={fnEnviar} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#003770] text-white mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-[#003770] text-center">Pantalla bloqueada</h3>
        <p className="text-xs font-semibold text-slate-500 text-center">
          Inactividad detectada. El escaneo de fondo y la sincronización siguen activos. Ingresa tu PIN para
          continuar.
        </p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          autoFocus
          placeholder="PIN 4–6 dígitos"
          value={strPin}
          onChange={(e) => setStrPin(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20 text-xs font-bold outline-none transition-all text-center tracking-widest"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fnCancelar}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cerrar sesión
          </button>
          <button
            type="submit"
            className="flex-1 h-11 rounded-xl bg-[#003770] hover:bg-[#124B83] text-white font-extrabold text-xs transition-colors cursor-pointer"
          >
            Desbloquear
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-semibold text-center">{mensaje}</p>
      </form>
    </div>
  );
}