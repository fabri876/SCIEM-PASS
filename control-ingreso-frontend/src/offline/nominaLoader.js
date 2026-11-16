import { db } from './db.js';
import { nominaRepo } from './nominaRepo.js';
import { fotoRepo } from './fotoRepo.js';
import {
  URL_NOMINA,
  URL_FOTOS,
  PRIMERA_PAGINA,
  MAX_PAGINAS,
  MS_NOMINA_DESACTUALIZADA,
  ERROR_NOMINA,
  ERROR_ASISTENCIA
} from './constantes.js';
import { strApiBaseUrl } from '../services/apiConfig.js';
import { obtenerToken } from '../services/authService.js';
import { obtenerClockOffsetMs } from './connectivityService.js';

// Control de concurrencia: un solo proceso de descarga por examen a la vez
const descargasEnCurso = new Set();
const descargasFotosEnCurso = new Set();

function esperar(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(crearErrorConCodigo('Descarga cancelada', ERROR_NOMINA.CANCELADO));
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(crearErrorConCodigo('Descarga cancelada', ERROR_NOMINA.CANCELADO));
    };
    function cleanup() {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function crearErrorConCodigo(mensaje, codigo, status = null) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  if (status) error.status = status;
  return error;
}

/**
 * Cliente HTTP por defecto con timeout de 20s, 3 reintentos con backoff cortable ante signal
 * y mapeo a códigos de ERROR_NOMINA.
 */
