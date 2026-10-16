import Dexie from 'dexie';
import { db } from './db.js';
import { normalizarCodigo } from './normalize.js';
import { obtenerDeviceId } from './deviceId.js';
import { generarUuid } from './uuid.js';
import { ERROR_ASISTENCIA, ESTADO_SYNC } from './constantes.js';

export const asistenciaRepo = {
  /**
   * Registra el ingreso en UNA sola transacción atómica.
   * Valida estrictamente examenId (entero > 0) y campos obligatorios.
   * Guarda verificacionVisual (boolean) y qrToken (string | null).
   */
  async registrarMarca({
    examenId,
    asignaturaId = null,
    ambienteId = null,
    codigoSis,
    metodo,
    operadorId,
    rol,
    clockOffsetMs = 0,
    verificacionVisual = false,
    qrToken = null
  }) {
    const exId = Number(examenId);
    const sis = normalizarCodigo(codigoSis);

    if (!Number.isInteger(exId) || exId <= 0 || !sis || !operadorId || !rol || !metodo) {
      const error = new Error('Parámetros inválidos o incompletos: examenId (entero positivo), codigoSis, operadorId, rol y metodo son requeridos.');
      error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
      throw error;
    }

    const deviceId = await obtenerDeviceId();
    const timestampLocal = new Date().toISOString();
    const clientUuid = generarUuid();

    return await db.transaction('rw', [db.nominas, db.asistencias_pendientes], async () => {
      // 1. Obtener de nómina
      const estudiante = await db.nominas.get([exId, sis]);
      if (!estudiante) {
        const error = new Error(`El estudiante con código SIS ${sis} no pertenece a la nómina del examen.`);
        error.codigo = ERROR_ASISTENCIA.NO_EN_NOMINA;
        throw error;
      }

      // 2. Verificar habilitación
      if (!estudiante.habilitado) {
        const error = new Error(`El estudiante está inhabilitado: ${estudiante.motivoBloqueo || 'Sin derecho a examen'}`);
        error.codigo = ERROR_ASISTENCIA.NO_HABILITADO;
        error.motivo = estudiante.motivoBloqueo;
        throw error;
      }

      // 3. Verificar duplicado local
      if (estudiante.marcadoLocal === 1) {
        const error = new Error(`El estudiante ya registró su ingreso a las ${estudiante.marcadoEn} (operador: ${estudiante.marcadoPor || 'Desconocido'}).`);
        error.codigo = ERROR_ASISTENCIA.YA_MARCADO;
        error.marcadoEn = estudiante.marcadoEn;
        error.marcadoPor = estudiante.marcadoPor;
        throw error;
      }

      // 4. Actualizar nómina local
      await db.nominas.update([exId, sis], {
        marcadoLocal: 1,
        marcadoEn: timestampLocal,
        marcadoPor: operadorId
      });

      // 5. Encolar asistencia pendiente con verificacionVisual y qrToken
      const nuevaAsistencia = {
        clientUuid,
        examenId: exId,
      asignaturaId: asignaturaId ? Number(asignaturaId) : null,
      ambienteId: ambienteId ? Number(ambienteId) : null,
        codigoSis: sis,
        metodo,
        operadorId,
        rol,
        deviceId,
        clockOffsetMs,
        timestampLocal,
        verificacionVisual: Boolean(verificacionVisual),
        qrToken: qrToken ? String(qrToken).trim() : null,
        syncStatus: ESTADO_SYNC.PENDIENTE,
        intentos: 0,
        nextRetryAt: 0,
        ultimoError: null,
        sincronizadoEn: null
      };

      await db.asistencias_pendientes.add(nuevaAsistencia);

      return {
        clientUuid,
        codigoSis: sis,
        nombre: estudiante.nombre,
        timestampLocal,
        estado: 'PERMITIDO'
      };
    });
  },

  /**
   * Obtiene marcas pendientes respetando Dexie.minKey y backoff.
   */
  async pendientes(limite = 50) {
    const ahoraMs = Date.now();
    return await db.asistencias_pendientes
      .where('[syncStatus+nextRetryAt]')
      .between([ESTADO_SYNC.PENDIENTE, Dexie.minKey], [ESTADO_SYNC.PENDIENTE, ahoraMs])
      .limit(limite)
      .toArray();
  },

  /**
   * Conteo unificado de pendientes (pendiente + syncing), con o sin filtro de examenId.
   */
  async contarPendientes(examenId = null) {
    let coleccion = db.asistencias_pendientes
      .where('syncStatus')
      .anyOf(ESTADO_SYNC.PENDIENTE, ESTADO_SYNC.SYNCING);

    if (examenId !== null && examenId !== undefined) {
      coleccion = coleccion.and(r => r.examenId === Number(examenId));
    }

    return await coleccion.count();
  },

  /**
   * Actualiza el estado de sincronización.
   */
  async marcarEstado(clientUuid, syncStatus, metadata = {}) {
    const actualizacion = {
      syncStatus,
      ...metadata
    };

    if (syncStatus === ESTADO_SYNC.SINCRONIZADO || syncStatus === ESTADO_SYNC.DUPLICADO) {
      actualizacion.sincronizadoEn = Date.now();
    }

    return await db.asistencias_pendientes.update(clientUuid, actualizacion);
  },

  /**
   * Purga registros sincronizados o duplicados con más de 72 horas.
   */
  async purgarSincronizados(maxHoras = 72) {
    const ahoraMs = Date.now();
    const ventanaMs = maxHoras * 60 * 60 * 1000;
    const corteIso = new Date(ahoraMs - ventanaMs).toISOString();

    return await db.transaction('rw', db.asistencias_pendientes, async () => {
      const aEliminar = await db.asistencias_pendientes
        .where('syncStatus')
        .anyOf(ESTADO_SYNC.SINCRONIZADO, ESTADO_SYNC.DUPLICADO)
        .and(item => {
          if (item.sincronizadoEn) {
            return (ahoraMs - item.sincronizadoEn) > ventanaMs;
          }
          return item.timestampLocal < corteIso;
        })
        .primaryKeys();

      if (aEliminar.length > 0) {
        await db.asistencias_pendientes.bulkDelete(aEliminar);
      }
      return aEliminar.length;
    });
  },

  /**
   * Al arrancar la app, revierte a 'pendiente' los que quedaron en 'syncing'.
   */
  async revertirSyncingHuerfanos() {
    return await db.asistencias_pendientes
      .where('syncStatus')
      .equals(ESTADO_SYNC.SYNCING)
      .modify({
        syncStatus: ESTADO_SYNC.PENDIENTE,
        nextRetryAt: 0
      });
  }
};
