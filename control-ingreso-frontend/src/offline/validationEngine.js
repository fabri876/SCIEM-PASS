import { db } from './db.js';
import { nominaRepo } from './nominaRepo.js';
import { asistenciaRepo } from './asistenciaRepo.js';
import { estaExpulsadoLocal } from './incidenciaOffline.js';
import { normalizarCi, extraerQr } from './normalize.js';
import { RESULTADO_VALIDACION, ERROR_ASISTENCIA } from './constantes.js';

function mapearEstudiante(e) {
  if (!e) return null;
  return {
    nombre: e.nombre || '',
    ci: e.ci || '',
    codigoSis: e.codigoSis || '',
    carrera: e.carrera || '',
    apellidoPaterno: e.apellidoPaterno || '',
    aulaAsignada: e.aulaAsignada || null,
    normaParticular: e.normaParticular || null
  };
}

/**
 * Comprueba si la inicial del apellido paterno cae fuera del rango [desde, hasta].
 */
function evaluarRangoApellidos(apellidoPaterno, rango) {
  if (!rango || !rango.desde || !rango.hasta || !apellidoPaterno) {
    return false;
  }
  const limpiar = (txt) =>
    String(txt)
      .trim()
      .charAt(0)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

  const inicial = limpiar(apellidoPaterno);
  const desde = limpiar(rango.desde);
  const hasta = limpiar(rango.hasta);

  if (!inicial) return false;
  return inicial.localeCompare(desde, 'es') < 0 || inicial.localeCompare(hasta, 'es') > 0;
}

/**
 * Búsqueda inteligente por CI según especificación de complementos y prefijos.
 */
async function resolverPorCi(examenId, lectura) {
  const ciNorm = normalizarCi(lectura);
  if (!ciNorm) {
    return { estudiante: null, coincidenciaParcial: false, ambiguo: false, motivo: null };
  }

  // 1. Búsqueda exacta
  const exacto = await db.nominas
    .where('[examenId+ci]')
    .equals([examenId, ciNorm])
    .first();

  if (exacto) {
    return { estudiante: exacto, coincidenciaParcial: false, ambiguo: false, motivo: null };
  }

  // 2. Prefijo >= 6 caracteres con filtro estricto de sufijo de complemento
  if (ciNorm.length >= 6) {
    const candidatosAceptados = await db.nominas
      .where('[examenId+ci]')
      .between([examenId, ciNorm], [examenId, ciNorm + '\uffff'], true, true)
      .and((c) => {
        if (!c.ci || !c.ci.startsWith(ciNorm)) return false;
        const sufijo = c.ci.slice(ciNorm.length);
        return /^\d?[A-Z]$/.test(sufijo);
      })
      .limit(2)
      .toArray();

    if (candidatosAceptados.length >= 2) {
      return {
        estudiante: null,
        coincidenciaParcial: false,
        ambiguo: true,
        motivo: 'Varios estudiantes coinciden con ese CI. Ingrese el complemento o use el código SIS.'
      };
    }

    if (candidatosAceptados.length === 1) {
      return {
        estudiante: candidatosAceptados[0],
        coincidenciaParcial: true,
        ambiguo: false,
        motivo: null
      };
    }
  }

  // 3. Complemento tipeado
  const lecturaTrim = String(lectura).trim();
  const tieneSeparador = /[-\s]/.test(lecturaTrim);

  if (tieneSeparador) {
    const ultimoIndice = Math.max(lecturaTrim.lastIndexOf('-'), lecturaTrim.lastIndexOf(' '));
    const basePrevia = lecturaTrim.slice(0, ultimoIndice).replace(/[.\s]/g, '');

    if (/^\d{5,}$/.test(basePrevia)) {
      const candidato = await db.nominas
        .where('[examenId+ci]')
        .equals([examenId, basePrevia])
        .first();

      if (candidato && /^\d+$/.test(candidato.ci)) {
        return {
          estudiante: candidato,
          coincidenciaParcial: true,
          ambiguo: false,
          motivo: null
        };
      }
    }
  } else if (/[A-Z]$/.test(ciNorm)) {
    const base1 = ciNorm.slice(0, -1);
    const base2 = /\d[A-Z]$/.test(ciNorm) ? ciNorm.slice(0, -2) : null;

    const basesAProbar = [];
    if (/^\d{5,}$/.test(base1)) basesAProbar.push(base1);
    if (base2 && /^\d{5,}$/.test(base2) && base2 !== base1) basesAProbar.push(base2);

    const candidatosEncontrados = [];
    for (const b of basesAProbar) {
      const cand = await db.nominas
        .where('[examenId+ci]')
        .equals([examenId, b])
        .first();

      if (cand && /^\d+$/.test(cand.ci)) {
        candidatosEncontrados.push(cand);
      }
    }

    if (candidatosEncontrados.length === 1) {
      return {
        estudiante: candidatosEncontrados[0],
        coincidenciaParcial: true,
        ambiguo: false,
        motivo: null
      };
    }
  }

  return { estudiante: null, coincidenciaParcial: false, ambiguo: false, motivo: null };
}

