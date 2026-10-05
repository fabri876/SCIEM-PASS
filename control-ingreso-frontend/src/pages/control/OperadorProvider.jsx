import { useCallback, useEffect, useRef, useState } from "react";
import {
  PIN_DEMO, CANTIDAD_LOTES, INTERVALO_SYNC_MS, INTERVALO_LENTA_MS, SCAN_CI,
  clonarExamenes, clonarNomina, crearEstadoInicial, evaluar, horaActual,
  obtenerExamen, textoPendientes,
} from "./datosMockOperador";
import { ContextoOperador } from "./operadorContexto";

const RESULTADO_INICIAL = {
  kind: "ok", titulo: "Permitido", nombre: "Andrea Mamani Quispe",
  meta: "CI 6543210 · SIS 201912345 · Ing. de Sistemas",
  pie: "INGRESO PERMITIDO · REGISTRADO OFFLINE", ms: 38,
};

export default function OperadorProvider({ children }) {
  const [estadoRed, setEstadoRed] = useState(crearEstadoInicial);
  const [listExamenes, setListExamenes] = useState(() => clonarExamenes());
  const [listNomina, setListNomina] = useState(() => clonarNomina());
  const [listLogs, setListLogs] = useState([]);
  const [objResultado, setObjResultado] = useState(RESULTADO_INICIAL);
  const [objToast, setObjToast] = useState(null);

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
  const refSync = useRef(null);
  const refSlow = useRef(null);
  const refDownload = useRef(null);
  const refScanIdx = useRef(0);

  const fnDetenerTimers = useCallback(() => {
    clearInterval(refSync.current);
    clearInterval(refSlow.current);
    refSync.current = null;
    refSlow.current = null;
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

  const fnSyncTick = useCallback(() => {
    const s = refEstado.current;
    const batch = Math.max(1, Math.ceil(s.syncTotal / CANTIDAD_LOTES));
    const n = Math.min(batch, s.pend);
    const next = { ...s, pend: s.pend - n, enviados: s.enviados + n, lote: s.lote + 1 };
    if (next.pend === 0) {
      fnDetenerTimers();
      next.net = "online";
      next.lastSend = horaActual();
      fnAgregarLog("ok", "Lote " + next.lote + " enviado · cola vacía (" + n + " marcas confirmadas)");
      fnMostrarToast("Todo enviado. Sin marcas pendientes.");
    }
    setEstadoRed(next);
  }, [fnDetenerTimers, fnAgregarLog, fnMostrarToast]);

  const fnCambiarRed = useCallback((net) => {
    const s = refEstado.current;
    if (net === "syncing" && s.pend === 0) {
      fnMostrarToast("No hay marcas pendientes. Valida un ingreso sin red para probar el envío.");
      return;
    }
    if (net === "online" && s.pend > 0) net = "syncing";
    if (net === s.net) return;
    fnDetenerTimers();
    const next = { ...s, net };
    if (net === "syncing") {
      next.syncTotal = s.pend;
      next.lote = 0;
      fnAgregarLog("info", "Sync automático iniciado · " + s.pend + " pendientes");
      refSync.current = setInterval(fnSyncTick, INTERVALO_SYNC_MS);
    }
    if (net === "slow") {
      refSlow.current = setInterval(() => {
        const cur = refEstado.current;
        if (cur.pend > 0) setEstadoRed({ ...cur, pend: cur.pend - 1, enviados: cur.enviados + 1, lastSend: horaActual() });
      }, INTERVALO_LENTA_MS);
    }
    setEstadoRed(next);
  }, [fnDetenerTimers, fnAgregarLog, fnMostrarToast, fnSyncTick]);

  const fnDoForzar = useCallback(() => {
    const s = refEstado.current;
    if (s.pend === 0) {
      fnMostrarToast("No existen operaciones pendientes. No se generan registros.");
      return;
    }
    if (s.net === "offline") {
      fnMostrarToast("No es posible sincronizar sin conexión. Los pendientes se conservan.");
      return;
    }
    fnCambiarRed("syncing");
  }, [fnCambiarRed, fnMostrarToast]);

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

  const fnDescargar = useCallback((id) => {
    const s = refEstado.current;
    if (s.net === "offline") {
      fnMostrarToast("Sin conexión. Conéctate para descargar la nómina.");
      return;
    }
    setListExamenes((prev) => prev.map((e) => (e.id === id ? { ...e, estado: "descargando", cargados: 0 } : e)));
    const nombre = obtenerExamen(refExamenes.current, id).nombre.split(" · ")[0];
    fnAgregarLog("info", "Descarga de nómina iniciada · " + nombre);
  }, [fnMostrarToast, fnAgregarLog]);

  const fnActualizar = useCallback((id) => {
    const s = refEstado.current;
    if (s.net === "offline") {
      fnMostrarToast("Actualización no disponible sin conexión. Se conserva la última nómina.");
      return;
    }
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
    fnDetenerTimers();
    const s = refEstado.current;
    if (s.pend > 0) {
      fnAgregarLog("off", "Sesión cerrada con " + s.pend + " pendientes · nómina conservada");
      setResumenSesion(resumenExtra || "Sesión cerrada con " + s.pend + " marcas sin sincronizar. La nómina se conservó en el dispositivo. Regresa más tarde para sincronizar.");
    } else {
      fnAgregarLog("off", "Sesión cerrada · nómina y cola eliminadas del dispositivo");
      setResumenSesion(resumenExtra || "Sesión cerrada sin pendientes. Datos locales eliminados, nómina y cola purgadas. En el próximo inicio se descarga la nómina del examen.");
    }
    setSesionCerradaVisible(true);
  }, [fnDetenerTimers, fnAgregarLog]);

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
    const s = refEstado.current;
    if (s.pend > 0) {
      setLogoutMensaje("Hay " + s.pend + " marcas sin sincronizar. Si cierras ahora, la nómina NO se borra y las marcas se conservan para el próximo inicio.");
      setLogoutConfirmVisible(true);
      return;
    }
    fnCerrarSesion("");
  }, [fnCerrarSesion]);

  const fnCancelarLogout = useCallback(() => setLogoutConfirmVisible(false), []);

  const fnResetDemo = useCallback(() => {
    fnDetenerTimers();
    setEstadoRed(crearEstadoInicial());
    setListExamenes(() => clonarExamenes());
    setListNomina(() => clonarNomina());
    setListLogs([]);
    setObjResultado(RESULTADO_INICIAL);
    setPinVisible(false);
    setLogoutConfirmVisible(false);
    setSesionCerradaVisible(false);
    fnAgregarLog("info", "Demo reiniciada · rol operador");
  }, [fnDetenerTimers, fnAgregarLog]);

  const examenActual = obtenerExamen(listExamenes, estadoRed.examen);
  const listaAsignados = ["calculo", "fisica"]
    .map((id) => obtenerExamen(listExamenes, id))
    .filter(Boolean);

  const valor = {
    estadoRed, listExamenes, listNomina, objResultado, listLogs, objToast,
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