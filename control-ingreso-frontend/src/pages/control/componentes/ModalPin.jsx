import { useState, useEffect } from 'react';
import { pinService } from '../../../offline/pinService';

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
 * Modal de desbloqueo con PIN de 4 dígitos.
 * Valida contra IndexedDB (sin servidor, totalmente offline).
 *
 * @param {Object} props
 * @param {boolean} props.visible - Mostrar u ocultar el modal
 * @param {number|string} props.idUsuario - ID del usuario para validar PIN
 * @param {Function} props.onDesbloquear - Callback al desbloquear exitosamente (solo cierra el modal)
 * @param {Function} props.onCancelar - Callback al cancelar
 */
export default function ModalPin({ visible, idUsuario, onDesbloquear, onCancelar }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

  const fnAgregarDigito = (d) => {
    if (pin.length < 4) setPin(pin + d);
    setError(false);
  };

  const fnBorrar = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const fnEnviar = async (e) => {
    e.preventDefault();
    console.log('[ModalPin] fnEnviar llamado, pin:', pin, 'idUsuario:', idUsuario);
    
    if (!idUsuario) {
      console.error('[ModalPin] idUsuario no definido');
      setError(true);
      setCargando(false);
      return;
    }
    
    if (pin.length !== 4) {
      console.warn('[ModalPin] PIN incompleto:', pin.length, 'digitos');
      return;
    }
    
    setCargando(true);
    try {
      const row = await pinService.obtenerConfig(idUsuario);
      console.log('[ModalPin] Resultado obtenerConfig:', row);
      
      if (!row || !row.pinHash) {
        console.warn('[ModalPin] No hay PIN configurado en IndexedDB para idUsuario:', idUsuario);
        setError(true);
        setCargando(false);
        return;
      }
      
      const coincide = await compararHash(pin, row.pinHash);
      console.log('[ModalPin] Comparación hash:', { coincide, pin, pinHash: row.pinHash });
      
      if (coincide) {
        await pinService.desbloquearSesion(idUsuario);
        onDesbloquear();
      } else {
        await pinService.registrarIntentoFallido(idUsuario);
        setError(true);
        setPin('');
      }
    } catch (err) {
      console.warn('[ModalPin] Error validando PIN:', err);
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setPin('');
      setError(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-[#08264A] mb-4">Desbloquear sesión</h2>
        <p className="text-sm text-[#64748B] mb-6">Ingresa tu PIN de 4 dígitos</p>
        <form onSubmit={fnEnviar} className="flex gap-2 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              type="text"
              maxLength="1"
              readOnly
              value={pin[i] || ''}
              className="w-10 h-12 text-center text-lg font-mono border border-[#CBD5E1] rounded-lg focus:border-[#08264A] focus:ring-2 focus:ring-[#08264A]/50"
              onKeyDown={(e) => {
                if (e.key >= '0' && e.key <= '9') {
                  e.preventDefault();
                  fnAgregarDigito(e.key);
                }
                if (e.key === 'Backspace') fnBorrar();
              }}
              autoFocus={i === 0}
            />
          ))}
        </form>
        {error && <p className="text-sm text-[#B91C1C] mb-4">PIN incorrecto</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#64748B]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={fnEnviar}
            disabled={cargando || pin.length < 4}
            className="flex-1 py-2.5 rounded-lg bg-[#08264A] text-white text-sm disabled:opacity-50"
          >
            Desbloquear
          </button>
        </div>
      </div>
    </div>
  );
}
