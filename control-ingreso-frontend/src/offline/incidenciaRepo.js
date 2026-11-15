import Dexie from "dexie";
import { db } from "./db.js";
import { ESTADO_SYNC } from "./constantes.js";
import { generarUuid } from "./uuid.js";

export const incidenciaRepo = {
  /**
   * Encola una incidencia para enviarla cuando vuelva la conexión.
   *
   * @param {object} datos
   * @param {string|null} [datos.claveSolicitud] clave de solicitud ya usada en el intento
   *        por internet. Si se repite el mismo registro tras un 5xx, se reutiliza esta clave:
   *        el backend deduplica por 'clavesolicitud' y responde DUPLICADO, así no se crea
   *        una segunda expulsión (BUG-001).
   */
  async encolar({
    idAmbiente,
    tipo,
    severidad,
    accion,
    detalleTipoOtro,
    detalleAccionOtro,
    puntajeReducir,
    descripcion,
    codSisEstudiante,
    retirarEstudiante,
    registradoEn,
    creadoPor = null,
    claveSolicitud = null,
  }) {
    const clientUuid = claveSolicitud || generarUuid();

    // Si esa clave ya está en la cola no se duplica: el envío pendiente ya la lleva.
    const yaEnCola = await db.incidencias_pendientes.get(clientUuid);
    if (yaEnCola) {
      // Si el servidor la rechazó (error), se reactiva: el usuario volvió a intentar con
      // la misma clave y el registro no debe perderse. Si ya está sincronizada, no se
      // toca: el servidor ya la tiene y un reenvío solo devolvería DUPLICADO.
      if (yaEnCola.syncStatus === ESTADO_SYNC.ERROR) {
        await db.incidencias_pendientes.update(clientUuid, {
          syncStatus: ESTADO_SYNC.PENDIENTE,
          intentos: 0,
          nextRetryAt: 0,
          ultimoError: null,
        });
      }
      return clientUuid;
    }

    await db.incidencias_pendientes.add({
      clientUuid,
      idAmbiente: Number(idAmbiente),
      tipo,
      severidad,
      accion,
      detalleTipoOtro,
      detalleAccionOtro,
      puntajeReducir: puntajeReducir != null ? Number(puntajeReducir) : null,
      descripcion,
      codSisEstudiante: codSisEstudiante ? Number(codSisEstudiante) : null,
      retirarEstudiante: Boolean(retirarEstudiante),
      registradoEn: registradoEn || new Date().toISOString(),
      creadoPor,
      syncStatus: ESTADO_SYNC.PENDIENTE,
      intentos: 0,
      nextRetryAt: 0,
      ultimoError: null,
    });
    return clientUuid;
  },

  async encolarExpulsion({
    incidenciaClientUuid,
    codSisEstudiante,
    examenId,
    idAmbiente = null,
    motivo = null,
    registradoEn = null,
    reportadoPor = null,
    nombreEstudiante = null,
  }) {
    const clientUuid = generarUuid();
    const codigoSis = String(codSisEstudiante).trim();
    const idExamen = Number(examenId);
    await db.transaction(
      "rw",
      [db.expulsiones_pendientes, db.nominas],
      async () => {
        // Se guarda el estado previo del estudiante en la nómina: al revocar la
        // expulsión se restaura exactamente ese estado y no se rehabilita a un
        // estudiante que estaba inhabilitado por otro motivo.
        let estadoPrevio = null;
        if (Number.isInteger(idExamen) && idExamen > 0 && codigoSis) {
          const registro = await db.nominas.get([idExamen, codigoSis]);
          if (registro) {
            estadoPrevio = {
              habilitado: Boolean(registro.habilitado),
              motivoBloqueo: registro.motivoBloqueo ?? null,
            };
          }
        }

        await db.expulsiones_pendientes.add({
          clientUuid,
          incidenciaClientUuid,
          codSisEstudiante: Number(codSisEstudiante),
          examenId:
            Number.isInteger(idExamen) && idExamen > 0 ? idExamen : null,
          idAmbiente: idAmbiente != null ? Number(idAmbiente) : null,
          motivo,
          nombreEstudiante,
          registradoEn: registradoEn || new Date().toISOString(),
          reportadoPor,
          estadoPrevioNomina: estadoPrevio,
          syncStatus: ESTADO_SYNC.PENDIENTE,
          intentos: 0,
          nextRetryAt: 0,
          ultimoError: null,
        });

        if (Number.isInteger(idExamen) && idExamen > 0 && codigoSis) {
          await db.nominas.update([idExamen, codigoSis], {
            habilitado: false,
            motivoBloqueo: "EXPULSADO",
            // El estudiante queda marcado como expulsado en la nómina local:
            // el control de ingreso debe avisar que ya ingresó y fue retirado.
            expulsado: true,
          });
        }
      },
    );
    return clientUuid;
  },

  /**
   * Restaura el estado de habilitación de un estudiante al revocar una
   * expulsión local. Solo toca la fila del examen afectado y devuelve el estado
   * previo que tenía (no rehabilita a un estudiante que estaba inhabilitado
   * por otro motivo).
   *
   * También quita la marca de "expulsado": si se revoca la expulsión, el
   * estudiante vuelve a estar presente y el control de ingreso no debe
   * seguir avisando que fue retirado.
   */
  async restaurarNominaPorExpulsion(expulsion) {
    if (!expulsion) return false;
    const idExamen = Number(expulsion.examenId);
    const codigoSis = String(expulsion.codSisEstudiante ?? "").trim();
    if (!Number.isInteger(idExamen) || idExamen <= 0 || !codigoSis)
      return false;

    const previo = expulsion.estadoPrevioNomina;
    const registro = await db.nominas.get([idExamen, codigoSis]);
    if (!registro) return false;

    await db.nominas.update([idExamen, codigoSis], {
      // Si el registro se encoló antes de que existiera el estado previo, se
      // rehabilita al estudiante (dejarlo bloqueado tras revocar sería peor).
      habilitado: previo ? Boolean(previo.habilitado) : true,
      motivoBloqueo: previo ? (previo.motivoBloqueo ?? null) : null,
      // La expulsión ya no está en vigor: el estudiante puede reingresar.
      expulsado: false,
    });

    // La fila de la cola local deja de contar como expulsión vigente: si no,
    // el control offline seguiría avisando que fue expulsado.
    await db.expulsiones_pendientes.update(expulsion.clientUuid, {
      revocada: true,
    });

    return true;
  },

  async pendientes(limite = 50) {
    const ahora = Date.now();
    return await db.incidencias_pendientes
      .where("[syncStatus+nextRetryAt]")
      .between(
        [ESTADO_SYNC.PENDIENTE, Dexie.minKey],
        [ESTADO_SYNC.PENDIENTE, ahora],
      )
      .limit(limite)
      .toArray();
  },

  async contarPendientes() {
    return await db.incidencias_pendientes
      .where("syncStatus")
      .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING)
      .count();
  },

  async marcarEstado(clientUuid, nuevoEstado, extras = {}) {
    return await db.incidencias_pendientes.update(clientUuid, {
      syncStatus: nuevoEstado,
      ...extras,
    });
  },

  async expulsionesPendientesDe(incidenciaClientUuid) {
    return await db.expulsiones_pendientes
      .where("incidenciaClientUuid")
      .equals(incidenciaClientUuid)
      .toArray();
  },

  async marcarEstadoExpulsion(clientUuid, nuevoEstado, extras = {}) {
    return await db.expulsiones_pendientes.update(clientUuid, {
      syncStatus: nuevoEstado,
      ...extras,
    });
  },

  async revertirSyncingHuerfanos() {
    await db.transaction(
      "rw",
      [db.incidencias_pendientes, db.expulsiones_pendientes],
      async () => {
        await db.incidencias_pendientes
          .where("syncStatus")
          .equals(ESTADO_SYNC.SYNCING)
          .modify({
            syncStatus: ESTADO_SYNC.PENDIENTE,
            nextRetryAt: 0,
          });
        await db.expulsiones_pendientes
          .where("syncStatus")
          .equals(ESTADO_SYNC.SYNCING)
          .modify({
            syncStatus: ESTADO_SYNC.PENDIENTE,
            nextRetryAt: 0,
          });
      },
    );
  },
};
