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
import { orientacionJornadaRepo } from "../../../offline/orientacionJornadaRepo";
import { buscarDestinoJornada } from "../../../offline/orientacionJornada";
import { intentoExamenPendienteRepo } from "../../../offline/intentoExamenPendienteRepo";
import { generarUuid } from "../../../offline/uuid";
import { useIntentosExamenPendientes } from "../../../offline/useIntentosExamenPendientes";
import { liveQuery } from "dexie";
import { db } from "../../../offline/db";
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
        // La marca completa del dispositivo: es la que se guarda en la nómina local.
        horaIngresoIso: r.marcadoEn || null,
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
    case "RETIRADO":
      return {
        ...baseResultado("RETIRADO", strValor, metodo),
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
      return {
        ...baseResultado("NO_EN_NOMINA_OFFLINE", strValor, metodo),
        mensaje: r.motivo,
      };
    default:
      return {
        ...baseResultado("NO_ENCONTRADO", strValor, metodo),
        mensaje: r.motivo,
      };
  }
}

// objConfig.boolSoloMios = la tabla muestra solo los ingresos que registró el usuario (operador)
// Si cambia alguna cifra del examen, la nómina local quedó vieja.
function cambioEnContador(previo, actual) {
  if (!previo || !actual) return false;
  return (
    previo.ingresaron !== actual.ingresaron ||
    previo.expulsados !== actual.expulsados ||
    previo.inhabilitados !== actual.inhabilitados ||
    previo.habilitados !== actual.habilitados ||
    previo.pendientes !== actual.pendientes
  );
}

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
  const refVerificacionEnCurso = useRef(false);
  const refSolicitudPendiente = useRef(null);
  refIdExamen.current = idExamen;
  const refIdentificacion = useRef(null);
  refIdentificacion.current = objIdentificacion;
  const refExamenes = useRef(listExamenes);
  refExamenes.current = listExamenes;
  const examenPorId = (id) => refExamenes.current.find((e) => e.id === id) || {};

  const examenActual = listExamenes.find((e) => e.id === idExamen) || null;
  const objIntentosPendientes = useIntentosExamenPendientes(obtenerUsuarioActual()?.idUsuario);

  useEffect(() => {
    const uuid = objResultado?.clientUuid;
    if (!uuid || objResultado?.resultado !== "EXAMEN_INCORRECTO_OFFLINE") return undefined;
    const sub = liveQuery(() => db.intentos_examen_pendientes.get(uuid)).subscribe({
      next: (registro) => {
        if (!registro) return;
        setObjResultado((actual) => actual?.clientUuid === uuid && actual.estadoSync !== registro.estado
          ? { ...actual, estadoSync: registro.estado } : actual);
      },
    });
    return () => sub.unsubscribe();
  }, [objResultado?.clientUuid, objResultado?.resultado]);

  // Conectividad real + nómina local del examen elegido (HU07).
  const conn = useConectividad();
  const boolOffline = conn.estado === "offline";
  const nomina = useNominaLocal(examenActual?.idexamen ?? null);
  // Se usa la función suelta (y no "nomina.actualizar") para no depender del
  // objeto completo: si no, el efecto se re-ejecuta en cada render.
  const { actualizar: fnActualizarNomina } = nomina;
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

  // Sincronización inversa: la nómina local se pone al día con el servidor.
  //
  // Hay tres momentos en los que el dispositivo puede quedarse con una copia
  // vieja de la nómina y contradecir al servidor:
  //   1. El backend cambió (por ejemplo, ahora informa quién fue expulsado).
  //      -> se resuelve con el refresco periódico.
  //   2. Entró o fue expulsado un estudiante (en este equipo o en otro).
  //      -> el polling de 2 s ya pide el contador; si cambia, se refresca.
  //   3. El equipo estuvo sin señal.
  //      -> se resuelve al recuperar la conexión.
  const refContadorPrevio = useRef(null);
  const refUltimoRefrescoNomina = useRef(0);
  const MIN_SEGUNDOS_ENTRE_REFRESCOS = 30;
  const SEGUNDOS_REFRESCO_PERIODICO = 180;

  // Devuelve true si se llegó a lanzar el refresco (false si el throttle lo
  // frenó, para que el llamador pueda reintentar en el siguiente ciclo).
  const fnRefrescarNomina = useCallback(() => {
    const ahora = Date.now();
    if (ahora - refUltimoRefrescoNomina.current < MIN_SEGUNDOS_ENTRE_REFRESCOS) return false;
    refUltimoRefrescoNomina.current = ahora;
    fnActualizarNomina({ incluirFotos: false }).catch(() => {
      // Si falla, se reintenta en el siguiente ciclo (la copia local sigue
      // en pie: un refresco fallido no la invalida).
    });
    return true;
  }, [fnActualizarNomina]);

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

      // Si las cifras del examen cambiaron, la nómina local quedó vieja:
      // se actualiza para que el control offline no contradiga al servidor.
      const previo = refContadorPrevio.current;
      if (previo && !boolOffline && cambioEnContador(previo, contador)) {
        // Si el throttle frenó el refresco, el contador NO se actualiza: el
        // siguiente ciclo vuelve a detectar el cambio y reintenta.
        if (fnRefrescarNomina()) refContadorPrevio.current = contador;
      } else {
        refContadorPrevio.current = contador;
      }
    } catch {
      // Errores de la consulta periódica: se reintenta en el siguiente ciclo
    }
  }, [boolSoloMios, boolOffline, fnRefrescarNomina]);

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

  // Descarga independiente: un fallo aqui nunca convierte la nomina en completa
  // ni impide el control habitual. El resultado es solo una copia informativa.
  useEffect(() => {
    const usuario = obtenerUsuarioActual();
    if (boolOffline || !usuario?.idUsuario || !examenActual?.idasignatura ||
      !examenActual?.idexamen || !examenActual?.idambiente) return undefined;
    const controller = new AbortController();
    orientacionJornadaRepo.descargar({
      operadorId: usuario.idUsuario,
      asignaturaControl: examenActual.idasignatura,
      examenControl: examenActual.idexamen,
      ambienteControl: examenActual.idambiente,
      signal: controller.signal,
    }).catch(() => {
      // Si no se dispone de una copia de la jornada se mantiene la respuesta
      // conservadora de no encontrado en nomina, sin inventar orientacion.
    });
    return () => controller.abort();
  }, [boolOffline, examenActual?.idasignatura, examenActual?.idexamen, examenActual?.idambiente]);

  // Tiempo real (polling): la lista se actualiza cuando no hay examen elegido,
  // y el contador + últimos ingresos cuando sí lo hay
  useEffect(() => {
    const fnTick = idExamen == null ? fnCargarExamenes : fnRefrescar;
    fnTick();
    const t = setInterval(fnTick, INTERVALO_TIEMPO_REAL_MS);
    return () => clearInterval(t);
  }, [idExamen, fnCargarExamenes, fnRefrescar]);

  // Refresco periódico de la nómina mientras hay conexión. Cubre el caso en
  // que el backend cambió (por ejemplo, ahora informa quién fue expulsado) y
  // el equipo nunca estuvo sin señal: sin esto la copia local se quedaría
  // vieja y el control offline contradiría al servidor.
  useEffect(() => {
    if (boolOffline || !examenActual?.idexamen) return undefined;
    const t = setInterval(() => {
      fnRefrescarNomina();
    }, SEGUNDOS_REFRESCO_PERIODICO * 1000);
    return () => clearInterval(t);
  }, [boolOffline, examenActual?.idexamen, fnRefrescarNomina]);

  // Al entrar al control de ingreso con la nómina ya descargada, se refresca
  // una vez: la copia puede ser de antes del último despliegue del backend.
  useEffect(() => {
    if (!examenActual?.idexamen || boolOffline || !nomina.estado.lista) return;
    fnRefrescarNomina();
  }, [examenActual?.idexamen, boolOffline, nomina.estado.lista, fnRefrescarNomina]);

  /**
   * Al recuperar la conexión, la nómina local se refresca.
   *
   * Mientras el equipo estuvo sin señal pudo pasar de todo: un ingreso hecho
   * online (en este equipo o en otro), una expulsión aplicada por el docente,
   * una habilitación cambiada. La precarga inicial solo baja la nómina una
   * vez, así que sin este refresco el dispositivo queda con una copia vieja y
   * el control offline puede contradecir al servidor.
   *
   * Se usa "actualizar" (no "descargar"): no purga las filas que el servidor
   * ya no manda y no vuelve a bajar las fotos. El backend todavía ignora el
   * "updatedSince", así que esto baja la lista completa una sola vez, al
   * recuperar la señal.
   */
  const refEstabaOffline = useRef(boolOffline);
  useEffect(() => {
    const antes = refEstabaOffline.current;
    refEstabaOffline.current = boolOffline;
    // Solo en la transición offline -> online.
    if (!antes || boolOffline) return;
    if (!examenActual?.idexamen) return;
    fnActualizarNomina({ incluirFotos: false }).catch(() => {
      // Si el refresco falla, se reintenta en el próximo ciclo de conexión.
    });
  }, [boolOffline, examenActual?.idexamen, fnActualizarNomina]);

  /**
   * Marca en la nómina local que el estudiante ya ingresó.
   *
   * El registro ONLINE lo guarda el servidor, pero la nómina del dispositivo
   * seguía como si el estudiante no hubiera entrado. Al pasar a modo offline
   * el motor de validación pregunta por "marcadoLocal" y lo dejaba pasar una
   * segunda vez. Con esta marca, el dispositivo y el servidor dicen lo mismo.
   *
   * El camino offline ya marca la nómina (asistenciaRepo.registrarMarca), así
   * que aquí es idempotente y no cambia nada.
   */
  const fnMarcarIngresoEnNominaLocal = useCallback(async (mapeado, identificacion) => {
    const esRegistro = mapeado?.resultado === "PERMITIDO" || mapeado?.resultado === "REGISTRADO_OFFLINE";
    if (!esRegistro) return;

    const exId = Number(refIdExamen.current);
    if (!Number.isInteger(exId) || exId <= 0) return;

    const sis = String(identificacion?.codigoSis || mapeado.estudiante?.sis || "").trim();
    if (!sis) return;

    // La hora del servidor es la autoridad; si no viene, la del equipo.
    const marcadoEn = mapeado.horaIngresoIso || new Date().toISOString();
    try {
      await db.nominas.update([exId, sis], {
        marcadoLocal: 1,
        marcadoEn,
        marcadoPor: mapeado.registradoPor || identificacion?.registradoPor || null,
      });
    } catch (error) {
      // La marca local es una comodidad: si falla, el refresco de la nómina
      // (al recuperar la conexión) la vuelve a poner.
      console.warn("[controlIngreso] No se pudo marcar el ingreso en la nómina local:", error);
    }
  }, []);

  /* ---------- Actualización común tras un registro exitoso ---------- */
  const fnAplicarRegistro = useCallback(async (mapeado, identificacion) => {
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
    // La nómina local se actualiza con el ingreso: sin esto, al pasar a
    // offline el dispositivo no reconocía el ingreso hecho online.
    await fnMarcarIngresoEnNominaLocal(mapeado, identificacion);
    fnRefrescar();
  }, [fnRefrescar, fnMarcarIngresoEnNominaLocal]);

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
        if (rVal.resultado === "NO_EN_NOMINA" && !rVal.ambiguo) {
          const copia = await orientacionJornadaRepo.obtener({ operadorId, examenControl: exId });
          if (copia) {
            let tipo = "SIS";
            let clave = String(strValor).trim();
            let qrHash = null;
            let qrToken = null;
            if (strMetodo === "QR") {
              const match = /^SCIEMPASS:1:(.+)$/.exec(clave);
              if (match && globalThis.crypto?.subtle) {
                qrToken = match[1].trim();
                const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(qrToken));
                qrHash = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
                clave = qrHash;
                tipo = "QR_HASH";
              } else {
                clave = "";
              }
            }
            const fechaCreacion = Date.now() + obtenerClockOffsetMs();
            let hallazgo = buscarDestinoJornada({ candidatos: copia.candidatos, tipo, identificador: clave, examenActual: exId, ahora: fechaCreacion });
            if (strMetodo !== "QR" && hallazgo.estado === "SIN_COINCIDENCIA") {
              tipo = "CI";
              hallazgo = buscarDestinoJornada({ candidatos: copia.candidatos, tipo, identificador: clave, examenActual: exId, ahora: fechaCreacion });
            }
            const candidato = hallazgo.destino || hallazgo.estudiante;
            if ((hallazgo.estado === "ENCONTRADO" || hallazgo.estado === "AMBIGUO") && candidato && globalThis.crypto?.getRandomValues) {
              const destino = hallazgo.destino;
              const identidad = `${id}|${strMetodo}|${String(strValor).trim()}`;
              const recuperada = refSolicitudPendiente.current?.identidad === identidad
                ? refSolicitudPendiente.current : null;
              const clientUuid = recuperada?.clave || generarUuid();
              await intentoExamenPendienteRepo.guardar({
                clientUuid, operadorId, asignaturaControl: asignaturaId, examenControl: exId,
                ambienteControl: ambienteId, estudianteSis: candidato.sis,
                asignaturaDestino: destino?.idAsignatura ?? null, examenDestino: destino?.idExamen ?? null, ambienteDestino: destino?.idAmbiente ?? null,
                metodo: strMetodo === "QR" ? "QR" : tipo, qrHash, qrToken, fechaCreacion,
              });
              if (recuperada && refSolicitudPendiente.current === recuperada) refSolicitudPendiente.current = null;
              const mapeado = {
                ...baseResultado("EXAMEN_INCORRECTO_OFFLINE", strMetodo === "QR" ? "" : strValor, textoMetodo(strMetodo, rVal.metodo)),
                clientUuid, estadoSync: "pendiente",
                estudiante: { nombres: candidato.nombre, apellidos: "", sis: candidato.sis, ci: candidato.ci,
                  carrera: candidato.carrera || "Carrera no disponible" },
                otroExamen: destino ? { asignatura: destino.asignatura, aula: destino.aula, edificio: destino.edificio } : null,
                mensaje: destino ? null : "Hay varios exámenes posibles. Consulta al docente antes de orientar al estudiante.",
              };
              setObjResultado({ ...mapeado, metodoOriginal: strMetodo, clave: Date.now() });
              return mapeado;
            }
            if (hallazgo.estado === "AMBIGUO") {
              const mapeado = { ...baseResultado("AMBIGUO_OFFLINE", "", textoMetodo(strMetodo, rVal.metodo)) };
              setObjResultado({ ...mapeado, metodoOriginal: strMetodo, clave: Date.now() });
              return mapeado;
            }
          }
        }
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

    // Un doble clic no debe producir dos verificaciones simultaneas.
    if (refVerificacionEnCurso.current) return null;

    const boolSinRed = boolOffline || (typeof navigator !== "undefined" && navigator.onLine === false);
    if (boolSinRed) {
      return await fnIdentificarOffline(strValor, strMetodo, objOpciones, ex);
    }

    refVerificacionEnCurso.current = true;
    setBoolValidando(true);
    setStrError("");
    try {
      const identidad = `${id}|${strMetodo}|${String(strValor).trim()}`;
      if (refSolicitudPendiente.current?.identidad !== identidad) {
        if (!globalThis.crypto?.getRandomValues) throw new Error("El dispositivo no permite generar una clave segura para la verificación.");
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        refSolicitudPendiente.current = { identidad, clave: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` };
      }
      const r = await validarIngreso(id, String(strValor).trim(), strMetodo, ex,
        { ...objOpciones, soloVerificar: true, solicitud: refSolicitudPendiente.current.clave });
      refSolicitudPendiente.current = null;
      setObjResultado({ ...r, metodoOriginal: strMetodo, clave: Date.now() });
      if (r.resultado === "EXAMEN_INCORRECTO" || r.resultado === "YA_REGISTRADO") fnRefrescar();
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
      // derivar automáticamente al motor offline para no detener el ingreso de los estudiantes.
      if (nomina.estado.lista || (typeof navigator !== "undefined" && navigator.onLine === false)) {
        return await fnIdentificarOffline(strValor, strMetodo, objOpciones, ex);
      }
      setObjResultado(null);
      setStrError(e.message);
      return null;
    } finally {
      refVerificacionEnCurso.current = false;
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
    await fnAplicarRegistro(enriquecido, identificacion);
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
      await fnAplicarRegistro(enriquecido, ident);
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
  const fnFinalizarExcepcional = useCallback(async (respuesta) => {
    const ident = refIdentificacion.current;
    const hora = respuesta?.horaIngreso
      ? horaDeIso(respuesta.horaIngreso)
      : new Date().toLocaleTimeString("es-BO", { hour12: false });
    const mapeado = {
      ...baseResultado("PERMITIDO", ident?.valor ?? "", "Manual"),
      estudiante: ident?.estudiante ?? null,
      horaIngreso: hora,
      // La hora completa del servidor: se usa para marcar la nómina local.
      horaIngresoIso: respuesta?.horaIngreso || null,
      fechaIngreso: fechaDeIso(respuesta?.horaIngreso) || fechaDeIso(new Date().toISOString()),
      registradoPor: respuesta?.autorizadoPor || null,
      conFacial: false,
      excepcional: true,
    };
    await fnAplicarRegistro(mapeado, ident);
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
    objIntentosPendientes,
    fnIdentificar, fnRegistrarConFacial, fnRegistrarSinFacial, fnFinalizarExcepcional, fnLimpiarIdentificacion,
    fnCerrarResultado, fnElegirExamen, fnVolverALista, fnRefrescar,
  };
}



