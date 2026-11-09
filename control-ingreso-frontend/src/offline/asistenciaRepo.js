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
    qrToken = null,
    scoreFacial = null,
    livenessScore = null,
    modelVersion = null,
    deviceId: deviceIdExplicito = null
  }) {
    const exId = Number(examenId);
    const sis = normalizarCodigo(codigoSis);
    const ambId = Number(ambienteId);

    // Regla de seguridad: el ambiente es obligatorio y debe pertenecer al examen descargado.
    // Sin un ambienteId válido no se puede registrar el ingreso offline.
    if (!Number.isInteger(exId) || exId <= 0 || !sis || !operadorId || !rol || !metodo || !Number.isInteger(ambId) || ambId <= 0) {
      const error = new Error('Parámetros inválidos o incompletos: examenId, codigoSis, operadorId, rol, metodo y ambienteId (entero positivo) son requeridos.');
      error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
      throw error;
    }

    const deviceId = deviceIdExplicito || await obtenerDeviceId();
    const timestampLocal = new Date().toISOString();
    const clientUuid = generarUuid();

    console.log('[asistenciaRepo] Iniciando transacción para registrarMarca:', { examenId: exId, sis, operadorId, rol, metodo });
    return await db.transaction('rw', [db.nominas, db.asistencias_pendientes], async () => {
      // 1. Obtener de nómina
      const estudiante = await db.nominas.get([exId, sis]);
      console.log('[asistenciaRepo] Estudiante de nominas:', estudiante);
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
        const error = new Error(`El estudiante ya registró su ingreso a las ${estudiante.marcadoEn} (ayudante: ${estudiante.marcadoPor || 'Desconocido'}).`);
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
      console.log('[asistenciaRepo] Nomina actualizada para', sis);

      // 5. Encolar asistencia pendiente con verificacionVisual y qrToken
      const nuevaAsistencia = {
        clientUuid,
        examenId: exId,
        asignaturaId: asignaturaId ? Number(asignaturaId) : null,
        ambienteId: ambId,
        codigoSis: sis,
        metodo,
        operadorId,
        rol,
        deviceId,
        clockOffsetMs,
        timestampLocal,
        verificacionVisual: Boolean(verificacionVisual),
        qrToken: qrToken ? String(qrToken).trim() : null,
        // Scores del facial aprobado. Nulos cuando el ingreso se registra sin facial.
        scoreFacial: scoreFacial ?? null,
        livenessScore: livenessScore ?? null,
        modelVersion: modelVersion ?? null,
        syncStatus: ESTADO_SYNC.PENDIENTE,
        intentos: 0,
        nextRetryAt: 0,
        ultimoError: null,
        sincronizadoEn: null
      };
      console.log('[asistenciaRepo] Nueva asistencia a guardar:', nuevaAsistencia);

      await db.asistencias_pendientes.add(nuevaAsistencia);
      console.log('[asistenciaRepo] Asistencia guardada en asistencias_pendientes');

      const pendientesDespues = await db.asistencias_pendientes.toArray();
      console.log('[asistenciaRepo] Pendientes después de guardar:', pendientesDespues.length, 'items');

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
  },

  /**
   * Vuelve a 'pendiente' los ítems en estado ERROR para que se reintenten en el
   * próximo ciclo de sincronización. Útil tras corregir un error del backend.
   */
  async recuperarErrores() {
    return await db.asistencias_pendientes
      .where('syncStatus')
      .equals(ESTADO_SYNC.ERROR)
      .modify({
        syncStatus: ESTADO_SYNC.PENDIENTE,
        nextRetryAt: 0,
        ultimoError: null
      });
  },

  /**
   * Cuenta cuántas marcas hay en cada estado de sincronización.
   * Devuelve: { pendiente, syncing, sincronizado, error, duplicado }
   */
  async contarPorEstado() {
    const todos = await db.asistencias_pendientes.toArray();
    const conteo = {
      pendiente: 0,
      syncing: 0,
      sincronizado: 0,
      error: 0,
      duplicado: 0
    };
    for (const t of todos) {
      const s = t.syncStatus || 'pendiente';
      if (conteo[s] !== undefined) {
        conteo[s]++;
      }
    }
    return conteo;
  }
};
