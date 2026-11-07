import { db } from './db.js';
import { strApiBaseUrl } from '../services/apiConfig.js';
import { obtenerToken, obtenerUsuarioActual } from '../services/authService.js';

// La fecha se comprueba siempre en hora de Bolivia, no en la zona del dispositivo.
export function fechaBolivia(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora);
  const valor = (tipo) => partes.find((p) => p.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

export const orientacionJornadaRepo = {
  async descargar({ operadorId, asignaturaControl, examenControl, ambienteControl, signal }) {
    const operador = Number(operadorId);
    const ids = [operador, asignaturaControl, examenControl, ambienteControl].map(Number);
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error('Faltan datos del aula de control.');
    const token = obtenerToken();
    if (!token || Number(obtenerUsuarioActual()?.idUsuario) !== operador) throw new Error('Sesion no disponible.');
    const params = new URLSearchParams({ idasignatura: String(asignaturaControl), idexamen: String(examenControl), idambiente: String(ambienteControl) });
    const respuesta = await fetch(`${strApiBaseUrl}/api/v1/control/orientacion-jornada?${params}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal,
    });
    if (!respuesta.ok) throw new Error(`No se pudo descargar la orientacion de jornada (${respuesta.status}).`);
    const jornada = await respuesta.json();
    if (signal?.aborted || Number(obtenerUsuarioActual()?.idUsuario) !== operador || obtenerToken() !== token) {
      throw new Error('La sesion cambio durante la descarga.');
    }
    await this.guardar({ operadorId: operador, examenControl, jornada });
    return { fecha: jornada.fecha, cantidad: jornada.candidatos.length };
  },
  async guardar({ operadorId, examenControl, jornada }) {
    const operador = Number(operadorId);
    const examen = Number(examenControl);
    if (!Number.isInteger(operador) || operador <= 0 || !Number.isInteger(examen) || examen <= 0
        || !jornada || jornada.fecha !== fechaBolivia() || !Array.isArray(jornada.candidatos)) {
      throw new Error('Datos de orientacion invalidos o fuera de la jornada actual.');
    }
    await db.transaction('rw', db.orientacion_jornada, async () => {
      // La copia solo sirve para la jornada; no se tocan las colas pendientes.
      await db.orientacion_jornada.filter((registro) => registro.fecha !== jornada.fecha).delete();
      await db.orientacion_jornada.put({ operadorId: operador, examenControl: examen,
        fecha: jornada.fecha, candidatos: jornada.candidatos, descargadaEn: Date.now() });
    });
  },
  async obtener({ operadorId, examenControl, ahora = new Date() }) {
    const dato = await db.orientacion_jornada.get([Number(operadorId), Number(examenControl)]);
    if (dato && dato.fecha !== fechaBolivia(ahora)) {
      await db.orientacion_jornada.delete([Number(operadorId), Number(examenControl)]);
      return null;
    }
    return Array.isArray(dato?.candidatos) ? dato : null;
  },
};
