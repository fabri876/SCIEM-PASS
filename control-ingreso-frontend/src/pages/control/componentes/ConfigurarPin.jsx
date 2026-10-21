import { useState, useEffect } from "react";
import { pinService } from "../../../offline/pinService";

/**
 * Compara un texto plano contra un hash SHA-256 hexadecimal.
 */
async function compararHash(textoPlano, hashHex) {
  const encoder = new TextEncoder();
  const data = encoder.encode(textoPlano);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashCalculado = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashCalculado === hashHex;
}

/**
 * Genera el hash SHA-256 de un texto.
 */
async function generarHash(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Modal para configurar el PIN de desbloqueo por primera vez.
 * Genera el hash SHA-256 localmente y lo guarda en IndexedDB.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Mostrar u ocultar el modal
 * @param {number|string} props.idUsuario - ID del usuario actual
 * @param {Function} props.onGuardar(pinHash) - Callback al guardar exitosamente
 * @param {Function} props.onCancelar - Callback al cancelar
 */
export default function ConfigurarPin({ visible, idUsuario, onGuardar, onCancelar }) {
  const [pin, setPin] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const fnAgregarDigito = (campo, d) => {
    setError("");
    if (campo === "pin") {
      if (pin.length < 4) setPin(pin + d);
    } else {
      if (pinConfirmar.length < 4) setPinConfirmar(pinConfirmar + d);
    }
  };

  const fnBorrar = (campo) => {
    setError("");
    if (campo === "pin") setPin(pin.slice(0, -1));
    else setPinConfirmar(pinConfirmar.slice(0, -1));
  };

  const fnEnviar = async (e) => {
    e.preventDefault();
    setError("");
    if (pin.length !== 4 || pinConfirmar.length !== 4) {
      setError("Ambos PIN deben tener 4 dígitos");
      return;
    }
    if (pin !== pinConfirmar) {
      setError("Los PIN no coinciden");
      return;
    }
    setCargando(true);
    try {
      const pinHash = await generarHash(pin);
      await pinService.guardarConfig({ idUsuario, pinHash });
      if (typeof onGuardar === "function") {
        await onGuardar(pinHash);
      }
    } catch (err) {
      setError(err.message || "Error al configurar el PIN");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setPin("");
      setPinConfirmar("");
      setError("");
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-[#08264A] mb-4">Configurar PIN</h2>
        <p className="text-sm text-[#64748B] mb-6">
          Crea tu PIN de 4 dígitos para desbloquear la sesión tras inactividad.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#64748B] font-medium">Nuevo PIN</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength="1"
                  readOnly
                  value={pin[i] || ""}
                  className="w-10 h-12 text-center text-lg font-mono border border-[#CBD5E1] rounded-lg focus:border-[#08264A] focus:ring-2 focus:ring-[#08264A]/50"
                  onKeyDown={(ev) => {
                    if (ev.key >= "0" && ev.key <= "9") {
                      ev.preventDefault();
                      fnAgregarDigito("pin", ev.key);
                    }
                    if (ev.key === "Backspace") fnBorrar("pin");
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#64748B] font-medium">Confirmar PIN</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength="1"
                  readOnly
                  value={pinConfirmar[i] || ""}
                  className="w-10 h-12 text-center text-lg font-mono border border-[#CBD5E1] rounded-lg focus:border-[#08264A] focus:ring-2 focus:ring-[#08264A]/50"
                  onKeyDown={(ev) => {
                    if (ev.key >= "0" && ev.key <= "9") {
                      ev.preventDefault();
                      fnAgregarDigito("confirmar", ev.key);
                    }
                    if (ev.key === "Backspace") fnBorrar("confirmar");
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-[#B91C1C] mb-4">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#64748B]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={fnEnviar}
            disabled={cargando || pin.length < 4 || pinConfirmar.length < 4 || pin !== pinConfirmar}
            className="flex-1 py-2.5 rounded-lg bg-[#08264A] text-white text-sm disabled:opacity-50 hover:bg-[#0a3d62] transition-colors"
          >
            Guardar PIN
          </button>
        </div>
      </div>
    </div>
  );
}
