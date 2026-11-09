import { sincronizarLoteFacial } from "../services/facialService";
import { aHoraLocalIso } from "./fechaLocal";
import {
  contarPendientesFaciales,
  marcarFacialesSincronizados,
  obtenerPendientesFaciales,
} from "./facialSqliteDb";

// Los estados que el backend devuelve cuando el elemento ya quedó registrado.
const ESTADOS_MARCADOS = new Set(["PROCESADO", "DUPLICADO", "COLISION_AUDITADA"]);
const TAMANO_LOTE = 100;
// Tope de seguridad para no encadenar peticiones sin fin si la cola no avanza.
const MAX_VUELTAS = 50;

function construirLote(intentos, ingresos) {
  return {
    intentos: intentos.map((intento) => ({
      clientUuid: intento.clientUuid,
      idUsuarioEstudiante: intento.idUsuarioEstudiante,
      idAsignatura: intento.idAsignatura,
      idExamen: intento.idExamen,
      idAmbiente: intento.idAmbiente,
      score: intento.score ?? null,
      livenessScore: intento.livenessScore ?? null,
      resultado: intento.resultado,
      fotoPath: intento.fotoLocalUri || null,
      deviceId: intento.deviceId,
      modelVersion: intento.modelVersion,
      capturadoEn: aHoraLocalIso(intento.capturadoEn),
    })),
    ingresos: ingresos.map((ingreso) => ({
      clientUuid: ingreso.clientUuid,
      idUsuarioEstudiante: ingreso.idUsuarioEstudiante,
      codsisEstudiante: ingreso.codsisEstudiante,
      idAsignatura: ingreso.idAsignatura,
      idExamen: ingreso.idExamen,
      idAmbiente: ingreso.idAmbiente,
      metodoIngreso: ingreso.metodoIngreso,
      tipoIngreso: ingreso.tipoIngreso,
      motivoExcepcion: ingreso.motivoExcepcion || null,
      observacionIngreso: ingreso.observacionIngreso || null,
      scoreFacial: ingreso.scoreFacial ?? null,
      livenessScore: ingreso.livenessScore ?? null,
      modelVersion: ingreso.modelVersion,
      deviceId: ingreso.deviceId,
      horaMarcacion: aHoraLocalIso(ingreso.horaMarcacion),
    })),
  };
}

/**
 * Envía la cola facial pendiente. Lo llama el planificador de sincronización,
 * que ya resolvió conectividad y autenticación; por eso no programa reintentos
 * propios: el siguiente ciclo vuelve a intentarlo si algo falla.
 */
export async function sincronizarPendientesFaciales() {
  // Inicializa la base y evita una petición vacía. En Android el planificador
  // puede llegar aquí antes de que se abra la pestaña facial.
  if ((await contarPendientesFaciales()) === 0) return { enviados: 0, pendientes: 0 };

  let enviados = 0;
  // Lotes acotados: mantienen el payload pequeño y el UPDATE de marcado por
  // debajo del límite de parámetros de SQLite en Android.
  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta += 1) {
    const { intentos, ingresos } = await obtenerPendientesFaciales();
    const lote = construirLote(intentos.slice(0, TAMANO_LOTE), ingresos.slice(0, TAMANO_LOTE));
    if (!lote.intentos.length && !lote.ingresos.length) break;

    const respuesta = await sincronizarLoteFacial(lote);
    const procesados = [...(respuesta?.intentos || []), ...(respuesta?.ingresos || [])]
      .filter((item) => ESTADOS_MARCADOS.has(item.estado))
      .map((item) => item.clientUuid);
    // Si el servidor no confirmó ningún elemento, se reintenta en el próximo
    // ciclo en lugar de repetir la misma petición en bucle.
    if (!procesados.length) break;

    await marcarFacialesSincronizados(procesados);
    enviados += procesados.length;
  }

  return {
    enviados,
    pendientes: await contarPendientesFaciales(),
  };
}
