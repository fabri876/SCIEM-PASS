import { useState, useEffect } from "react";
import { Lock, ShieldCheck, KeyRound } from "lucide-react";
import { derivarHashPin } from "../../../offline/pinCrypto.js";
import { pinService } from "../../../offline/pinService.js";

/**
 * MODAL PARA CONFIGURACIÓN INICIAL O CAMBIO DE PIN — SCIEM-PASS
 *
 * Deriva un hash seguro con PBKDF2 y sal por idUsuario localmente,
 * y lo persiste en IndexedDB (tabla `configUsuario`).
 *
 * @param {Object} props
 * @param {boolean} props.visible - Controla si el modal es visible
 * @param {number|string} props.idUsuario - Identificador del usuario actual
 * @param {Function} props.onGuardar - Callback invocado tras guardar exitosamente
 * @param {Function} props.onCancelar - Callback invocado al cancelar
 */
export default function ConfigurarPin({ visible, idUsuario, onGuardar, onCancelar }) {
  const [pin, setPin] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPin("");
      setPinConfirmar("");
      setError("");
      setCargando(false);
    }
  }, [visible]);

  if (!visible) return null;

  const fnEnviar = async (e) => {
    e.preventDefault();
    setError("");

    const pinLimpio = pin.trim();
    const pinConfirmarLimpio = pinConfirmar.trim();

    if (!/^\d{4,6}$/.test(pinLimpio)) {
      setError("El PIN debe tener entre 4 y 6 dígitos numéricos.");
      return;
    }

    if (pinLimpio !== pinConfirmarLimpio) {
      setError("Los dígitos del PIN de confirmación no coinciden.");
      return;
    }

    if (!idUsuario) {
      setError("No se identificó la sesión del operador. Vuelve a iniciar sesión.");
      return;
    }

    setCargando(true);
    try {
      const pinHash = await derivarHashPin(pinLimpio, idUsuario);
      await pinService.guardarConfig({
        idUsuario,
        pinHash,
        intentosFallidos: 0,
        sesionBloqueada: false,
        bloqueadoHasta: null,
      });

      if (typeof onGuardar === "function") {
        await onGuardar(pinHash);
      }
    } catch (err) {
      setError(err?.message || "No se pudo guardar la configuración del PIN.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={fnEnviar} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#003770] text-white mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-black text-[#003770] text-center">Configurar PIN</h3>
        <p className="text-xs font-semibold text-slate-500 text-center">
          Crea tu PIN de 4 a 6 dígitos para proteger la pantalla ante inactividad durante tu turno.
        </p>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Nuevo PIN (4 a 6 dígitos)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPin(val);
                setError("");
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20 text-sm font-bold outline-none transition-all text-center tracking-widest"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Confirmar PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              placeholder="••••"
              value={pinConfirmar}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPinConfirmar(val);
                setError("");
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20 text-sm font-bold outline-none transition-all text-center tracking-widest"
            />
          </div>
        </div>

        {error && (
          <p className="text-[11px] font-semibold text-[#B91C1C] text-center">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={cargando}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={cargando || pin.length < 4 || pinConfirmar.length < 4 || pin !== pinConfirmar}
            className="flex-1 h-11 rounded-xl bg-[#003770] hover:bg-[#124B83] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs transition-colors cursor-pointer"
          >
            {cargando ? "Guardando..." : "Guardar PIN"}
          </button>
        </div>
      </form>
    </div>
  );
}
