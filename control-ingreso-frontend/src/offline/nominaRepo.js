import { db } from './db.js';
import { normalizarCi, normalizarCodigo, normalizarQr } from './normalize.js';
import { ESTADO_SYNC, ERROR_ASISTENCIA } from './constantes.js';
import { fotoRepo } from './fotoRepo.js';

export const CAMPOS_SERVIDOR = {
  codigoSis: ['codigoSis', 'codSisEstudiante'],
  ci: ['ci', 'ciEstudiante'],
  nombre: ['nombre', 'nombres', 'nombreEstudiante'],
  apellidoPaterno: ['apellidoPaterno'],
  apellidos: ['apellidos', 'apellidoEstudiante'],
  carrera: ['carrera'],
  qr: ['qr', 'qrToken', 'tokenQr'],
  qrDesde: ['qrDesde', 'validoDesde', 'fechaInicioQr'],
  qrHasta: ['qrHasta', 'validoHasta', 'fechaFinQr'],
  qrEstado: ['qrEstado', 'estadoQr'],
  aulaAsignada: ['aulaAsignada', 'aula'],
  normaParticular: ['normaParticular', 'normas', 'observacionParticular']
};

function extraerPrimerValor(objeto, listaClaves) {
  for (const c of listaClaves) {
    if (objeto[c] !== undefined && objeto[c] !== null) {
      return objeto[c];
    }
  }
  return null;
}

/**
 * Parsea una fecha ISO a epoch en milisegundos.
 * Si viene sin zona horaria, asume America/La_Paz (-04:00).
 * Si el resultado no es un número finito válido, devuelve null.
 */
export function parsearIsoEpoch(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  const str = String(valor).trim();
  if (!str) return null;

  let time;
  if (!str.endsWith('Z') && !/[+-]\d{2}(?::?\d{2})?$/.test(str)) {
    time = new Date(`${str}-04:00`).getTime();
  } else {
    time = new Date(str).getTime();
  }
  return Number.isFinite(time) ? time : null;
}

export const nominaRepo = {
  /**
   * Retorna el número de estudiantes en la nómina local para un examen.
   */
  async contar(examenId) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) return 0;
    return await db.nominas.where('examenId').equals(exId).count();
  },

  /**
   * Devuelve métricas de control para la UI: habilitados, ingresaron, pendientes, inhabilitados.
   */
  async contador(examenId) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      return { habilitados: 0, ingresaron: 0, pendientes: 0, inhabilitados: 0 };
    }

    const registros = await db.nominas.where('examenId').equals(exId).toArray();
    let habilitados = 0;
    let ingresaron = 0;
    let pendientes = 0;
    let inhabilitados = 0;

    for (const r of registros) {
      if (r.habilitado) {
        habilitados++;
        if (r.marcadoLocal === 1) {
          ingresaron++;
        } else {
          pendientes++;
        }
      } else {
        inhabilitados++;
      }
    }

    return { habilitados, ingresaron, pendientes, inhabilitados };
  },

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
   * Búsqueda por token QR usando el índice compuesto [examenId+qr].
   */
  async buscarPorQr(examenId, qr) {
    const tokenNorm = normalizarQr(qr);
    if (!examenId || !tokenNorm) return null;
    return await db.nominas
      .where('[examenId+qr]')
      .equals([Number(examenId), tokenNorm])
      .first();
  },

  /**
   * Guarda o actualiza un lote de nómina del servidor preservando marcas locales.
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

    let sinSis = 0;
    const pares = [];

    for (const remoto of estudiantesServidor) {
      const sisBruto = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.codigoSis);
      const sis = normalizarCodigo(sisBruto);
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
      const claves = pares.map(p => p.clave);
      const existentes = await db.nominas.bulkGet(claves);
      const mapaExistentes = new Map();
      existentes.forEach(e => {
        if (e) mapaExistentes.set(e.codigoSis, e);
      });

      let sinEstado = 0;

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

        const nombresDirecto = extraerPrimerValor(remoto, ['nombres', 'nombreEstudiante']);
        const apellidosDirecto = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.apellidos) || '';
        const nombreCompletoDirecto = extraerPrimerValor(remoto, ['nombre']);
        const nombreCompleto = nombresDirecto
          ? [nombresDirecto, apellidosDirecto].filter(Boolean).join(' ')
          : (nombreCompletoDirecto || apellidosDirecto || '');

        let apePaterno = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.apellidoPaterno);
        if (!apePaterno && apellidosDirecto) {
          apePaterno = apellidosDirecto.trim().split(/\s+/)[0];
        }

        const ciBruto = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.ci);
        const qrBruto = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.qr);
        const qrDesdeBruto = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.qrDesde);
        const qrHastaBruto = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.qrHasta);
        const qrEstadoBruto = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.qrEstado);
        const aulaRaw = extraerPrimerValor(remoto, CAMPOS_SERVIDOR.aulaAsignada);
        const aulaAsignada = aulaRaw !== null && aulaRaw !== undefined ? String(aulaRaw).trim() : null;

        const motivoBloqueoFinal = sinEstadoVerificable
          ? 'Estado de habilitación no verificado'
          : (remoto.motivoBloqueo || remoto.observacion || remoto.observacionHabilitacion || remoto.nombreMotivo || null);

        // El estado de expulsión lo manda el servidor (la nómina se refresca al
        // recuperar la conexión). Si la expulsión se hizo en este equipo y
        // todavía no se sincronizó, el motor offline lo cubre con la cola
        // local de expulsiones.
        const expulsado = Boolean(remoto.expulsado);

        return {
          examenId: exId,
          codigoSis: sis,
          ci: normalizarCi(ciBruto),
          qr: qrBruto ? normalizarQr(qrBruto) : undefined,
          qrDesde: parsearIsoEpoch(qrDesdeBruto),
          qrHasta: parsearIsoEpoch(qrHastaBruto),
          qrEstado: qrEstadoBruto ? String(qrEstadoBruto).trim().toUpperCase() : 'ACTIVO',
          aulaAsignada,
          normaParticular: extraerPrimerValor(remoto, CAMPOS_SERVIDOR.normaParticular) || null,
          apellidoPaterno: apePaterno || '',
          nombre: nombreCompleto,
          carrera: remoto.carrera || '',
          // Ausente significa copia previa al contrato; no se inventa ACTIVO.
          estadoEnrolamientoFacial: remoto.estadoEnrolamientoFacial ?? previo?.estadoEnrolamientoFacial ?? 'DESCONOCIDO',
          habilitado,
          motivoBloqueo: motivoBloqueoFinal,
          expulsado,
          marcadoLocal,
          marcadoEn,
          marcadoPor
        };
      });

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
   * Elimina la nómina de un examen y limpia fotos huérfanas asociadas sin abortar ante fallo de fotos.
   */
  async limpiarNominaExamen(examenId) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) {
      const error = new Error('El examenId debe ser un número entero positivo.');
      error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
      throw error;
    }

    const borrados = await db.transaction('rw', [db.nominas, db.asistencias_pendientes], async () => {
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

      return await db.nominas.where('examenId').equals(exId).delete();
    });

    try {
      await fotoRepo.limpiarFotosSinNomina();
    } catch (errFoto) {
      console.warn('[nominaRepo.limpiarNominaExamen] Error al limpiar fotos huérfanas:', errFoto);
    }

    return borrados;
  }
};
