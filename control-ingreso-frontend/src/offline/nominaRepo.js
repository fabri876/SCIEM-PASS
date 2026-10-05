import { db } from './db.js';
import { normalizarCi, normalizarCodigo, normalizarQr } from './normalize.js';
import { ESTADO_SYNC, ERROR_ASISTENCIA } from './constantes.js';

export const nominaRepo = {
  /**
   * Búsqueda por Código SIS usando el índice compuesto primario.
   */
  async buscarPorSis(examenId, codigoSis) {
    const sis = normalizarCodigo(codigoSis);
    if (!examenId || !sis) return null;
    return await db.nominas.get([Number(examenId), sis]);
  },

  /**
   * Búsqueda por CI usando el índice compuesto [examenId+ci].
   */
  async buscarPorCi(examenId, ci) {
    const ciNorm = normalizarCi(ci);
    if (!examenId || !ciNorm) return null;
    return await db.nominas
      .where('[examenId+ci]')
      .equals([Number(examenId), ciNorm])
      .first();
  },

  /**
   * Búsqueda por QR usando el índice compuesto [examenId+qr].
   */
  async buscarPorQr(examenId, qr) {
    const qrNorm = normalizarQr(qr);
    if (!examenId || !qrNorm) return null;
    return await db.nominas
      .where('[examenId+qr]')
      .equals([Number(examenId), qrNorm])
      .first();
  },

  /**
   * Guarda o actualiza un lote de nómina del servidor preservando marcas locales.
   * - Omite y contabiliza registros sin código SIS.
   * - Evalúa rigurosamente el estado de habilitación (HABILITADO / INHABILITADO); cualquier otro valor
   *   se cuenta como 'sin estado' y se fija motivoBloqueo = 'Estado de habilitación no verificado'.
   * - Refleja marca remota si viene marcadoEn aunque marcadoPor sea nulo.
   * - Retorna { guardados, sinEstado, sinSis }.
   */
  async guardarLote(examenId, estudiantesServidor) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      const error = new Error('El examenId debe ser un número entero positivo.');
      error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
      throw error;
    }

    if (!Array.isArray(estudiantesServidor) || estudiantesServidor.length === 0) {
      return { guardados: 0, sinEstado: 0, sinSis: 0 };
    }

    // 1. Omitir y contar registros sin código SIS
    let sinSis = 0;
    const pares = [];

    for (const remoto of estudiantesServidor) {
      const sis = normalizarCodigo(remoto.codigoSis || remoto.codSisEstudiante);
      if (!sis) {
        sinSis++;
        continue;
      }
      pares.push({ sis, clave: [exId, sis], remoto });
    }

    if (pares.length === 0) {
      return { guardados: 0, sinEstado: 0, sinSis };
    }

    return await db.transaction('rw', db.nominas, async () => {
      // 2. Lectura selectiva con bulkGet
      const claves = pares.map(p => p.clave);
      const existentes = await db.nominas.bulkGet(claves);
      const mapaExistentes = new Map();
      existentes.forEach(e => {
        if (e) mapaExistentes.set(e.codigoSis, e);
      });

      let sinEstado = 0;

      // 3. Mapeo y validación de habilitación
      const aGuardar = pares.map(({ sis, remoto }) => {
        const previo = mapaExistentes.get(sis);

        let habilitado = false;
        let sinEstadoVerificable = false;

        if (typeof remoto.estadoHabilitacion === 'boolean') {
          habilitado = remoto.estadoHabilitacion;
        } else if (typeof remoto.habilitado === 'boolean') {
          habilitado = remoto.habilitado;
        } else if (typeof remoto.estado === 'string') {
          const estadoNormalizado = remoto.estado.trim().toUpperCase();
          if (estadoNormalizado === 'HABILITADO') {
            habilitado = true;
          } else if (estadoNormalizado === 'INHABILITADO') {
            habilitado = false;
          } else {
            sinEstadoVerificable = true;
            habilitado = false;
          }
        } else {
          sinEstadoVerificable = true;
          habilitado = false;
        }

        if (sinEstadoVerificable) {
          sinEstado++;
        }

        // Marcas: prioridad local > prioridad remota (marcadoEn suficiente)
        let marcadoLocal = 0;
        let marcadoEn = null;
        let marcadoPor = null;

        if (previo && previo.marcadoLocal === 1) {
          marcadoLocal = 1;
          marcadoEn = previo.marcadoEn;
          marcadoPor = previo.marcadoPor;
        } else if (remoto.marcadoEn) {
          marcadoLocal = 1;
          marcadoEn = remoto.marcadoEn;
          marcadoPor = remoto.marcadoPor || null;
        }

        const nombreCompleto = remoto.nombre ||
          [remoto.nombreEstudiante, remoto.apellidoEstudiante].filter(Boolean).join(' ');

        const motivoBloqueoFinal = sinEstadoVerificable
          ? 'Estado de habilitación no verificado'
          : (remoto.motivoBloqueo || remoto.observacion || remoto.observacionHabilitacion || remoto.nombreMotivo || null);

        return {
          examenId: exId,
          codigoSis: sis,
          ci: normalizarCi(remoto.ci || remoto.ciEstudiante),
          qr: normalizarQr(remoto.qr || sis),
          nombre: nombreCompleto,
          carrera: remoto.carrera || '',
          habilitado,
          motivoBloqueo: motivoBloqueoFinal,
          marcadoLocal,
          marcadoEn,
          marcadoPor
        };
      });

      // Si más del 50% carece de estado verificable, abortar lote
      if (sinEstado > pares.length / 2) {
        const error = new Error(`El lote recibido contiene ${sinEstado} de ${pares.length} estudiantes sin estado de habilitación verificable. Operación cancelada.`);
        error.codigo = ERROR_ASISTENCIA.LOTE_ESTADO_DESCONOCIDO;
        error.sinEstado = sinEstado;
        error.total = pares.length;
        throw error;
      }

      if (sinEstado > 0 || sinSis > 0) {
        console.warn(`[nominaRepo.guardarLote] Examen ${exId}: ${sinEstado} sin estado verificable, ${sinSis} omitidos sin código SIS.`);
      }

      await db.nominas.bulkPut(aGuardar);
      return { guardados: aGuardar.length, sinEstado, sinSis };
    });
  },

  /**
   * Elimina la nómina de un examen.
   * Ejecuta el conteo de pendientes y el borrado dentro de UNA sola transacción 'rw'.
   */
  async limpiarNominaExamen(examenId) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      const error = new Error('El examenId debe ser un número entero positivo.');
      error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
      throw error;
    }

    return await db.transaction('rw', [db.nominas, db.asistencias_pendientes], async () => {
      const pendientes = await db.asistencias_pendientes
        .where('examenId')
        .equals(exId)
        .and(r => r.syncStatus === ESTADO_SYNC.PENDIENTE || r.syncStatus === ESTADO_SYNC.SYNCING)
        .count();

      if (pendientes > 0) {
        const error = new Error(`No se puede eliminar la nómina del examen ${exId}: existen ${pendientes} marcas pendientes de sincronización.`);
        error.codigo = ERROR_ASISTENCIA.TIENE_MARCAS_PENDIENTES;
        error.pendientes = pendientes;
        throw error;
      }

      const borrados = await db.nominas.where('examenId').equals(exId).delete();
      return borrados;
    });
  }
};
