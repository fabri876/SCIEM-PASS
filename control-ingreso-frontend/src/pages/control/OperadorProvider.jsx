import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContextoOperador } from "./operadorContexto";
import {
  useConectividad,
  useEstadoSync,
  usePendientesCount,
  establecerModoOfflineForzado,
  verificarAlmacenamiento,
  crearInactividad,
  pinService,
  verificarPin,
} from "../../offline";
import { useArranqueOffline } from "../../offline/useArranqueOffline";
import { cerrarSesion, obtenerUsuarioActual } from "../../services/authService";
import { detenerPreviewNativo } from "../../hooks/nativeCameraPreview";
import ModalPin from "./components/ModalPin";
import ConfigurarPin from "./components/ConfigurarPin";

export default function OperadorProvider({ children }) {
  useArranqueOffline();

  const usuario = obtenerUsuarioActual();
  const idUsuario = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id ?? null;

  const conn = useConectividad();
  const pendReal = usePendientesCount();
  const {
    estadoSync,
    ultimaSync,
    ultimoResultado,
    sincronizarAhora: fnSincronizarAhora,
  } = useEstadoSync();

  const [numEnviados, setNumEnviados] = useState(0);
  const [numSpacePrc, setNumSpacePrc] = useState(100);
  const [objToast, setObjToast] = useState(null);
  const [resumenSesion, setResumenSesion] = useState("");
  const [sesionCerradaVisible, setSesionCerradaVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [logoutMensaje, setLogoutMensaje] = useState("");

  // Estado del PIN de seguridad y pantalla bloqueada
  const [pinVisible, setPinVisible] = useState(false);
  const [configurarPinVisible, setConfigurarPinVisible] = useState(false);
  const [tienePinConfigurado, setTienePinConfigurado] = useState(false);
  const refInactividad = useRef(null);

  // Verificar si el operador actual tiene PIN configurado localmente
  useEffect(() => {
    let activo = true;
    if (!idUsuario) {
      setTienePinConfigurado(false);
      return;
    }
    pinService.tienePinConfigurado(idUsuario).then((tiene) => {
      if (activo) {
        setTienePinConfigurado(tiene);
      }
    }).catch(() => {});
    return () => {
      activo = false;
    };
  }, [idUsuario]);

  // Callback de bloqueo por inactividad
  const onBloquearInactividad = useCallback(() => {
    if (tienePinConfigurado) {
      setPinVisible(true);
      if (idUsuario) {
        pinService.bloquearSesion(idUsuario).catch(() => {});
      }
    }
  }, [tienePinConfigurado, idUsuario]);

  // Monitor de inactividad: solo se activa si hay PIN configurado
  useEffect(() => {
    if (!tienePinConfigurado) {
      if (refInactividad.current) {
        refInactividad.current.destruir();
        refInactividad.current = null;
      }
      return;
    }

    const ctrl = crearInactividad({
      tiempoMaximoMs: 5 * 60 * 1000, // 5 minutos sin actividad
      advertenciaMs: 60 * 1000,
      onBloquear: onBloquearInactividad,
    });
    refInactividad.current = ctrl;

    return () => {
      ctrl.destruir();
      refInactividad.current = null;
    };
  }, [tienePinConfigurado, onBloquearInactividad]);

  useEffect(() => {
    const n = ultimoResultado?.enviados ?? ultimoResultado?.procesados ?? 0;
    if (n) setNumEnviados((prev) => prev + n);
  }, [ultimoResultado]);

  useEffect(() => {
    let vivo = true;
    verificarAlmacenamiento().then((info) => {
      if (!vivo || !info?.disponible || !info.cuotaMB) return;
      const pct = Math.max(0, Math.min(100, Math.round((info.libreMB / info.cuotaMB) * 100)));
      setNumSpacePrc(pct);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!objToast) return undefined;
    const t = setTimeout(() => setObjToast(null), 3400);
    return () => clearTimeout(t);
  }, [objToast]);

  const fnMostrarToast = useCallback((mensaje) => {
    setObjToast({ clave: Date.now(), mensaje });
  }, []);

  const fnCambiarRed = useCallback(async (net) => {
    try {
      if (net === "offline") {
        await establecerModoOfflineForzado(true);
      } else if (net === "online") {
        await establecerModoOfflineForzado(false);
      } else if (net === "syncing") {
        await fnSincronizarAhora();
      }
    } catch (err) {
      console.warn("[OperadorProvider] Error al cambiar el estado de red:", err);
    }
  }, [fnSincronizarAhora]);

  const fnDoForzar = useCallback(async () => {
    if (pendReal === 0) {
      fnMostrarToast("No hay ingresos pendientes para sincronizar.");
      return;
    }
    if (conn.estado === "offline") {
      fnMostrarToast("Sin conexión a internet. Los ingresos quedan pendientes hasta que haya red.");
      return;
    }
    fnMostrarToast("Sincronizando ingresos pendientes...");
    try {
      const res = await fnSincronizarAhora();
      if (res?.sinConexion) {
        fnMostrarToast("Sin conexión al servidor. Los ingresos quedan pendientes.");
        return;
      }
      if (res?.omitido) {
        fnMostrarToast("Ya hay una sincronización en curso.");
        return;
      }
      if (res?.errores > 0 || res?.itemsConFalloDeLote > 0) {
        fnMostrarToast("Sincronización completada con errores. Algunos ingresos quedan pendientes.");
        return;
      }
      fnMostrarToast("Sincronización completada. " + (res?.procesados ?? 0) + " ingreso(s) enviado(s).");
    } catch (err) {
      fnMostrarToast("Error al sincronizar: " + (err?.message || "intenta nuevamente."));
      console.warn("[OperadorProvider] Error al forzar sincronizacion:", err);
    }
  }, [pendReal, conn.estado, fnSincronizarAhora, fnMostrarToast]);

  const fnStorageLleno = useCallback(() => {
    setNumSpacePrc(5);
  }, []);

  const fnCerrarSesion = useCallback((resumenExtra) => {
    try {
      detenerPreviewNativo();
    } catch {}
    try {
      cerrarSesion({ limpiarDatosLocales: true });
    } catch (e) {
      console.warn("[OperadorProvider] Error durante limpieza de sesión:", e);
    }
    if (pendReal > 0) {
      setResumenSesion(resumenExtra || "Sesion cerrada con " + pendReal + " marcas sin sincronizar.");
    } else {
      setResumenSesion(resumenExtra || "Sesion cerrada sin pendientes.");
    }
    setSesionCerradaVisible(true);
  }, [pendReal]);

  const fnConfirmarLogout = useCallback(() => {
    if (pendReal > 0) {
      setLogoutMensaje("Hay " + pendReal + " marcas sin sincronizar. Si cierras ahora, la nomina NO se borra y las marcas se conservan para el proximo inicio.");
      setLogoutConfirmVisible(true);
      return;
    }
    fnCerrarSesion("");
  }, [pendReal, fnCerrarSesion]);

  const fnCancelarLogout = useCallback(() => setLogoutConfirmVisible(false), []);

  // Validación criptográfica del PIN
  const fnConfirmarPin = useCallback(async (strPin) => {
    if (!idUsuario) return false;
    const pinHash = await pinService.obtenerPinHash(idUsuario);
    if (!pinHash) return false;

    const ok = await verificarPin(strPin, pinHash, idUsuario);
    if (ok) {
      await pinService.desbloquearSesion(idUsuario);
      setPinVisible(false);
      if (refInactividad.current) {
        refInactividad.current.resetear();
      }
      return true;
    }
    return false;
  }, [idUsuario]);

  const fnCancelarPin = useCallback(() => {
    fnCerrarSesion("Sesión cerrada desde pantalla de bloqueo.");
  }, [fnCerrarSesion]);

  const fnAbrirConfigurarPin = useCallback(() => {
    setConfigurarPinVisible(true);
  }, []);

  const fnPinGuardadoExitoso = useCallback(() => {
    setTienePinConfigurado(true);
    setConfigurarPinVisible(false);
    fnMostrarToast("PIN de seguridad configurado correctamente.");
  }, [fnMostrarToast]);

  const netReal = estadoSync === "enviando"
    ? "syncing"
    : conn.estado === "offline"
      ? "offline"
      : conn.estado === "degraded"
        ? "slow"
        : "online";
  const lastSendReal = ultimaSync
    ? new Date(ultimaSync).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })
    : "";

  const estadoRedReal = useMemo(() => ({
    net: netReal,
    pend: pendReal,
    enviados: numEnviados,
    spacePrc: numSpacePrc,
    lastSend: lastSendReal,
  }), [netReal, pendReal, numEnviados, numSpacePrc, lastSendReal]);

  const valor = {
    estadoRed: estadoRedReal,
    objToast,
    fnMostrarToast,
    fnCambiarRed,
    fnDoForzar,
    fnStorageLleno,
    fnCerrarSesion,
    fnConfirmarLogout,
    fnCancelarLogout,
    pinVisible,
    pinMensaje: "",
    fnConfirmarPin,
    tienePinConfigurado,
    fnAbrirConfigurarPin,
    setConfigurarPinVisible,
    setConfigurandoPin: setConfigurarPinVisible,
    configurarPinVisible,
    configurandoPin: configurarPinVisible,
    sesionCerradaVisible,
    resumenSesion,
    logoutConfirmVisible,
    logoutMensaje,
  };

  return (
    <ContextoOperador.Provider value={valor}>
      {children}
      {pinVisible && (
        <ModalPin
          visible={pinVisible}
          fnConfirmar={fnConfirmarPin}
          fnCancelar={fnCancelarPin}
        />
      )}
      {configurarPinVisible && idUsuario && (
        <ConfigurarPin
          visible={configurarPinVisible}
          idUsuario={idUsuario}
          onGuardar={fnPinGuardadoExitoso}
          onCancelar={() => setConfigurarPinVisible(false)}
        />
      )}
    </ContextoOperador.Provider>
  );
}
