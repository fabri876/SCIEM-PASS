import { useCallback, useEffect, useMemo, useState } from "react";
import { ContextoOperador } from "./operadorContexto";
import {
  useConectividad,
  useEstadoSync,
  usePendientesCount,
  establecerModoOfflineForzado,
  verificarAlmacenamiento,
} from "../../offline";
import { pinService } from "../../offline/pinService.js";
import { useArranqueOffline } from "../../offline/useArranqueOffline";
import { useInactividad } from "../../offline/useInactividad";
import { obtenerUsuarioActual } from "../../services/authService";
import ModalPin from "./componentes/ModalPin";
import ConfigurarPin from "./componentes/ConfigurarPin";

export default function OperadorProvider({ children }) {
  useArranqueOffline();

  const usuario = obtenerUsuarioActual();
  const idUsuario = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id ?? null;

  const [configurandoPin, setConfigurandoPin] = useState(false);

  const conn = useConectividad();
  const pendReal = usePendientesCount();
  const {
    estadoSync,
    ultimaSync,
    ultimoResultado,
    sincronizarAhora: fnSincronizarAhora,
  } = useEstadoSync();

  const [pinVisible, setPinVisible] = useState(false);
  const [pinMensaje, setPinMensaje] = useState("");

  const {
    bloqueada,
    fnRegistrarInteraccion,
    fnDesbloquear,
    pinInvalido
  } = useInactividad({
    minutos: 5,
    idUsuario,
    onBloquear: () => setPinVisible(true),
    onDesbloquear: () => setPinVisible(false)
  });

  // Sincronizar pinVisible con bloqueada cuando cambia por inactividad
  useEffect(() => {
    if (bloqueada) setPinVisible(true);
  }, [bloqueada]);

  const [numEnviados, setNumEnviados] = useState(0);
  const [numSpacePrc, setNumSpacePrc] = useState(100);
  const [objToast, setObjToast] = useState(null);
  const [resumenSesion, setResumenSesion] = useState("");
  const [sesionCerradaVisible, setSesionCerradaVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [logoutMensaje, setLogoutMensaje] = useState("");

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

  const fnConfigurarPin = useCallback(async (pinHash) => {
    setConfigurandoPin(false);
    fnMostrarToast("PIN configurado correctamente.");
  }, [fnMostrarToast]);

  const fnCambiarRed = useCallback(async (net) => {
    try {
      if (net === "offline") {
        await establecerModoOfflineForzado(true);
      } else if (net === "online") {
        await establecerModoOfflineForzado(false);
        // Al recuperar internet, sincronizar inmediatamente los ingresos pendientes
        await fnSincronizarAhora();
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
  }, [pendReal, fnSincronizarAhora, fnMostrarToast]);

  const fnStorageLleno = useCallback(() => {
    setNumSpacePrc(5);
  }, []);

  const fnCerrarSesion = useCallback((resumenExtra) => {
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
    pinVisible: bloqueada,
    pinMensaje: pinInvalido ? "PIN incorrecto" : "",
    fnConfirmarPin: fnDesbloquear,
    fnRegistrarInteraccion,
    configurandoPin,
    setConfigurandoPin,
    fnConfigurarPin,
    sesionCerradaVisible,
    resumenSesion,
    logoutConfirmVisible,
    logoutMensaje,
  };

  return (
    <ContextoOperador.Provider value={valor}>
      {children}
      {pinVisible && idUsuario && (
        <ModalPin
          visible={pinVisible}
          idUsuario={idUsuario}
          onDesbloquear={() => setPinVisible(false)}
          onCancelar={() => setPinVisible(false)}
        />
      )}
      {configurandoPin && idUsuario && (
        <ConfigurarPin
          visible={configurandoPin}
          idUsuario={idUsuario}
          onGuardar={fnConfigurarPin}
          onCancelar={() => setConfigurandoPin(false)}
        />
      )}
    </ContextoOperador.Provider>
  );
}
