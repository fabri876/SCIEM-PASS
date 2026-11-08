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
  // Fase 1 del control: estudiante identificado (aún sin registrar) que espera
  // la verificación facial. null = todavía no se identificó a nadie.
  const [objIdentificacion, setObjIdentificacion] = useState(null);
  const [boolValidando, setBoolValidando] = useState(false);
  const [strError, setStrError] = useState("");
  const [strUltimoRegistrado, setStrUltimoRegistrado] = useState(null);
  const [numVersion, setNumVersion] = useState(0); // sube cada vez que hay un ingreso nuevo

  const refIdExamen = useRef(idExamen);
  refIdExamen.current = idExamen;
  const refIdentificacion = useRef(null);
  refIdentificacion.current = objIdentificacion;
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
    const usuario = obtenerUsuarioActual();
    const boolEsOperador = usuario?.rol === "OPERADOR";

    // Docente / Administrador: entran con el examen ya elegido desde "Mis
    // exámenes" (ControlIngresoDocente pasa el examen inicial). No consultan
    // /api/v1/examenes/delegados, que es exclusivo del OPERADOR y exige
    // hasRole('OPERADOR') en el backend (ahora activo con @EnableMethodSecurity).
    if (!boolEsOperador) {
      setListExamenes(objExamenInicial ? [objExamenInicial] : []);
      setBoolCargandoExamenes(false);
      return;
    }

    try {
      const listCargada = await obtenerExamenesAsignados();
      // En la vista docente la ruta de delegados puede no devolver datos;
      // conservar el examen recibido desde Mis exámenes.
      const origenInfo = obtenerOrigenExamenes("delegados", usuario?.idUsuario ?? null);
      const faltaRespaldo = origenInfo?.origen === "local" && !origenInfo?.guardadoEn;
      setSinRespaldoOffline(Boolean(faltaRespaldo));
      setListExamenes(listCargada.length ? listCargada : (objExamenInicial ? [objExamenInicial] : []));
    } catch (e) {
      setStrError(e.message);
    } finally {
      setBoolCargandoExamenes(false);
    }
  }, [objExamenInicial?.id]);

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

  /* ---------- Actualización común tras un registro exitoso ---------- */
  const fnAplicarRegistro = useCallback((mapeado, identificacion) => {
    setObjResultado({ ...mapeado, clave: Date.now() });
    setObjIdentificacion(null);
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
    const id = refIdExamen.current;
    setObjLocales((prev) => ({
      ...prev,
      [id]: [
        {
          hora: mapeado.horaIngreso,
          metodo: mapeado.metodo,
          conFacial: mapeado.conFacial,
          registradoPor: mapeado.registradoPor || identificacion?.registradoPor || null,
          estudiante: mapeado.estudiante,
        },
        ...(prev[id] || []),
      ].slice(0, LIMITE_ULTIMOS),
    }));
    fnRefrescar();
  }, [fnRefrescar]);

  /* ---------- Fase 1: identificar sin registrar (offline) ---------- */
  const fnIdentificarOffline = useCallback(async (strValor, strMetodo, objOpciones, ex) => {
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

      const est = estudianteOffline(rVal.estudiante);
      const identificacion = {
        estudiante: est,
        codigoSis: rVal.estudiante?.codigoSis ?? est?.sis ?? "",
        valor: String(strValor).trim(),
        metodo: textoMetodo(strMetodo, rVal.metodo),
        metodoOriginal: strMetodo === "QR" ? "QR" : "MANUAL",
        metodoMotor: rVal.metodo || (strMetodo === "QR" ? "QR" : undefined),
        offline: true,
        examenId: exId,
        asignaturaId,
        ambienteId,
        operadorId,
        rol,
      };
      setObjResultado(null);
      setObjIdentificacion(identificacion);
      return identificacion;
    } catch (e) {
      setObjResultado(null);
      setStrError(e.message || "No se pudo identificar al estudiante.");
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [strRolConfig]);

  /* ---------- Fase 1: identificar sin registrar (online) ---------- */
  const fnIdentificar = useCallback(async (strValor, strMetodo, objOpciones = {}) => {
    registrarActividad();
    const id = refIdExamen.current;
    if (id == null || !String(strValor || "").trim()) return null;
    const ex = examenPorId(id);
    setObjResultado(null);
    setObjIdentificacion(null);

    const boolSinRed = boolOffline || (typeof navigator !== "undefined" && navigator.onLine === false);
    if (boolSinRed) {
      return await fnIdentificarOffline(strValor, strMetodo, objOpciones, ex);
    }

    setBoolValidando(true);
    setStrError("");
    try {
      // Solo verifica: el backend valida QR, horario, habilitación, duplicado
      // y aula, pero NO crea el ingreso. El registro ocurre tras el facial.
      const r = await validarIngreso(id, String(strValor).trim(), strMetodo, ex, { ...objOpciones, soloVerificar: true });
      if (r.resultado === "IDENTIFICADO" || r.resultado === "PERMITIDO") {
        const est = r.estudiante || null;
        setObjIdentificacion({
          estudiante: est,
          codigoSis: est?.sis ?? "",
          valor: String(strValor).trim(),
          metodo: r.metodo,
          metodoOriginal: strMetodo === "QR" ? "QR" : "MANUAL",
          offline: false,
        });
        return r;
      }
      setObjResultado({ ...r, metodoOriginal: strMetodo, clave: Date.now() });
      return r;
    } catch (e) {
      // Si la nómina local está descargada y el servidor falla (timeout, error de red o backend caído),
      // derivar automáticamente al motor offline para no detener la fila.
      if (nomina.estado.lista || (typeof navigator !== "undefined" && navigator.onLine === false)) {
        return await fnIdentificarOffline(strValor, strMetodo, objOpciones, ex);
      }
      setObjResultado(null);
      setStrError(e.message);
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [boolOffline, fnIdentificarOffline, nomina.estado.lista]);

  /* ---------- Fase 2: registrar con facial ---------- */
  const fnRegistrarEnMotor = useCallback(async (identificacion, scores = null) => {
    // Chequeo proactivo de espacio antes de escribir en IndexedDB
    const almacenamiento = await verificarAlmacenamiento();
    if (almacenamiento.disponible && almacenamiento.critico) {
      setStrError("Espacio de almacenamiento local insuficiente para registrar el ingreso. Libera espacio en el navegador.");
      setObjResultado(null);
      return null;
    }

    const rReg = await motorRegistrar({
      examenId: identificacion.examenId ?? refIdExamen.current,
      asignaturaId: identificacion.asignaturaId,
      ambienteId: identificacion.ambienteId,
      codigoSis: identificacion.codigoSis,
      metodo: identificacion.metodoMotor || identificacion.metodoOriginal || "CI",
      operadorId: identificacion.operadorId,
      rol: identificacion.rol,
      clockOffsetMs: obtenerClockOffsetMs(),
      scoreFacial: scores?.scoreFacial ?? null,
      livenessScore: scores?.livenessScore ?? null,
      modelVersion: scores?.modelVersion ?? null,
      deviceId: scores?.deviceId ?? null,
    });

    const mapeado = mapearResultadoOffline(rReg, identificacion.valor, identificacion.metodo);
    const enriquecido = {
      ...mapeado,
      conFacial: scores?.scoreFacial != null,
      registradoPor: mapeado.registradoPor || identificacion.registradoPor || null,
    };
    fnAplicarRegistro(enriquecido, identificacion);
    return enriquecido;
  }, [fnAplicarRegistro]);

  const fnRegistrarConFacial = useCallback(async (scores) => {
    const ident = refIdentificacion.current;
    if (!ident || !scores || scores.scoreFacial == null) return null;
    setBoolValidando(true);
    setStrError("");
    try {
      if (ident.offline) {
        return await fnRegistrarEnMotor(ident, scores);
      }
      const ex = examenPorId(refIdExamen.current);
      const r = await validarIngreso(refIdExamen.current, ident.valor, ident.metodoOriginal, ex, scores);
      const enriquecido = { ...r, conFacial: true };
      fnAplicarRegistro(enriquecido, ident);
      return enriquecido;
    } catch (e) {
      // Sin red o servidor caído: se registra en el motor local con los scores.
      if (nomina.estado.lista || (typeof navigator !== "undefined" && navigator.onLine === false)) {
        return await fnRegistrarEnMotor(ident, scores);
      }
      setObjResultado(null);
      setStrError(e.message || "No se pudo registrar el ingreso con verificación facial.");
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [fnAplicarRegistro, fnRegistrarEnMotor, nomina.estado.lista]);

  /* ---------- Fase 2 sin facial (solo offline) ---------- */
  const fnRegistrarSinFacial = useCallback(async () => {
    const ident = refIdentificacion.current;
    if (!ident) return null;
    setBoolValidando(true);
    setStrError("");
    try {
      return await fnRegistrarEnMotor(ident, null);
    } catch (e) {
      setObjResultado(null);
      setStrError(e.message || "No se pudo registrar el ingreso sin verificación facial.");
      return null;
    } finally {
      setBoolValidando(false);
    }
  }, [fnRegistrarEnMotor]);

  /* ---------- Excepcional facial autorizado (operador/docente online) ---------- */
  const fnFinalizarExcepcional = useCallback((respuesta) => {
    const ident = refIdentificacion.current;
    const hora = respuesta?.horaIngreso
      ? horaDeIso(respuesta.horaIngreso)
      : new Date().toLocaleTimeString("es-BO", { hour12: false });
    const mapeado = {
      ...baseResultado("PERMITIDO", ident?.valor ?? "", "Manual"),
      estudiante: ident?.estudiante ?? null,
      horaIngreso: hora,
      fechaIngreso: fechaDeIso(respuesta?.horaIngreso) || fechaDeIso(new Date().toISOString()),
      registradoPor: respuesta?.autorizadoPor || null,
      conFacial: false,
      excepcional: true,
    };
    fnAplicarRegistro(mapeado, ident);
    return mapeado;
  }, [fnAplicarRegistro]);

  const fnLimpiarIdentificacion = useCallback(() => {
    setObjIdentificacion(null);
    setStrError("");
  }, []);

  const fnCerrarResultado = useCallback(() => setObjResultado(null), []);

  const fnElegirExamen = useCallback((id) => {
    setIdExamen(id);
    setObjResultado(null);
    setObjIdentificacion(null);
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
    listExamenes, boolCargandoExamenes, sinRespaldoOffline, examenActual, idExamen, objContador, listUltimos, objResultado, objIdentificacion,
    boolValidando, strError, strUltimoRegistrado, numVersion, boolOffline, objNomina, fnDescargarNomina,
    fnIdentificar, fnRegistrarConFacial, fnRegistrarSinFacial, fnFinalizarExcepcional, fnLimpiarIdentificacion,
    fnCerrarResultado, fnElegirExamen, fnVolverALista, fnRefrescar,
  };
}



