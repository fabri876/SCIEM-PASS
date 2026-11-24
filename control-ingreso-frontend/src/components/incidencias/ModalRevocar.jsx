import { textoInterfaz } from '../../utils/textoInterfaz.js';
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function ModalRevocar({ boolAbierto, onCerrar, onConfirmar, boolGuardando = false, titulo = "Revocar incidencia", error = "" }) {
  const [strMotivo, setStrMotivo] = useState("");
  const [strError, setStrError] = useState("");
  // Límite de la columna "incidencia.resolucion" (varchar 255) en PostgreSQL.
  const MOTIVO_MAX = 255;

  useEffect(() => {
    if (boolAbierto) {
      setStrMotivo("");
      setStrError("");
    }
  }, [boolAbierto]);

  useEffect(() => {
    if (!boolAbierto) return;
    const fnTecla = (e) => {
      if (e.key === "Escape" && !boolGuardando) {
        e.preventDefault();
        onCerrar();
      }
    };
    window.addEventListener("keydown", fnTecla);
    return () => window.removeEventListener("keydown", fnTecla);
  }, [boolAbierto, boolGuardando, onCerrar]);

  if (!boolAbierto) return null;

  const fnEnviar = (e) => {
    if (e) e.preventDefault();
    if (strMotivo.trim().length < 15) {
      setStrError("El motivo es obligatorio (mínimo 15 caracteres).");
      return;
    }
    onConfirmar(strMotivo.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-[#CBD5E1]">
        <div className="p-5 border-b border-[#CBD5E1] flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-[#003770]">{titulo}</h3>
          <button type="button" onClick={onCerrar} disabled={boolGuardando} className="text-[#9AA8BA] hover:text-[#64748B] p-1.5 rounded-full hover:bg-[#F1F5F9]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={fnEnviar} className="p-5 space-y-3">
          <label className="block text-[11px] font-extrabold tracking-wider text-[#64748B]">
            Motivo de la revocación <span className="text-[#B91C1C]">*</span>
          </label>
          <div className="relative">
            <textarea
              value={strMotivo}
              onChange={(e) => setStrMotivo(e.target.value)}
              rows={3}
              maxLength={MOTIVO_MAX}
              placeholder="Explica por qué se revoca..."
              className="w-full bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-3 text-xs font-medium text-[#08264A] placeholder-[#9AA8BA] focus:outline-none focus:border-[#4A97D3] transition"
            />
            <span className={`absolute bottom-2 right-3 text-[10px] font-mono font-bold ${strMotivo.trim().length >= 15 ? "text-[#9AA8BA]" : "text-[#B91C1C]"}`}>
              {textoInterfaz(strMotivo.length)}/{textoInterfaz(MOTIVO_MAX)} (mín. 15)
            </span>
          </div>
          {strError && <p className="text-[11px] text-[#B91C1C] font-bold">{textoInterfaz(strError)}</p>}
          {error && (
            <p className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[11px] font-bold text-[#B91C1C] leading-snug">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} disabled={boolGuardando} className="flex-1 bg-white hover:bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] py-2.5 px-4 rounded-xl font-bold text-xs">
              Cancelar
            </button>
            <button type="submit" disabled={boolGuardando} className="flex-[1.5] bg-[#B91C1C] hover:bg-[#991B1B] text-white py-2.5 px-4 rounded-xl font-bold text-xs disabled:opacity-45">
              {boolGuardando ? "Revocando..." : "Revocar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}