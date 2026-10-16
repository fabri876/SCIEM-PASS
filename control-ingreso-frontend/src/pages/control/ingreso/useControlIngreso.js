// Estado del control de ingreso (independiente del OperadorProvider)
// Sin examen elegido → lista "Mis exámenes". Con examen elegido → control de ingreso.
//
// Modo híbrido (HU07):
// - Con red: la validación va al servidor (POST /api/v1/control/ingresos).
// - Sin red (o modo offline forzado): la validación usa el motor local
//   (nómina descargada + cola de sincronización diferida).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  obtenerContador,
  obtenerExamenesAsignados,
  obtenerUltimosIngresos,
  validarIngreso,
} from "../../../services/ingresoService";
import { obtenerUsuarioActual } from "../../../services/authService";
import {
  useConectividad,
  useNominaLocal,
  validarIngreso as motorValidar,
  registrarIngreso as motorRegistrar,
  obtenerClockOffsetMs,
} from "../../../offline";

const INTERVALO_TIEMPO_REAL_MS = 5000;
const LIMITE_ULTIMOS = 5;

/* ---------- Mapeo del resultado del motor local al formato de la tarjeta ---------- */

function estudianteOffline(e) {
  if (!e) return null;
  return {
    nombres: e.nombre || "",
    apellidos: "",
    ci: e.ci || "",
    sis: e.codigoSis || "",
    carrera: e.carrera || "Carrera no asignada",
    aulaAsignada: e.aulaAsignada || null,
    normaParticular: e.normaParticular || null,
  };
}

function textoMetodo(strMetodo, metodoMotor) {
  if (strMetodo === "QR" || metodoMotor === "QR") return "QR";
  if (strMetodo === "LISTA") return "Lista";
  if (metodoMotor === "CODIGO") return "SIS";
  if (metodoMotor === "CI") return "C.I.";
  return strMetodo || "C.I.";
}

function horaDeIso(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("es-BO", { hour12: false });
  } catch {
    return null;
  }
}

function fechaDeIso(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-BO");
  } catch {
    return null;
  }
}

function baseResultado(resultado, strValor, metodo) {
  return {
    resultado,
    valor: strValor,
    metodo,
    mensaje: null,
    estudiante: null,
    horaIngreso: null,
    fechaIngreso: null,
    registradoPor: null,
    ingresoPrevio: null,
    motivos: [],
    filaCorrecta: null,
  };
}

function mapearResultadoOffline(r, strValor, strMetodo) {
  const e = estudianteOffline(r.estudiante);
  const metodo = textoMetodo(strMetodo, r.metodo);
  switch (r.resultado) {
    case "PERMITIDO":
      return {
        ...baseResultado("PERMITIDO", strValor, metodo),
        estudiante: e,
        horaIngreso: horaDeIso(r.marcadoEn),
        fechaIngreso: fechaDeIso(r.marcadoEn),
        registradoPor: r.marcadoPor || null,
      };
    case "YA_MARCADO":
      return {
        ...baseResultado("YA_REGISTRADO", strValor, metodo),
        estudiante: e,
        ingresoPrevio: r.marcadoEn
          ? {
              hora: horaDeIso(r.marcadoEn),
              fecha: fechaDeIso(r.marcadoEn),
              aula: e?.aulaAsignada || null,
              registradoPor: r.marcadoPor || null,
            }
          : null,
      };
    case "NO_HABILITADO":
      return {
        ...baseResultado("NO_HABILITADO", strValor, metodo),
        estudiante: e,
        mensaje: r.motivo,
        motivos: r.motivo ? [r.motivo] : [],
      };
    case "OTRA_AULA":
      return {
        ...baseResultado("OTRA_AULA", strValor, metodo),
        estudiante: e,
        mensaje: r.motivo,
      };
    case "QR_INVALIDO":
      return {
        ...baseResultado("QR_INVALIDO", strValor, "QR"),
        mensaje: r.motivo,
      };
    case "NO_EN_NOMINA":
    default:
      return {
        ...baseResultado("NO_ENCONTRADO", strValor, metodo),
        mensaje: r.motivo,
      };
  }
}