/**
 * Registra formalmente el ingreso tras una validación previa exitosa.
 */
export async function registrarIngreso({
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
  deviceId = null,
  modoRapido = false,
  motivoModoRapido = null
}) {
  const inicio = performance.now();
  const exId = Number(examenId);

  const calcularTiempo = () => Math.round((performance.now() - inicio) * 100) / 100;

  try {
    const registro = await asistenciaRepo.registrarMarca({
      examenId: exId,
      asignaturaId,
      ambienteId,
      codigoSis,
      metodo: metodo || 'CODIGO',
      operadorId,
      rol,
      clockOffsetMs,
      verificacionVisual,
      qrToken,
      scoreFacial,
      livenessScore,
      modelVersion,
      deviceId,
      modoRapido,
      motivoModoRapido
    });

    const est = await db.nominas.get([exId, String(codigoSis).trim()]);
    const estPayload = mapearEstudiante(est);

    return {
      resultado: RESULTADO_VALIDACION.PERMITIDO,
      estudiante: estPayload,
      motivo: null,
      marcadoEn: registro.timestampLocal,
      marcadoPor: operadorId,
      clientUuid: registro.clientUuid,
      metodo,
      coincidenciaParcial: false,
      ambiguo: false,
      fueraDeRango: false,
      aulaAsignada: estPayload?.aulaAsignada || null,
      normaParticular: estPayload?.normaParticular || null,
      registrado: true,
      tiempoMs: calcularTiempo()
    };
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.codigo === ERROR_ASISTENCIA.ALMACENAMIENTO_LLENO) {
      const errAlmacenamiento = new Error('Espacio de almacenamiento local insuficiente para registrar la marca.');
      errAlmacenamiento.codigo = ERROR_ASISTENCIA.ALMACENAMIENTO_LLENO;
      throw errAlmacenamiento;
    }

    const est = await db.nominas.get([exId, String(codigoSis).trim()]);
    const estPayload = mapearEstudiante(est);

    if (error.codigo === ERROR_ASISTENCIA.YA_MARCADO) {
      return {
        resultado: RESULTADO_VALIDACION.YA_MARCADO,
        estudiante: estPayload,
        motivo: null,
        marcadoEn: error.marcadoEn || est?.marcadoEn,
        marcadoPor: error.marcadoPor || est?.marcadoPor,
        clientUuid: null,
        metodo,
        coincidenciaParcial: false,
        ambiguo: false,
        fueraDeRango: false,
        aulaAsignada: estPayload?.aulaAsignada || null,
        normaParticular: estPayload?.normaParticular || null,
        registrado: false,
        tiempoMs: calcularTiempo()
      };
    }

    if (error.codigo === ERROR_ASISTENCIA.NO_HABILITADO) {
      return {
        resultado: RESULTADO_VALIDACION.NO_HABILITADO,
        estudiante: estPayload,
        motivo: error.motivo || est?.motivoBloqueo,
        marcadoEn: null,
        marcadoPor: null,
        clientUuid: null,
        metodo,
        coincidenciaParcial: false,
        ambiguo: false,
        fueraDeRango: false,
        aulaAsignada: estPayload?.aulaAsignada || null,
        normaParticular: estPayload?.normaParticular || null,
        registrado: false,
        tiempoMs: calcularTiempo()
      };
    }

    if (error.codigo === ERROR_ASISTENCIA.NO_EN_NOMINA) {
      return {
        resultado: RESULTADO_VALIDACION.NO_EN_NOMINA,
        estudiante: null,
        motivo: null,
        marcadoEn: null,
        marcadoPor: null,
        clientUuid: null,
        metodo,
        coincidenciaParcial: false,
        ambiguo: false,
        fueraDeRango: false,
        aulaAsignada: null,
        normaParticular: null,
        registrado: false,
        tiempoMs: calcularTiempo()
      };
    }

    throw error;
  }
}

