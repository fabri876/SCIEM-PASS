import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Timer } from "lucide-react";

const STORAGE_KEY_FALLOS = "sciem_pin_fallos";
const STORAGE_KEY_HASTA = "sciem_pin_bloqueado_hasta";

function calcularSegundosBloqueo(numFallos) {
  if (numFallos < 3) return 0;
  if (numFallos === 3) return 30;
  if (numFallos === 4) return 60;
  return 300; // 5 o más fallos: 5 minutos
}

function leerEstadoStorage() {
  try {
    const fallos = parseInt(localStorage.getItem(STORAGE_KEY_FALLOS) || "0", 10);
    const hastaEpoch = parseInt(localStorage.getItem(STORAGE_KEY_HASTA) || "0", 10);
    const ahora = Date.now();
    const restanteSeg = hastaEpoch > ahora ? Math.ceil((hastaEpoch - ahora) / 1000) : 0;
    return { fallos: Number.isFinite(fallos) ? fallos : 0, restanteSeg };
  } catch {
    return { fallos: 0, restanteSeg: 0 };
  }
}

export default function ModalPin({ visible, mensaje, fnConfirmar, fnCancelar }) {
  const [strPin, setStrPin] = useState("");
  const [numFallos, setNumFallos] = useState(() => leerEstadoStorage().fallos);
  const [numSegRestantes, setNumSegRestantes] = useState(() => leerEstadoStorage().restanteSeg);
  const [strMensajeError, setStrMensajeError] = useState("");
  const refTimer = useRef(null);

  const limpiarTemporizador = useCallback(() => {
    if (refTimer.current) {
      clearInterval(refTimer.current);
      refTimer.current = null;
    }
  }, []);

  const sincronizarTemporizador = useCallback(() => {
    const { fallos, restanteSeg } = leerEstadoStorage();
    setNumFallos(fallos);
    setNumSegRestantes(restanteSeg);

    limpiarTemporizador();

    if (restanteSeg > 0) {
      refTimer.current = setInterval(() => {
        const { restanteSeg: act } = leerEstadoStorage();
        setNumSegRestantes(act);
        if (act <= 0) {
          limpiarTemporizador();
          try {
            localStorage.removeItem(STORAGE_KEY_HASTA);
          } catch {}
        }
      }, 500);
    }
  }, [limpiarTemporizador]);

  // Si visible pasa a false, se limpia el intervalo activo.
  // Si visible pasa a true, se sincroniza el estado guardado.
  useEffect(() => {
    if (visible) {
      setStrPin("");
      setStrMensajeError("");
      sincronizarTemporizador();
    } else {
      limpiarTemporizador();
    }
  }, [visible, sincronizarTemporizador, limpiarTemporizador]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      limpiarTemporizador();
    };
  }, [limpiarTemporizador]);

  const [cargando, setCargando] = useState(false);
  const boolBloqueado = numSegRestantes > 0;

  const fnEnviar = async (e) => {
    e.preventDefault();
    if (boolBloqueado || cargando) return;

    setCargando(true);
    try {
      const ok = await fnConfirmar(strPin.trim());
      if (ok === true) {
        // Solo un PIN correcto limpia los fallos y el bloqueo
        try {
          localStorage.removeItem(STORAGE_KEY_FALLOS);
          localStorage.removeItem(STORAGE_KEY_HASTA);
        } catch {}
        setStrPin("");
        setNumFallos(0);
        setNumSegRestantes(0);
        setStrMensajeError("");
        limpiarTemporizador();
      } else {
        setStrPin("");
        const nuevosFallos = numFallos + 1;
        try {
          localStorage.setItem(STORAGE_KEY_FALLOS, nuevosFallos.toString());
        } catch {}
        setNumFallos(nuevosFallos);

        const segBloqueo = calcularSegundosBloqueo(nuevosFallos);
        if (segBloqueo > 0) {
          const hasta = Date.now() + segBloqueo * 1000;
          try {
            localStorage.setItem(STORAGE_KEY_HASTA, hasta.toString());
          } catch {}
          setStrMensajeError("Demasiados intentos incorrectos. Espera para volver a intentarlo.");
          sincronizarTemporizador();
        } else {
          const restantes = Math.max(0, 3 - nuevosFallos);
          setStrMensajeError(`PIN incorrecto. ${restantes} intento${restantes === 1 ? "" : "s"} restante${restantes === 1 ? "" : "s"}.`);
        }
      }
    } catch {
      setStrMensajeError("Error al verificar el PIN. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  const formatearTiempo = (seg) => {
    if (seg >= 60) {
      const m = Math.floor(seg / 60);
      const s = seg % 60;
      return s > 0 ? `${m} min ${s} s` : `${m} min`;
    }
    return `${seg} s`;
  };

  if (!visible) return null;

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

        {boolBloqueado ? (
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <Timer className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold">
              Bloqueado — espera {formatearTiempo(numSegRestantes)}
            </span>
          </div>
        ) : (
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
        )}

        {strMensajeError && (
          <p className="text-[11px] font-semibold text-[#B91C1C] text-center">{strMensajeError}</p>
        )}

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
            disabled={boolBloqueado || cargando}
            className="flex-1 h-11 rounded-xl bg-[#003770] hover:bg-[#124B83] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs transition-colors cursor-pointer"
          >
            {cargando ? "Verificando..." : "Desbloquear"}
          </button>
        </div>
        {mensaje && <p className="text-[10px] text-slate-400 font-semibold text-center">{mensaje}</p>}
      </form>
    </div>
  );
}