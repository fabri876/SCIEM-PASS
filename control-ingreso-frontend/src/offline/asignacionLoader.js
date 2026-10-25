import { asignacionRepo } from './asignacionRepo.js';
import { strApiBaseUrl } from '../services/apiConfig.js';
import { obtenerToken } from '../services/authService.js';

function construirHeaders() {
  const strToken = obtenerToken();
  return {
    'Content-Type': 'application/json',
    ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
  };
}

/**
 * Descarga las asignaciones de operadores (ayudantes) de un examen desde el backend
 * y las guarda localmente en IndexedDB para poder validar rangos de apellidos offline.
 *
 * Endpoint: GET /api/examenes/{idExamen}/asignacion-ingreso
 *
 * @param {Object} params
 * @param {number} params.examenId - ID del examen
 * @returns {Promise<{ guardados: number }>}
 */
export async function descargarAsignacionesOperadores({ examenId }) {
  const exId = Number(examenId);
  if (!Number.isInteger(exId) || exId <= 0) {
    const error = new Error('El examenId debe ser un número entero positivo.');
    error.codigo = 'PARAMETROS_INVALIDOS';
    throw error;
  }

  const response = await fetch(`${strApiBaseUrl}/api/examenes/${exId}/asignacion-ingreso`, {
    headers: construirHeaders(),
  });

  if (response.status === 404 || response.status === 204) {
    return { guardados: 0 };
  }

  if (!response.ok) {
    throw new Error('No se pudieron descargar las asignaciones de operadores.');
  }

  const data = await response.json();

  // Extraer responsables del cuerpo de respuesta
  const responsables = Array.isArray(data?.responsables) ? data.responsables : [];
  const modoAsignacionGlobal = data.modoAsignacion || 'SUBDIVISION';

  const asignaciones = responsables.map((r) => ({
    idExamen: exId,
    idAmbiente: r.idAmbiente,
    idUsuario: r.idUsuario,
    apellidoDesde: r.apellidoDesde || null,
    apellidoHasta: r.apellidoHasta || null,
    modoAsignacion: r.modoAsignacion || modoAsignacionGlobal,
    nombreOperador: r.nombreResponsable || '',
  }));

  return await asignacionRepo.guardarAsignaciones(exId, asignaciones);
}
