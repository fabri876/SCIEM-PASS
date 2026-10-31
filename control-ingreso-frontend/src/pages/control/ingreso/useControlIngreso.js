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
import { obtenerUsuarioActual, registrarActividad } from "../../../services/authService";
import { obtenerOrigenExamenes } from "../../../offline/examenRepo";
import {
  useConectividad,
  useNominaLocal,
  validarIngreso as motorValidar,
  registrarIngreso as motorRegistrar,
  obtenerClockOffsetMs,
  verificarAlmacenamiento,
  asignacionRepo,
} from "../../../offline";

const INTERVALO_TIEMPO_REAL_MS = 2000;
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

// Primera letra sin tildes y en mayúscula ("Ñ" se mantiene)
function inicialSinTildes(strTexto) {
  const strLetra = String(strTexto || "").trim().charAt(0).toUpperCase();
  return strLetra === "Ñ" ? strLetra : strLetra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function letraEnRango(strLetra, strDesde, strHasta) {
  if (!strLetra || !strDesde || !strHasta) return false;
  const d = inicialSinTildes(strDesde);
  const h = inicialSinTildes(strHasta);
  return strLetra.localeCompare(d, "es") >= 0 && strLetra.localeCompare(h, "es") <= 0;
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
        ...baseResultado("REGISTRADO_OFFLINE", strValor, metodo),
        estudiante: e,
        horaIngreso: horaDeIso(r.marcadoEn),
        fechaIngreso: fechaDeIso(r.marcadoEn),
        registradoPor: r.marcadoPor || null,
        modoOffline: true,
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
  const [sinRespaldoOffline, setSinRespaldoOffline] = useState(false);
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
      const usuario = obtenerUsuarioActual();
      const origenInfo = obtenerOrigenExamenes("delegados", usuario?.idUsuario ?? null);
      const faltaRespaldo = origenInfo?.origen === "local" && !origenInfo?.guardadoEn;
      setSinRespaldoOffline(Boolean(faltaRespaldo));
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
    // Si id es compuesto "idasignatura-idexamen-idambiente", desglosar partes
    const partesId = typeof id === "string" && id.includes("-") ? id.split("-") : [];
    const exId = Number(ex?.idexamen ?? (partesId[1] ? Number(partesId[1]) : id));
    const asignaturaId = ex?.idasignatura ?? (partesId[0] ? Number(partesId[0]) : null);
    const ambienteId = ex?.idambiente ?? (partesId[2] ? Number(partesId[2]) : null);

    setBoolValidando(true);
    setStrError("");
    try {
      const usuario = obtenerUsuarioActual();
      const operadorId = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id ?? usuario?.correo;
      const rol = String(strRolConfig || usuario?.rol || "operador").toLowerCase();
      const fila = ex?.fila;
      let rangoApellidos = null;

      // 1. Si viene de red (ex.fila con desde/hasta), usarlo como fuente de verdad
      if (rol === "operador" && fila?.desde && fila?.hasta) {
        rangoApellidos = { desde: fila.desde, hasta: fila.hasta };
      }

      // 2. Si no hay rango de red, consultar IndexedDB (offline o respaldo local)
      if (!rangoApellidos) {
        const asignacion = await asignacionRepo.obtenerRangoOperador(
          exId,
          operadorId,
          ambienteId
        );

        if (asignacion && asignacion.modoAsignacion === "SUBDIVISION") {
          rangoApellidos = {
            desde: asignacion.apellidoDesde,
            hasta: asignacion.apellidoHasta,
          };
        }
        // Si modoAsignacion es "ONLINE", dejamos rangoApellidos = null (sin restricción)
      }

      const parametros = {
        examenId: exId,
        asignaturaId,
        ambienteId,
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

      // Apellido fuera del tramo de este ayudante: solo aviso, no registra (salvo que se ignore el tramo).
      // Se busca el tramo del otro ayudante al que le corresponde el estudiante.
      if (rVal.fueraDeRango && !objOpciones.ignorarFila) {
        const estOffline = estudianteOffline(rVal.estudiante);
        const strInicial = inicialSinTildes(rVal.estudiante?.apellidoPaterno || estOffline?.apellidos);
        const filaOtro = (ex?.filas || []).find((f) => !f.esMia && letraEnRango(strInicial, f.desde, f.hasta)) || null;
        const mapeado = {
          ...baseResultado("FUERA_DE_FILA", strValor, textoMetodo(strMetodo, rVal.metodo)),
          estudiante: estOffline,
          filaCorrecta: filaOtro
            ? { desde: filaOtro.desde, hasta: filaOtro.hasta, operador: filaOtro.operador || "" }
            : null,
        };
        setObjResultado({ ...mapeado, metodoOriginal: strMetodo, clave: Date.now() });
        return mapeado;
      }

      // Chequeo proactivo de espacio antes de escribir en IndexedDB
      const almacenamiento = await verificarAlmacenamiento();
      if (almacenamiento.disponible && almacenamiento.critico) {
        setStrError("Espacio de almacenamiento local insuficiente para registrar el ingreso. Libera espacio en el navegador.");
        setObjResultado(null);
        return null;
      }

      const rReg = await motorRegistrar({
        examenId: exId,
        asignaturaId,
        ambienteId,
        codigoSis: rVal.estudiante.codigoSis,
        metodo: rVal.metodo || parametros.metodo || "CI",
        operadorId,
        rol,
        clockOffsetMs: obtenerClockOffsetMs(),
      });

      const mapeado = mapearResultadoOffline(rReg, strValor, strMetodo);
      setObjResultado({ ...mapeado, metodoOriginal: strMetodo, clave: Date.now() });

      if (mapeado.resultado === "PERMITIDO" || mapeado.resultado === "REGISTRADO_OFFLINE") {
        setStrUltimoRegistrado(mapeado.estudiante?.ci ?? null);
        setNumVersion((v) => v + 1);
        setObjContador((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ingresaron: (prev.ingresaron ?? 0) + 1,
            pendientes: Math.max(0, (prev.pendientes ?? 1) - 1),
          };
        });
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
      setStrError(e.message || "El registro del ingreso no se completó. Si hubo conexión previa, el intento queda pendiente para sincronizar.");
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [strRolConfig]);

  // objOpciones.ignorarFila = registrar aunque el apellido le toque a otro operador
  const fnValidar = useCallback(async (strValor, strMetodo, objOpciones = {}) => {
    registrarActividad();
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
      // Si la nómina local está descargada y el servidor falla (timeout, error de red o backend caído),
      // derivar automáticamente al motor offline para no detener el ingreso de los estudiantes.
      if (nomina.estado.lista || (typeof navigator !== "undefined" && navigator.onLine === false)) {
        return await fnValidarOffline(strValor, strMetodo, objOpciones, ex);
      }
      setObjResultado(null);
      setStrError(e.message);
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [boolOffline, fnRefrescar, fnValidarOffline, nomina.estado.lista]);

  const fnCerrarResultado = useCallback(() => setObjResultado(null), []);

  const fnElegirExamen = useCallback((id) => {
    setIdExamen(id);
    setObjResultado(null);
    setListUltimosServidor(null);
    setObjContador(null);
    setStrUltimoRegistrado(null);
    setStrError("");
    if (id == null) {
      // Al volver a la lista, actualizar inmediatamente los contadores del
      // examen para reflejar los ingresos registrados en el control.
      fnCargarExamenes();
    }
  }, [fnCargarExamenes]);

  const fnVolverALista = useCallback(() => fnElegirExamen(null), [fnElegirExamen]);

  const fnDescargarNomina = useCallback(() => {
    return nomina.descargar({ incluirFotos: false });
  }, [nomina.descargar]);

  // Si el backend ya devuelve los últimos ingresos, se usan; si no, los de esta sesión
  const listUltimos = listUltimosServidor && listUltimosServidor.length
    ? listUltimosServidor
    : objLocales[idExamen] || [];

  const objNomina = {
    estado: nomina.descargando ? "descargando" : (nomina.estado.lista ? "lista" : "ninguna"),
    total: nomina.estado.totalLocal || 0,
    descargadaEn: nomina.estado.descargadaEn || null,
    porcentaje: nomina.descargando
      ? (nomina.progreso?.porcentaje ?? 0)
      : (nomina.estado.lista ? 100 : 0),
  };

  return {
    listExamenes, boolCargandoExamenes, sinRespaldoOffline, examenActual, idExamen, objContador, listUltimos, objResultado,
    boolValidando, strError, strUltimoRegistrado, numVersion, boolOffline,
    objNomina, fnDescargarNomina,
    fnValidar, fnCerrarResultado, fnElegirExamen, fnVolverALista, fnRefrescar,
  };
}