export async function fetchPaginaPorDefecto({ url, signal }) {
  if (signal?.aborted) {
    throw crearErrorConCodigo('Descarga cancelada', ERROR_NOMINA.CANCELADO);
  }

  const endpointCompleto = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${strApiBaseUrl}${url}`;

  const token = obtenerToken();
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const maxIntentos = 3;
  let intento = 0;

  while (true) {
    if (signal?.aborted) {
      throw crearErrorConCodigo('Descarga cancelada', ERROR_NOMINA.CANCELADO);
    }

    const controller = new AbortController();
    let canceladoPorPadre = false;

    const onAbortPadre = () => {
      canceladoPorPadre = true;
      controller.abort();
    };

    if (signal) {
      signal.addEventListener('abort', onAbortPadre, { once: true });
    }

    const timer = setTimeout(() => {
      controller.abort();
    }, 20000);

    let resp;
    let errorRed = null;

    try {
      resp = await fetch(endpointCompleto, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
    } catch (errFetch) {
      errorRed = errFetch;
    } finally {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbortPadre);
      }
    }

    if (canceladoPorPadre || signal?.aborted) {
      throw crearErrorConCodigo('Descarga cancelada', ERROR_NOMINA.CANCELADO);
    }

    // 1. Error de conexión o timeout local
    if (errorRed) {
      intento++;
      if (intento > maxIntentos) {
        throw crearErrorConCodigo(
          `Fallo de conexión tras ${maxIntentos} reintentos: ${errorRed.message}`,
          ERROR_NOMINA.RED
        );
      }
      const esperaMs = Math.min(1000 * Math.pow(2, intento - 1), 8000) * (0.8 + Math.random() * 0.4);
      await esperar(esperaMs, signal);
      continue;
    }

    // 2. Manejo según código de respuesta HTTP
    if (resp.status === 401) {
      throw crearErrorConCodigo('Sesión expirada o no autorizada (401)', ERROR_NOMINA.AUTH, 401);
    }

    if (resp.status === 403) {
      throw crearErrorConCodigo('Sin permisos para acceder a este examen (403)', ERROR_NOMINA.SIN_PERMISO, 403);
    }

    if (resp.status === 404 || resp.status === 405) {
      throw crearErrorConCodigo(
        `Recurso no disponible (${resp.status})`,
        ERROR_NOMINA.NO_DISPONIBLE,
        resp.status
      );
    }

    if (resp.status === 429) {
      intento++;
      if (intento > maxIntentos) {
        throw crearErrorConCodigo('Demasiadas solicitudes (429) agotadas tras reintentos', ERROR_NOMINA.RED, 429);
      }
      const retryHeader = resp.headers.get('Retry-After');
      let esperaMs = 2000;
      if (retryHeader) {
        const seg = parseInt(retryHeader, 10);
        if (!Number.isNaN(seg)) esperaMs = seg * 1000;
      } else {
        esperaMs = Math.min(1000 * Math.pow(2, intento - 1), 8000);
      }
      await esperar(esperaMs, signal);
      continue;
    }

    if (resp.status >= 500) {
      intento++;
      if (intento > maxIntentos) {
        throw crearErrorConCodigo(`Error del servidor (${resp.status}) tras reintentos`, ERROR_NOMINA.RED, resp.status);
      }
      const esperaMs = Math.min(1000 * Math.pow(2, intento - 1), 8000) * (0.8 + Math.random() * 0.4);
      await esperar(esperaMs, signal);
      continue;
    }

    if (!resp.ok) {
      throw crearErrorConCodigo(`Error HTTP inesperado ${resp.status}`, ERROR_NOMINA.HTTP_ERROR, resp.status);
    }

    return await resp.json();
  }
}

/** Descarga solo las miniaturas de un examen; nunca invalida su nómina local. */
export async function descargarFotosNomina({ examenId, signal, onProgreso, fetchPagina = fetchPaginaPorDefecto } = {}) {
  const exId = Number(examenId);
  if (!Number.isInteger(exId) || exId <= 0) {
    throw crearErrorConCodigo('El examenId debe ser un número entero positivo.', ERROR_NOMINA.PARAMETROS_INVALIDOS);
  }
  if (descargasFotosEnCurso.has(exId)) return { omitido: true };
  descargasFotosEnCurso.add(exId);
  const claveMeta = `nomina:${exId}`;
  let guardadas = 0;
  let omitidas = 0;
  let disponibles = true;
  let errorFotos = null;
  let completo = false;
  try {
    let pagina = PRIMERA_PAGINA;
    let hayMas = true;
    while (hayMas) {
      if (signal?.aborted) throw crearErrorConCodigo('Descarga cancelada', ERROR_NOMINA.CANCELADO);
      const path = URL_FOTOS.replace(':id', encodeURIComponent(exId));
      const respuesta = await fetchPagina({ url: `${path}?${new URLSearchParams({ page: String(pagina), size: '200' })}`, signal });
      const items = respuesta?.items ?? respuesta?.content;
      if (!Array.isArray(items)) throw crearErrorConCodigo('Formato de fotos inválido', ERROR_NOMINA.FORMATO_INVALIDO);
      const totalPaginas = Number(respuesta.totalPages) || 1;
      if (totalPaginas > MAX_PAGINAS) throw crearErrorConCodigo('Paginación de fotos inválida', ERROR_NOMINA.PAGINACION_INVALIDA);
      try {
        const resultado = await fotoRepo.guardarFotos(items);
        guardadas += resultado.guardadas;
        omitidas += resultado.omitidas;
      } catch (err) {
        disponibles = false;
        errorFotos = err?.name === 'QuotaExceededError' ? 'CUOTA' : (err?.codigo || 'ALMACENAMIENTO');
        break;
      }
      onProgreso?.({ fase: 'fotos', descargados: guardadas, total: respuesta.total ?? guardadas,
        porcentaje: Math.min(100, Math.round(((pagina - PRIMERA_PAGINA + 1) / totalPaginas) * 100)) });
      if (pagina >= PRIMERA_PAGINA + totalPaginas - 1 || items.length === 0) {
        completo = true;
        hayMas = false;
      } else pagina++;
    }
  } catch (err) {
    if (err.codigo === ERROR_NOMINA.CANCELADO) throw err;
    disponibles = false;
    errorFotos = err.codigo || 'ERROR_FOTOS';
  } finally {
    const meta = (await db.meta.get(claveMeta)) || { clave: claveMeta, idExamen: exId };
    const noDisponible = errorFotos === ERROR_NOMINA.NO_DISPONIBLE;
    await db.meta.put({ ...meta, fotosDescargadas: await fotoRepo.contarFotosDeNomina(exId),
      fotosDescargadasEn: completo ? new Date().toISOString() : (meta.fotosDescargadasEn || null),
      fotosDisponibles: disponibles && completo,
      fotosError: noDisponible ? null : errorFotos });
    descargasFotosEnCurso.delete(exId);
  }
  return { guardadas, omitidas, fotosDisponibles: disponibles && completo, fotosError: errorFotos, omitido: false };
}

/**
 * Descarga y sincroniza la nómina de un examen con soporte incremental, paginación base 0 y fotos.
 * Guarda metadatos en db.meta con clave 'nomina:${examenId}'.
 */
export async function descargarNomina({
  examenId,
  completa = false,
  incluirFotos = true,
  tamanoPagina = 1000,
  onProgreso,
  fetchPagina = fetchPaginaPorDefecto,
  signal
} = {}) {
  const exId = Number(examenId);
  if (!Number.isInteger(exId) || exId <= 0) {
    throw crearErrorConCodigo(
      'El examenId debe ser un número entero positivo.',
      ERROR_NOMINA.PARAMETROS_INVALIDOS
    );
  }

  // Exclusión por examen
  if (descargasEnCurso.has(exId)) {
    return {
      guardados: 0,
      sinEstado: 0,
      sinSis: 0,
      eliminados: 0,
      depuracionOmitida: false,
      fotosGuardadas: 0,
      fotosOmitidas: 0,
      fotosDisponibles: false,
      fotosError: null,
      total: 0,
      omitido: true
    };
  }

  descargasEnCurso.add(exId);

  // En un refresco (completa=false) la copia anterior de la nómina sigue siendo
  // válida: la descarga solo AGREGA información. Si el refresco falla, el
  // equipo no puede quedarse sin nómina (eso lo dejaría sin control offline).
  let boolTeniaNominaCompleta = false;

  // Hora de inicio sincronizada con clock offset de connectivityService
  const horaInicioDescargaIso = new Date(Date.now() + obtenerClockOffsetMs()).toISOString();
  const claveMeta = `nomina:${exId}`;

  let cursorServidor = null;
  const sissRecibidos = new Set();

  let totalGuardados = 0;
  let totalSinEstado = 0;
  let totalSinSis = 0;
  let eliminados = 0;
  let depuracionOmitida = false;
  let totalItemsReportado = null;
  let totalExplicitoCero = false;

  let fotosGuardadas = 0;
  let fotosOmitidas = 0;
  let fotosDisponibles = true;
  let fotosError = null;

  try {
    const metaExistente = (await db.meta.get(claveMeta)) || { clave: claveMeta, idExamen: exId };
    boolTeniaNominaCompleta = metaExistente.descargaCompleta === true;
    const cursorPrevio = !completa && metaExistente.nominaCursor ? metaExistente.nominaCursor : null;

    // Al iniciar, descargaCompleta queda en false (una descarga completa
    // abortada deja la nómina a medias). En un refresco se conserva el estado
    // anterior: la copia previa sigue siendo válida.
    await db.meta.put({
      ...metaExistente,
      clave: claveMeta,
      idExamen: exId,
      descargaCompleta: completa ? false : boolTeniaNominaCompleta
    });

    let pagina = PRIMERA_PAGINA;
    let hayMasPaginas = true;

    // --- FASE 1: NÓMINA ---
    while (hayMasPaginas) {
      if (signal?.aborted) {
        throw crearErrorConCodigo('Descarga cancelada', ERROR_NOMINA.CANCELADO);
      }

      const pathBase = URL_NOMINA.replace(':id', encodeURIComponent(exId));
      const params = new URLSearchParams({
        page: String(pagina),
        size: String(tamanoPagina)
      });
      if (cursorPrevio) {
        params.set('updatedSince', cursorPrevio);
      }
      const url = `${pathBase}?${params.toString()}`;

      const respuesta = await fetchPagina({ url, signal });

      let items = [];
      let totalPaginas = 1;

      if (Array.isArray(respuesta)) {
        // Respuesta plana (arreglo simple = una sola página)
        items = respuesta;
        hayMasPaginas = false;
        totalItemsReportado = items.length;
      } else if (respuesta && typeof respuesta === 'object') {
        const lista = respuesta.items ?? respuesta.content;
        if (!Array.isArray(lista)) {
          throw crearErrorConCodigo(
            'La respuesta del servidor no tiene un formato válido (se esperaba items o content como arreglo)',
            ERROR_NOMINA.FORMATO_INVALIDO
          );
        }

        items = lista;
        totalPaginas = Number(respuesta.totalPages) || 1;
        const totalRaw = respuesta.total ?? respuesta.totalElements;
        totalItemsReportado = totalRaw !== undefined ? Number(totalRaw) : null;
        if (totalRaw === 0) {
          totalExplicitoCero = true;
        }

        if (respuesta.generadoEn) {
          cursorServidor = respuesta.generadoEn;
        }

        if (totalPaginas > MAX_PAGINAS) {
          throw crearErrorConCodigo(
            `El servidor reporta ${totalPaginas} páginas, superando el límite de ${MAX_PAGINAS}`,
            ERROR_NOMINA.PAGINACION_INVALIDA
          );
        }

        const ultimaPagina = PRIMERA_PAGINA + totalPaginas - 1;
        if (pagina >= ultimaPagina || items.length === 0) {
          hayMasPaginas = false;
        } else {
          pagina++;
          if (pagina - PRIMERA_PAGINA >= MAX_PAGINAS) {
            throw crearErrorConCodigo(
              `Se superó el tope de ${MAX_PAGINAS} páginas durante la descarga`,
              ERROR_NOMINA.PAGINACION_INVALIDA
            );
          }
        }
      } else {
        throw crearErrorConCodigo(
          'Formato de respuesta desconocido',
          ERROR_NOMINA.FORMATO_INVALIDO
        );
      }

      // Guardar lote de estudiantes en la nómina local
      if (items.length > 0) {
        try {
          const resLote = await nominaRepo.guardarLote(exId, items);
          totalGuardados += resLote.guardados;
          totalSinEstado += resLote.sinEstado;
          totalSinSis += resLote.sinSis;
        } catch (errLote) {
          if (errLote.codigo === ERROR_ASISTENCIA.LOTE_ESTADO_DESCONOCIDO) {
            errLote.descargaCompleta = false;
          }
          throw errLote;
        }

        for (const item of items) {
          const sis = item.codigoSis || item.codSisEstudiante || item.codsisestudiante;
          if (sis) sissRecibidos.add(String(sis).trim());
        }
      }

      const descargadosActual = totalGuardados;
      const totalParaProgreso = totalItemsReportado !== null ? totalItemsReportado : descargadosActual;
      const porcentaje = totalParaProgreso > 0
        ? Math.min(100, Math.round((descargadosActual / totalParaProgreso) * 100))
        : 100;

      if (typeof onProgreso === 'function') {
        try {
          onProgreso({
            fase: 'nomina',
            descargados: descargadosActual,
            total: totalParaProgreso,
            porcentaje
          });
        } catch (errProgreso) {
          console.warn('[descargarNomina] Error en callback onProgreso (ignorado):', errProgreso);
        }
      }
    }

    // Depuración en modo completa: true
    if (completa) {
      const debeDepurar = sissRecibidos.size > 0 || totalExplicitoCero;

      if (debeDepurar) {
        await db.transaction('rw', db.nominas, async () => {
          const locales = await db.nominas.where('examenId').equals(exId).toArray();
          const localesSinMarca = locales.filter((l) => l.marcadoLocal === 0);
          const clavesABorrar = [];

          for (const estudiante of localesSinMarca) {
            if (!sissRecibidos.has(String(estudiante.codigoSis))) {
              clavesABorrar.push([exId, estudiante.codigoSis]);
            }
          }

          // Si eliminaría más del 50% de la nómina local sin marcas, no borra y avisa
          if (localesSinMarca.length > 0 && clavesABorrar.length > localesSinMarca.length * 0.5) {
            depuracionOmitida = true;
            eliminados = 0;
          } else if (clavesABorrar.length > 0) {
            await db.nominas.bulkDelete(clavesABorrar);
            eliminados = clavesABorrar.length;
          }
        });
      } else {
        depuracionOmitida = true;
      }
    }

    // --- FASE 2: FOTOS (OPCIONAL) ---
    if (incluirFotos) {
      const resultadoFotos = await descargarFotosNomina({ examenId: exId, signal, onProgreso, fetchPagina });
      fotosGuardadas = resultadoFotos.guardadas || 0;
      fotosOmitidas = resultadoFotos.omitidas || 0;
      fotosDisponibles = resultadoFotos.fotosDisponibles ?? false;
      fotosError = resultadoFotos.fotosError ?? null;
    }

    // Finalización exitosa: fotosDescargadas = total de fotos en db.fotos
    const totalLocalFinal = await nominaRepo.contar(exId);
    const fotosTotalesEnBd = await fotoRepo.contarFotosDeNomina(exId);
    const cursorFinal = cursorServidor || horaInicioDescargaIso;

    const metaActualizado = (await db.meta.get(claveMeta)) || { clave: claveMeta, idExamen: exId };
    await db.meta.put({
      ...metaActualizado,
      clave: claveMeta,
      idExamen: exId,
      nominaCursor: cursorFinal,
      descargadaEn: new Date().toISOString(),
      totalEstudiantes: totalLocalFinal,
      descargaCompleta: true,
      versionNomina: 2,
      fotosDescargadas: fotosTotalesEnBd,
      fotosDescargadasEn: incluirFotos && fotosDisponibles ? new Date().toISOString() : (metaActualizado.fotosDescargadasEn || null),
      fotosDisponibles,
      fotosError
    });

    return {
      guardados: totalGuardados,
      sinEstado: totalSinEstado,
      sinSis: totalSinSis,
      eliminados,
      depuracionOmitida,
      fotosGuardadas,
      fotosOmitidas,
      fotosDisponibles,
      fotosError,
      total: totalLocalFinal,
      omitido: false
    };
  } catch (error) {
    try {
      const metaActual = await db.meta.get(claveMeta);
      if (metaActual) {
        await db.meta.put({
          ...metaActual,
          // Un refresco fallido no invalida la copia previa de la nómina.
          descargaCompleta: completa ? false : boolTeniaNominaCompleta
        });
      }
    } catch {
      // Ignorar error secundario de persistencia
    }
    throw error;
  } finally {
    descargasEnCurso.delete(exId);
  }
}

/**
 * Consulta el estado local de la nómina para un examen desde db.meta y db.nominas.
 */
export async function obtenerEstadoNomina(examenId) {
  const exId = Number(examenId);
  if (!Number.isInteger(exId) || exId <= 0) {
    return {
      lista: false,
      descargadaEn: null,
      totalLocal: 0,
      fotosLocales: 0,
      descargaCompleta: false,
      desactualizada: false
    };
  }

  const claveMeta = `nomina:${exId}`;
  const meta = await db.meta.get(claveMeta);
  const totalLocal = await nominaRepo.contar(exId);

  // fotosLocales usa fotosDescargadas de meta, o db.fotos.count() como fallback
  const fotosLocales = await fotoRepo.contarFotosDeNomina(exId);

  const descargadaEn = meta?.descargadaEn || null;
  const descargaCompleta = Boolean(meta?.descargaCompleta);
  const lista = descargaCompleta && totalLocal > 0;
  const versionCompatible = Number(meta?.versionNomina || 0) >= 2;

  let desactualizada = false;
  if (descargadaEn) {
    const epochDescarga = new Date(descargadaEn).getTime();
    if (Number.isFinite(epochDescarga)) {
      desactualizada = Date.now() - epochDescarga > MS_NOMINA_DESACTUALIZADA;
    }
  }

  return {
    lista: lista && versionCompatible,
    descargadaEn,
    totalLocal,
    fotosLocales,
    fotosDescargadasEn: meta?.fotosDescargadasEn || null,
    fotosDisponibles: meta?.fotosDisponibles ?? null,
    fotosError: meta?.fotosError || null,
    descargaCompleta,
    versionCompatible,
    desactualizada
  };
}

/**
 * Limpia la nómina local y fotos huérfanas mediante nominaRepo.
 * Reinicia los metadatos en db.meta solo si el borrado tuvo éxito.
 */
export async function eliminarNominaLocal(examenId) {
  const exId = Number(examenId);
  if (!Number.isInteger(exId) || exId <= 0) {
    throw crearErrorConCodigo(
      'El examenId debe ser un número entero positivo.',
      ERROR_NOMINA.PARAMETROS_INVALIDOS
    );
  }

  const borrados = await nominaRepo.limpiarNominaExamen(exId);

  const claveMeta = `nomina:${exId}`;
  const meta = await db.meta.get(claveMeta);
  await db.meta.put({
    ...(meta || {}),
    clave: claveMeta,
    idExamen: exId,
    nominaCursor: null,
    descargadaEn: null,
    totalEstudiantes: 0,
    descargaCompleta: false,
    fotosDescargadas: 0,
    fotosDescargadasEn: null,
    fotosDisponibles: null,
    fotosError: null
  });

  return borrados;
}