/**
 * Motor principal de validación de ingreso offline-first.
 * NO lee fotos.
 */
export async function validarIngreso({
  examenId,
  asignaturaId = null,
  ambienteId = null,
  lectura,
  metodo,
  operadorId,
  rol,
  clockOffsetMs = 0,
  aulaControl = null,
  rangoApellidos = null,
  verificacionVisual = false,
  registrar = true,
  scoreFacial = null,
  livenessScore = null,
  modelVersion = null,
  deviceId = null,
  modoRapido = false,
  motivoModoRapido = null
}) {
  const exId = Number(examenId);

  // Validación estricta previa a cualquier consulta
  if (!Number.isInteger(exId) || exId <= 0 || !operadorId || !rol) {
    const error = new Error('Parámetros inválidos o incompletos: examenId (entero positivo), operadorId y rol son requeridos.');
    error.codigo = ERROR_ASISTENCIA.PARAMETROS_INVALIDOS;
    throw error;
  }

  const inicio = performance.now();
  const calcularTiempo = () => Math.round((performance.now() - inicio) * 100) / 100;

  const respuestaBase = {
    resultado: null,
    estudiante: null,
    motivo: null,
    marcadoEn: null,
    marcadoPor: null,
    clientUuid: null,
    metodo: null,
    coincidenciaParcial: false,
    ambiguo: false,
    fueraDeRango: false,
    aulaAsignada: null,
    normaParticular: null,
    registrado: false,
    tiempoMs: 0
  };

  // Comprobación rápida de existencia de nómina local (.first())
  const tieneNomina = await db.nominas.where('examenId').equals(exId).first();
  if (!tieneNomina) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.SIN_NOMINA_LOCAL,
      motivo: 'El examen no cuenta con nómina descargada en este dispositivo.',
      tiempoMs: calcularTiempo()
    };
  }

  const metodoNormalizado = metodo ? String(metodo).trim().toUpperCase() : null;
  const infoQr = extraerQr(lectura);

  // Si método explícito es QR pero la lectura no empieza con 'SCIEMPASS:'
  if (metodoNormalizado === 'QR' && !infoQr.esQr) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.QR_INVALIDO,
      motivo: 'Código QR no reconocido.',
      metodo: 'QR',
      tiempoMs: calcularTiempo()
    };
  }

  let estudiante = null;
  let metodoUsado = null;
  let coincidenciaParcial = false;
  let tokenQrUtilizado = null;

  // 4.a. RUTA QR CERRADA: Si es QR, evalúa SOLO QR sin caer a SIS ni CI
  if (infoQr.esQr) {
    metodoUsado = 'QR';

    if (infoQr.version !== '1') {
      return {
        ...respuestaBase,
        resultado: RESULTADO_VALIDACION.QR_INVALIDO,
        motivo: 'Versión de código QR no soportada.',
        metodo: 'QR',
        tiempoMs: calcularTiempo()
      };
    }

    tokenQrUtilizado = infoQr.token ? infoQr.token.toUpperCase() : '';
    estudiante = await nominaRepo.buscarPorQr(exId, tokenQrUtilizado);

    if (!estudiante) {
      return {
        ...respuestaBase,
        resultado: RESULTADO_VALIDACION.NO_EN_NOMINA,
        motivo: 'QR no encontrado en la nómina descargada de este examen.',
        metodo: 'QR',
        tiempoMs: calcularTiempo()
      };
    }

    if (estudiante.qrEstado !== 'ACTIVO') {
      return {
        ...respuestaBase,
        resultado: RESULTADO_VALIDACION.QR_INVALIDO,
        motivo: 'QR anulado o inactivo.',
        estudiante: mapearEstudiante(estudiante),
        metodo: 'QR',
        tiempoMs: calcularTiempo()
      };
    }

    // Comprobación de vigencia finita
    if (!Number.isFinite(estudiante.qrDesde) || !Number.isFinite(estudiante.qrHasta)) {
      return {
        ...respuestaBase,
        resultado: RESULTADO_VALIDACION.QR_INVALIDO,
        motivo: 'QR sin vigencia en la nómina; actualice la nómina.',
        estudiante: mapearEstudiante(estudiante),
        metodo: 'QR',
        tiempoMs: calcularTiempo()
      };
    }

    const ahora = Date.now() + clockOffsetMs;
    if (ahora < estudiante.qrDesde) {
      return {
        ...respuestaBase,
        resultado: RESULTADO_VALIDACION.QR_INVALIDO,
        motivo: 'QR aún no vigente para este examen.',
        estudiante: mapearEstudiante(estudiante),
        metodo: 'QR',
        tiempoMs: calcularTiempo()
      };
    }

    if (ahora > estudiante.qrHasta) {
      return {
        ...respuestaBase,
        resultado: RESULTADO_VALIDACION.QR_INVALIDO,
        motivo: 'QR expirado para este examen.',
        estudiante: mapearEstudiante(estudiante),
        metodo: 'QR',
        tiempoMs: calcularTiempo()
      };
    }
  } else {
    // 4.b. RUTA MANUAL / NO-QR: SIS, luego CI (nunca como token QR)
    if (metodoNormalizado === 'CODIGO' || metodoNormalizado === 'SIS') {
      estudiante = await nominaRepo.buscarPorSis(exId, lectura);
      metodoUsado = 'CODIGO';
    } else if (metodoNormalizado === 'CI') {
      const ciRes = await resolverPorCi(exId, lectura);
      if (ciRes.ambiguo) {
        return {
          ...respuestaBase,
          resultado: RESULTADO_VALIDACION.NO_EN_NOMINA,
          motivo: ciRes.motivo,
          ambiguo: true,
          metodo: 'CI',
          tiempoMs: calcularTiempo()
        };
      }
      estudiante = ciRes.estudiante;
      coincidenciaParcial = ciRes.coincidenciaParcial;
      metodoUsado = 'CI';
    } else {
      // Sin método explícito: descarte SIS -> CI
      estudiante = await nominaRepo.buscarPorSis(exId, lectura);
      if (estudiante) {
        metodoUsado = 'CODIGO';
      } else {
        const ciRes = await resolverPorCi(exId, lectura);
        if (ciRes.ambiguo) {
          return {
            ...respuestaBase,
            resultado: RESULTADO_VALIDACION.NO_EN_NOMINA,
            motivo: ciRes.motivo,
            ambiguo: true,
            metodo: 'CI',
            tiempoMs: calcularTiempo()
          };
        }
        if (ciRes.estudiante) {
          estudiante = ciRes.estudiante;
          coincidenciaParcial = ciRes.coincidenciaParcial;
          metodoUsado = 'CI';
        }
      }
    }
  }

  // Estudiante no encontrado
  if (!estudiante) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.NO_EN_NOMINA,
      metodo: metodoUsado,
      tiempoMs: calcularTiempo()
    };
  }

  const estudiantePayload = mapearEstudiante(estudiante);
  const fueraDeRango = evaluarRangoApellidos(estudiante.apellidoPaterno, rangoApellidos);

  // 4.c. Orden de reglas tras identificar al estudiante:

  // 1. NO_HABILITADO
  if (!estudiante.habilitado) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.NO_HABILITADO,
      estudiante: estudiantePayload,
      motivo: estudiante.motivoBloqueo || 'Estudiante inhabilitado para rendir el examen.',
      metodo: metodoUsado,
      coincidenciaParcial,
      fueraDeRango,
      aulaAsignada: estudiante.aulaAsignada,
      normaParticular: estudiante.normaParticular,
      tiempoMs: calcularTiempo()
    };
  }

  // 2. RETIRADO: el estudiante ingresó pero fue expulsado del examen.
  //    Se comprueba antes que el duplicado para que el mensaje sea el
  //    correcto: está retirado, no simplemente "ya ingresó".
  //    La nómina trae el estado que bajó del servidor y la cola local cubre
  //    la expulsión que todavía no se ha sincronizado.
  if (await estaExpulsadoLocal(exId, estudiante.codigoSis, estudiante.expulsado)) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.RETIRADO,
      estudiante: estudiantePayload,
      motivo: 'El estudiante fue expulsado de este examen y no puede volver a ingresar.',
      metodo: metodoUsado,
      coincidenciaParcial,
      fueraDeRango,
      aulaAsignada: estudiante.aulaAsignada,
      normaParticular: estudiante.normaParticular,
      tiempoMs: calcularTiempo()
    };
  }

  // 3. YA_MARCADO
  if (estudiante.marcadoLocal === 1) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.YA_MARCADO,
      estudiante: estudiantePayload,
      marcadoEn: estudiante.marcadoEn,
      marcadoPor: estudiante.marcadoPor,
      metodo: metodoUsado,
      coincidenciaParcial,
      fueraDeRango,
      aulaAsignada: estudiante.aulaAsignada,
      normaParticular: estudiante.normaParticular,
      tiempoMs: calcularTiempo()
    };
  }

  // 4. OTRA_AULA
  if (
    aulaControl &&
    estudiante.aulaAsignada &&
    String(aulaControl).trim() !== String(estudiante.aulaAsignada).trim()
  ) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.OTRA_AULA,
      estudiante: estudiantePayload,
      motivo: `Estudiante asignado a otra aula: ${estudiante.aulaAsignada}.`,
      metodo: metodoUsado,
      coincidenciaParcial,
      fueraDeRango,
      aulaAsignada: estudiante.aulaAsignada,
      normaParticular: estudiante.normaParticular,
      tiempoMs: calcularTiempo()
    };
  }

  // 5. registrar = false: sólo valida y devuelve sin persistir
  if (!registrar) {
    return {
      ...respuestaBase,
      resultado: RESULTADO_VALIDACION.PERMITIDO,
      estudiante: estudiantePayload,
      metodo: metodoUsado,
      coincidenciaParcial,
      fueraDeRango,
      aulaAsignada: estudiante.aulaAsignada,
      normaParticular: estudiante.normaParticular,
      registrado: false,
      tiempoMs: calcularTiempo()
    };
  }

  // 6. Registro formal preservando coincidenciaParcial y fueraDeRango
  const resRegistro = await registrarIngreso({
    examenId: exId,
    asignaturaId,
    ambienteId,
    codigoSis: estudiante.codigoSis,
    metodo: metodoUsado,
    operadorId,
    rol,
    clockOffsetMs,
    verificacionVisual,
    qrToken: tokenQrUtilizado,
    scoreFacial,
    livenessScore,
    modelVersion,
      deviceId,
      modoRapido,
      motivoModoRapido
  });

  return {
    ...resRegistro,
    coincidenciaParcial,
    fueraDeRango
  };
}
