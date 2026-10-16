import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PIN_DEMO, SCAN_CI,
  clonarExamenes, clonarNomina, crearEstadoInicial, evaluar, horaActual,
  obtenerExamen, textoPendientes,
} from "./datosMockOperador";
import { ContextoOperador } from "./operadorContexto";
// Motor offline real
import {
  useConectividad,
  useEstadoSync,
  usePendientesCount,
  establecerModoOfflineForzado,
  verificarAlmacenamiento,
} from "../../offline";
import { useArranqueOffline } from "../../offline/useArranqueOffline";

const RESULTADO_INICIAL = {
  kind: "ok", titulo: "Permitido", nombre: "Andrea Mamani Quispe",
  meta: "CI 6543210 · SIS 201912345 · Ing. de Sistemas",
  pie: "INGRESO PERMITIDO · REGISTRADO OFFLINE", ms: 38,
};

export default function OperadorProvider({ children }) {
  // Arranca conectividad + sincronizacion automatica + purga periodica.
  useArranqueOffline();

  const conn = useConectividad();
  const pendReal = usePendientesCount();
  const {
    estadoSync,
    ultimaSync,
    ultimoResultado,
    sincronizarAhora: fnSincronizarAhora,
  } = useEstadoSync();

  const [estadoRed, setEstadoRed] = useState(crearEstadoInicial);
  const [listExamenes, setListExamenes] = useState(() => clonarExamenes());
  const [listNomina, setListNomina] = useState(() => clonarNomina());
  const [listLogs, setListLogs] = useState([]);
  const [objResultado, setObjResultado] = useState(RESULTADO_INICIAL);
  const [objToast, setObjToast] = useState(null);
  const [numEnviados, setNumEnviados] = useState(0);
  const [numSpacePrc, setNumSpacePrc] = useState(100);

  const [pinVisible, setPinVisible] = useState(false);
  const [pinMensaje, setPinMensaje] = useState("PIN de la demo: 1234 · 3 intentos fallidos cierran la sesión.");
  const [pinApertura, setPinApertura] = useState(0);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [logoutMensaje, setLogoutMensaje] = useState("");
  const [sesionCerradaVisible, setSesionCerradaVisible] = useState(false);
  const [resumenSesion, setResumenSesion] = useState("");

  const refEstado = useRef(estadoRed);
  useEffect(() => { refEstado.current = estadoRed; }, [estadoRed]);
  const refExamenes = useRef(listExamenes);
  useEffect(() => { refExamenes.current = listExamenes; }, [listExamenes]);
  const refDownload = useRef(null);
  const refScanIdx = useRef(0);

  // Acumula los envios confirmados por el scheduler para el contador de la UI.
  useEffect(() => {
    const n = ultimoResultado?.enviados ?? ultimoResultado?.procesados ?? 0;
    if (n) setNumEnviados((prev) => prev + n);
  }, [ultimoResultado]);

  // Espacio libre estimado del dispositivo (control de cuota).
  useEffect(() => {
    let vivo = true;
    verificarAlmacenamiento().then((info) => {
      if (!vivo || !info?.disponible || !info.cuotaMB) return;
      const pct = Math.max(0, Math.min(100, Math.round((info.libreMB / info.cuotaMB) * 100)));
      setNumSpacePrc(pct);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const fnMostrarToast = useCallback((mensaje) => {
    setObjToast({ clave: Date.now(), mensaje });
  }, []);

  useEffect(() => {
    if (!objToast) return undefined;
    const t = setTimeout(() => setObjToast(null), 3400);
    return () => clearTimeout(t);
  }, [objToast]);

  const fnAgregarLog = useCallback((clase, mensaje) => {
    setListLogs((prev) => [{ hora: horaActual(), clase, mensaje }, ...prev].slice(0, 30));
  }, []);

  // Conmutador Online/Offline real: fuerza el modo offline del motor o lo libera.
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
      fnMostrarToast("No existen operaciones pendientes. No se generan registros.");
      return;
    }
    if (conn.estado === "offline") {
      fnMostrarToast("No es posible sincronizar sin conexión. Los pendientes se conservan.");
      return;
    }
    fnAgregarLog("info", "Sincronización manual solicitada · " + pendReal + " pendientes");
    try {
      const res = await fnSincronizarAhora();
      if (res?.sinConexion) {
        fnMostrarToast("No es posible sincronizar sin conexión. Los pendientes se conservan.");
      } else if (res?.omitido) {
        fnMostrarToast("Ya hay un envío de sincronización en curso.");
      } else {
        fnAgregarLog("ok", "Sync manual · " + (res?.enviados ?? 0) + " enviadas · " + (res?.errores ?? 0) + " errores");
        fnMostrarToast("Sincronización completada · " + (res?.pendientesRestantes ?? 0) + " pendientes restantes.");
      }
    } catch (err) {
      fnMostrarToast("Error al sincronizar: " + err.message);
    }
  }, [pendReal, conn.estado, fnSincronizarAhora, fnMostrarToast, fnAgregarLog]);

  const fnValidar = useCallback((q) => {
    if (!q || !q.trim()) {
      fnMostrarToast("Escribe el CI o el código SIS para validar.");
      return;
    }
    const t0 = performance.now();
    setTimeout(() => {
      const { resultado, listEx, listN, estado } = evaluar(
        refExamenes.current, listNomina, refEstado.current, q.trim()
      );
      const ms = Math.max(1, Math.round(performance.now() - t0));
      setObjResultado({ ...resultado, ms });
      setListExamenes(listEx);
      setListNomina(listN);
      setEstadoRed(estado);
    }, 25 + Math.random() * 30);
  }, [fnMostrarToast, listNomina]);

  const fnDemo = useCallback((clase) => {
    let ci = null;
    if (clase === "no") ci = "7654321 CB";
    else if (clase === "qr") ci = "@@@-INVALIDO-@@@";
    else {
      let s = null;
      if (clase === "warn") s = listNomina.find((x) => !x.hab);
      if (clase === "wait") s = listNomina.find((x) => x.hab && x.marca);
      if (clase === "ok") s = listNomina.find((x) => x.hab && !x.marca);
      if (!s) {
        fnMostrarToast("Ya marcaste a todos los habilitados de la demo.");
        return;
      }
      ci = s.ci + " " + s.ext;
    }
    fnValidar(ci);
  }, [listNomina, fnValidar, fnMostrarToast]);

  const fnEscaneoCamara = useCallback(() => {
    const ci = SCAN_CI[refScanIdx.current++ % SCAN_CI.length];
    fnValidar(ci);
    return ci;
  }, [fnValidar]);

  const fnCambiarExamen = useCallback((id) => {
    const s = refEstado.current;
    setEstadoRed({ ...s, examen: id });
    const ex = obtenerExamen(refExamenes.current, id);
    if (s.net !== "online" && ex && ex.estado !== "listo") {
      setObjResultado({
        kind: "nodata", titulo: "Sin nómina local", nombre: "No hay datos para validar",
        meta: "Examen: " + ex.nombre, pie: "Conéctate y descarga la nómina para habilitar la validación.",
        ms: 12,
      });
    }
  }, []);

  const fnDescargar = useCallback((id, objDatos) => {
    const s = refEstado.current;
    if (s.net === "offline") {
      fnMostrarToast("Sin conexión. Conéctate para descargar la nómina.");
      return;
    }
    const objPrevio = refExamenes.current.find((e) => e.id === id);
    const strNombre = objPrevio
      ? objPrevio.nombre
      : [objDatos?.materia, objDatos?.tipo].filter(Boolean).join(" · ") || "Examen asignado";
    const numTotal = objPrevio?.total || objDatos?.contador?.habilitados || 1;
    setListExamenes((prev) => (prev.some((e) => e.id === id)
      ? prev.map((e) => (e.id === id ? { ...e, estado: "descargando", cargados: 0 } : e))
      : [...prev, {
          id,
          nombre: strNombre,
          sub: objDatos?.aula ? "Aula " + objDatos.aula : "",
          estado: "descargando", hace: 0, cargados: 0, total: numTotal,
          actualizando: false, cap: objDatos?.contador?.habilitados || 0,
          ing: objDatos?.contador?.ingresaron || 0,
        }]));
    fnAgregarLog("info", "Descarga de nómina iniciada · " + strNombre.split(" · ")[0]);
  }, [fnMostrarToast, fnAgregarLog]);

  const fnActualizar = useCallback((id) => {
    const s = refEstado.current;
    if (s.net === "offline") {
      fnMostrarToast("Actualización no disponible sin conexión. Se conserva la última nómina.");
      return;
    }
    if (!refExamenes.current.some((e) => e.id === id)) return;
    setListExamenes((prev) => prev.map((e) => (e.id === id ? { ...e, actualizando: true } : e)));
    const demora = s.net === "slow" ? 3200 : 1600;
    setTimeout(() => {
      setListExamenes((prev) => prev.map((e) => (e.id === id ? { ...e, actualizando: false, hace: 0, cargados: e.total } : e)));
      const nombre = obtenerExamen(refExamenes.current, id).nombre.split(" · ")[0];
      fnAgregarLog("ok", "Nómina de " + nombre + " actualizada (diff updatedSince)");
      fnMostrarToast("Nómina de " + nombre + " actualizada.");
    }, demora);
  }, [fnMostrarToast, fnAgregarLog]);

  useEffect(() => {
    refDownload.current = setInterval(() => {
      const s = refEstado.current;
      if (s.net === "offline" || s.bloqueada) return;
      const step = s.net === "slow" ? 12 : s.net === "syncing" ? 45 : 60;
      const prev = refExamenes.current;
      let cambio = false;
      let completado = null;
      const next = prev.map((e) => {
        if (e.estado !== "descargando") return e;
        cambio = true;
        const cargados = Math.min(e.total, e.cargados + step);
        if (cargados >= e.total) {
          completado = e;
          return { ...e, estado: "listo", hace: 0, cargados: e.total };
        }
        return { ...e, cargados };
      });
      if (cambio) {
        setListExamenes(next);
        refExamenes.current = next;
      }
      if (completado) {
        fnAgregarLog("ok", "Nómina de " + completado.nombre.split(" · ")[0] + " lista para trabajar sin red");
        fnMostrarToast("Nómina de " + completado.nombre.split(" · ")[0] + " lista para trabajar sin red.");
      }
    }, 500);
    return () => clearInterval(refDownload.current);
  }, [fnAgregarLog, fnMostrarToast]);

  const fnAlternarNomina = useCallback(() => {
    const s = refEstado.current;
    const ex = obtenerExamen(refExamenes.current, s.examen);
    if (!ex) return;
    if (ex.estado === "listo") {
      setListExamenes((prev) => prev.map((e) => (e.id === ex.id ? { ...e, estado: "ninguna", cargados: 0 } : e)));
      fnAgregarLog("off", "Nómina local de " + ex.nombre.split(" · ")[0] + " eliminada");
      fnMostrarToast("Nómina local eliminada. Con nómina ausente + offline, la validación se bloquea.");
    } else {
      setListExamenes((prev) => prev.map((e) => (e.id === ex.id ? { ...e, estado: "listo", hace: 0, cargados: e.total } : e)));
      fnMostrarToast("Nómina restaurada. Vuelve a disparar Pérdida de red para validar offline.");
    }
    setObjResultado({
      kind: "nodata", titulo: "Sin nómina local", nombre: "No hay datos para validar",
      meta: "Examen: " + ex.nombre, pie: "Conéctate y descarga la nómina para habilitar la validación.",
      ms: 12,
    });
  }, [fnAgregarLog, fnMostrarToast]);

  const fnStorageLleno = useCallback(() => {
    setNumSpacePrc(5);
    setEstadoRed((prev) => ({ ...prev, spacePrc: 5 }));
    fnMostrarToast("Cuota crítica: 5 % de espacio libre. El registro offline será bloqueado.");
  }, [fnMostrarToast]);

  const fnAbrirPin = useCallback(() => {
    setEstadoRed((prev) => ({ ...prev, bloqueada: true, intentos: 0 }));
    setPinMensaje("PIN de la demo: 1234 · 3 intentos fallidos cierran la sesión.");
    setPinApertura((prev) => prev + 1);
    setPinVisible(true);
  }, []);

  const fnCerrarSesion = useCallback((resumenExtra) => {
    setPinVisible(false);
    setLogoutConfirmVisible(false);
    if (pendReal > 0) {
      fnAgregarLog("off", "Sesión cerrada con " + pendReal + " pendientes · nómina conservada");
      setResumenSesion(resumenExtra || "Sesión cerrada con " + pendReal + " marcas sin sincronizar. La nómina se conservó en el dispositivo. Regresa más tarde para sincronizar.");
    } else {
      fnAgregarLog("off", "Sesión cerrada · nómina y cola eliminadas del dispositivo");
      setResumenSesion(resumenExtra || "Sesión cerrada sin pendientes. Datos locales eliminados, nómina y cola purgadas. En el próximo inicio se descarga la nómina del examen.");
    }
    setSesionCerradaVisible(true);
  }, [pendReal, fnAgregarLog]);

  const fnConfirmarPin = useCallback((pin) => {
    if (pin !== PIN_DEMO) {
      const intentos = refEstado.current.intentos + 1;
      if (intentos >= 3) {
        fnCerrarSesion("3 intentos incorrectos. Sesión cerrada por seguridad → redirigiendo a /login.");
        return false;
      }
      setEstadoRed((prev) => ({ ...prev, intentos }));
      setPinMensaje("PIN incorrecto. Intento " + intentos + " de 3.");
      return false;
    }
    setPinVisible(false);
    setEstadoRed((prev) => ({ ...prev, bloqueada: false, intentos: 0 }));
    fnMostrarToast("Sesión desbloqueada. El badge de pendientes permaneció visible.");
    return true;
  }, [fnMostrarToast, fnCerrarSesion]);

  const fnConfirmarLogout = useCallback(() => {
    if (pendReal > 0) {
      setLogoutMensaje("Hay " + pendReal + " marcas sin sincronizar. Si cierras ahora, la nómina NO se borra y las marcas se conservan para el próximo inicio.");
      setLogoutConfirmVisible(true);
      return;
    }
    fnCerrarSesion("");
  }, [pendReal, fnCerrarSesion]);

  const fnCancelarLogout = useCallback(() => setLogoutConfirmVisible(false), []);

  const fnResetDemo = useCallback(() => {
    setEstadoRed(crearEstadoInicial());
    setListExamenes(() => clonarExamenes());
    setListNomina(() => clonarNomina());
    setListLogs([]);
    setObjResultado(RESULTADO_INICIAL);
    setPinVisible(false);
    setLogoutConfirmVisible(false);
    setSesionCerradaVisible(false);
    fnAgregarLog("info", "Demo reiniciada · rol operador");
  }, [fnAgregarLog]);

  // Estado de red derivado del motor real de conectividad + sincronizacion.
  const netReal = estadoSync === "enviando"
    ? "syncing"
    : conn.estado === "offline"
      ? "offline"
      : conn.estado === "degraded"
        ? "slow"
        : "online";
  const lastSendReal = ultimaSync
    ? new Date(ultimaSync).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })
    : estadoRed.lastSend;

  const estadoRedReal = useMemo(() => ({
    ...estadoRed,
    net: netReal,
    pend: pendReal,
    enviados: numEnviados,
    spacePrc: numSpacePrc,
    lastSend: lastSendReal,
  }), [estadoRed, netReal, pendReal, numEnviados, numSpacePrc, lastSendReal]);

  const examenActual = obtenerExamen(listExamenes, estadoRed.examen);
  const listaAsignados = ["calculo", "fisica"]
    .map((id) => obtenerExamen(listExamenes, id))
    .filter(Boolean);

  const valor = {
    estadoRed: estadoRedReal, listExamenes, listNomina, objResultado, listLogs, objToast,
    examenActual, listaAsignados, textoPendientes,
    fnValidar, fnDemo, fnEscaneoCamara, fnCambiarExamen, fnCambiarRed, fnDoForzar,
    fnDescargar, fnActualizar, fnAlternarNomina, fnStorageLleno,
    fnResetDemo, fnAbrirPin, fnConfirmarPin, fnCerrarSesion,
    fnConfirmarLogout, fnCancelarLogout,
    pinVisible, pinMensaje, pinApertura, logoutConfirmVisible, logoutMensaje,
    sesionCerradaVisible, resumenSesion,
  };

  return <ContextoOperador.Provider value={valor}>{children}</ContextoOperador.Provider>;
}