// objConfig.boolSoloMios = la tabla muestra solo los ingresos que registró el usuario (operador)
export default function useControlIngreso(idExamenInicial = null, objConfig = {}) {
  const boolSoloMios = Boolean(objConfig.boolSoloMios);
  const objExamenInicial = objConfig.examenInicial || null;
  const strRolConfig = objConfig.rol || null;
  const [listExamenes, setListExamenes] = useState(() => objExamenInicial ? [objExamenInicial] : []);
  const [boolCargandoExamenes, setBoolCargandoExamenes] = useState(true);
  const [idExamen, setIdExamen] = useState(idExamenInicial);
  const [objContador, setObjContador] = useState(null);
  const [listUltimosServidor, setListUltimosServidor] = useState(null); // null = el backend aún no lo da
  const [objLocales, setObjLocales] = useState({}); // ingresos registrados en esta sesión, por examen
  const [objResultado, setObjResultado] = useState(null);
  const [boolValidando, setBoolValidando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strUltimoRegistrado, setStrUltimoRegistrado] = useState(null);
  const [numVersion, setNumVersion] = useState(0); // sube cada vez que hay un ingreso nuevo

  const refIdExamen = useRef(idExamen);
  refIdExamen.current = idExamen;
  const refExamenes = useRef(listExamenes);
  refExamenes.current = listExamenes;
  const examenPorId = (id) => refExamenes.current.find((e) => e.id === id) || {};

  const examenActual = listExamenes.find((e) => e.id === idExamen) || null;

  // Conectividad real + nómina local del examen elegido (HU07).
  const conn = useConectividad();
  const boolOffline = conn.estado === "offline";
  const nomina = useNominaLocal(examenActual?.idexamen ?? null);
  const refPrecache = useRef(new Set());
  const refIntentosPrecache = useRef(new Map());
  const [numReintentoPrecache, setNumReintentoPrecache] = useState(0);
  const MAX_INTENTOS_PRECACHE = 3;

  // Exámenes asignados (con su resumen)
  const fnCargarExamenes = useCallback(async () => {
    try {
      const listCargada = await obtenerExamenesAsignados();
      // En la vista docente la ruta de delegados puede no devolver datos;
      // conservar el examen recibido desde Mis exámenes.
      setListExamenes(listCargada.length ? listCargada : (objExamenInicial ? [objExamenInicial] : []));
    } catch (e) {
      setStrError(e.message);
    } finally {
      setBoolCargandoExamenes(false);
    }
  }, []);

  // Contador + últimos ingresos del examen elegido
  const fnRefrescar = useCallback(async () => {
    const id = refIdExamen.current;
    if (id == null) return;
    const ex = examenPorId(id);
    try {
      const [contador, ultimos] = await Promise.all([
        obtenerContador(id, ex),
        obtenerUltimosIngresos(id, LIMITE_ULTIMOS, ex, boolSoloMios),
      ]);
      if (refIdExamen.current !== id) return;
      setObjContador(contador);
      setListUltimosServidor(ultimos);
    } catch {
      // Errores de la consulta periódica: se reintenta en el siguiente ciclo
    }
  }, [boolSoloMios]);

  // Siempre se cargan una vez (la vista de control necesita los datos del examen elegido)
  useEffect(() => { fnCargarExamenes(); }, [fnCargarExamenes]);

  // Precarga de la nómina: al elegir un examen con red, se descarga en segundo plano
  // para habilitar la validación offline (sin fotos, que no son necesarias para validar).
  // Si la descarga no se completa (fallo de red o abortada por StrictMode), se reintenta
  // hasta MAX_INTENTOS_PRECACHE para no dejar el examen sin nómina local.
  useEffect(() => {
    const exId = examenActual?.idexamen;
    if (!exId || boolOffline || nomina.estado.lista || nomina.descargando) return;
    if (refPrecache.current.has(exId)) return;
    const intentos = refIntentosPrecache.current.get(exId) || 0;
    if (intentos >= MAX_INTENTOS_PRECACHE) return;
    refIntentosPrecache.current.set(exId, intentos + 1);
    refPrecache.current.add(exId);
    const reintentar = () => {
      refPrecache.current.delete(exId);
      setNumReintentoPrecache((v) => v + 1);
    };
    nomina.descargar({ incluirFotos: false }).then((res) => {
      if (res && res.ok === false && !res.omitido) reintentar();
    }).catch(reintentar);
  }, [examenActual?.idexamen, boolOffline, nomina.estado.lista, nomina.descargando, nomina.descargar, numReintentoPrecache]);

  // Tiempo real (polling): la lista se actualiza cuando no hay examen elegido,
  // y el contador + últimos ingresos cuando sí lo hay
  useEffect(() => {
    const fnTick = idExamen == null ? fnCargarExamenes : fnRefrescar;
    fnTick();
    const t = setInterval(fnTick, INTERVALO_TIEMPO_REAL_MS);
    return () => clearInterval(t);
  }, [idExamen, fnCargarExamenes, fnRefrescar]);

  // Validación con el motor local (offline-first).
  const fnValidarOffline = useCallback(async (strValor, strMetodo, objOpciones, ex) => {
    const id = refIdExamen.current;
    const exId = Number(ex?.idexamen ?? id);
    setBoolValidando(true);
    setStrError("");
    try {
      const usuario = obtenerUsuarioActual();
      const operadorId = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id ?? usuario?.correo;
      const rol = String(strRolConfig || usuario?.rol || "operador").toLowerCase();
      const fila = ex?.fila;
      const rangoApellidos = (rol === "operador" && fila?.desde && fila?.hasta)
        ? { desde: fila.desde, hasta: fila.hasta }
        : null;

      const parametros = {
        examenId: exId,
        asignaturaId: ex?.idasignatura ?? null,
        ambienteId: ex?.idambiente ?? null,
        lectura: String(strValor).trim(),
        metodo: strMetodo === "QR" ? "QR" : undefined,
        operadorId,
        rol,
        clockOffsetMs: obtenerClockOffsetMs(),
        aulaControl: ex?.aula || null,
        rangoApellidos,
      };

      const rVal = await motorValidar({ ...parametros, registrar: false });

      if (rVal.resultado === "SIN_NOMINA_LOCAL") {
        setObjResultado(null);
        setStrError("Este examen no tiene nómina descargada en el dispositivo. Conéctate a la red para descargarla y habilitar el registro offline.");
        return null;
      }

      if (rVal.resultado !== "PERMITIDO") {
        const mapeado = mapearResultadoOffline(rVal, strValor, strMetodo);
        setObjResultado({ ...mapeado, metodoOriginal: strMetodo, clave: Date.now() });
        return mapeado;
      }

      // Fila fuera de rango: solo aviso, no registra (salvo que se ignore la fila).
      if (rVal.fueraDeRango && !objOpciones.ignorarFila) {
        const mapeado = {
          ...baseResultado("FUERA_DE_FILA", strValor, textoMetodo(strMetodo, rVal.metodo)),
          estudiante: estudianteOffline(rVal.estudiante),
          filaCorrecta: fila
            ? { desde: fila.desde, hasta: fila.hasta, operador: usuario?.nombre || "" }
            : null,
        };
        setObjResultado({ ...mapeado, metodoOriginal: strMetodo, clave: Date.now() });
        return mapeado;
      }

      const rReg = await motorRegistrar({
        examenId: exId,
        asignaturaId: ex?.idasignatura ?? null,
        ambienteId: ex?.idambiente ?? null,
        codigoSis: rVal.estudiante.codigoSis,
        metodo: rVal.metodo || parametros.metodo || "CI",
        operadorId,
        rol,
        clockOffsetMs: obtenerClockOffsetMs(),
      });

      const mapeado = mapearResultadoOffline(rReg, strValor, strMetodo);
      setObjResultado({ ...mapeado, metodoOriginal: strMetodo, clave: Date.now() });

      if (mapeado.resultado === "PERMITIDO") {
        setStrUltimoRegistrado(mapeado.estudiante?.ci ?? null);
        setNumVersion((v) => v + 1);
        setObjLocales((prev) => ({
          ...prev,
          [id]: [
            {
              hora: mapeado.horaIngreso,
              metodo: mapeado.metodo,
              registradoPor: mapeado.registradoPor,
              estudiante: mapeado.estudiante,
            },
            ...(prev[id] || []),
          ].slice(0, LIMITE_ULTIMOS),
        }));
      }
      return mapeado;
    } catch (e) {
      setObjResultado(null);
      setStrError(e.message || "No se pudo validar el ingreso sin conexión.");
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [strRolConfig]);

  // objOpciones.ignorarFila = registrar aunque el apellido le toque a otro operador
  const fnValidar = useCallback(async (strValor, strMetodo, objOpciones = {}) => {
    const id = refIdExamen.current;
    if (id == null || !String(strValor || "").trim()) return null;
    const ex = examenPorId(id);

    const boolSinRed = boolOffline || (typeof navigator !== "undefined" && navigator.onLine === false);
    if (boolSinRed) {
      return await fnValidarOffline(strValor, strMetodo, objOpciones, ex);
    }

    setBoolValidando(true);
    setStrError("");
    try {
      const r = await validarIngreso(id, String(strValor).trim(), strMetodo, ex, objOpciones);
      setObjResultado({ ...r, metodoOriginal: strMetodo, clave: Date.now() });
      if (r.resultado === "PERMITIDO") {
        setStrUltimoRegistrado(r.estudiante ? r.estudiante.ci : null);
        setNumVersion((v) => v + 1);
        if (r.contador) setObjContador(r.contador);
        // Se guarda en la sesión para la tabla de últimos ingresos
        setObjLocales((prev) => ({
          ...prev,
          [id]: [
            { hora: r.horaIngreso, metodo: r.metodo, registradoPor: r.registradoPor, estudiante: r.estudiante },
            ...(prev[id] || []),
          ].slice(0, LIMITE_ULTIMOS),
        }));
        fnRefrescar();
      }
      return r;
    } catch (e) {
      // Si el servidor no responde por caída de red, se intenta el motor local.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return await fnValidarOffline(strValor, strMetodo, objOpciones, ex);
      }
      setObjResultado(null);
      setStrError(e.message);
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [boolOffline, fnRefrescar, fnValidarOffline]);

  const fnCerrarResultado = useCallback(() => setObjResultado(null), []);

  const fnElegirExamen = useCallback((id) => {
    setIdExamen(id);
    setObjResultado(null);
    setListUltimosServidor(null);
    setObjContador(null);
    setStrUltimoRegistrado(null);
    setStrError("");
  }, []);

  const fnVolverALista = useCallback(() => fnElegirExamen(null), [fnElegirExamen]);

  const fnDescargarNomina = useCallback(() => {
    nomina.descargar({ incluirFotos: false }).catch(() => {});
  }, [nomina.descargar]);

  // Si el backend ya devuelve los últimos ingresos, se usan; si no, los de esta sesión
  const listUltimos = listUltimosServidor && listUltimosServidor.length
    ? listUltimosServidor
    : objLocales[idExamen] || [];

  const objNomina = {
    estado: nomina.descargando ? "descargando" : (nomina.estado.lista ? "lista" : "ninguna"),
    total: nomina.estado.totalLocal || 0,
    porcentaje: nomina.descargando
      ? (nomina.progreso?.porcentaje ?? 0)
      : (nomina.estado.lista ? 100 : 0),
  };

  return {
    listExamenes, boolCargandoExamenes, examenActual, idExamen, objContador, listUltimos, objResultado,
    boolValidando, strError, strUltimoRegistrado, numVersion, boolOffline,
    objNomina, fnDescargarNomina,
    fnValidar, fnCerrarResultado, fnElegirExamen, fnVolverALista, fnRefrescar,
  };
}
