import { db } from './db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;

/** Una verificacion rechazada nunca se introduce en la cola de asistencias. */
export function validarIntentoPendiente(item) {
  if (!item || !UUID.test(String(item.clientUuid || ''))) throw new Error('Identificador de intento invalido.');
  for (const nombre of ['operadorId', 'asignaturaControl', 'examenControl', 'ambienteControl', 'estudianteSis', 'asignaturaDestino', 'examenDestino', 'ambienteDestino']) {
    if (!Number.isSafeInteger(Number(item[nombre])) || Number(item[nombre]) <= 0) throw new Error(`Campo invalido: ${nombre}.`);
  }
  if (!['SIS', 'CI', 'QR'].includes(item.metodo)) throw new Error('Metodo de verificacion invalido.');
  if (item.metodo === 'QR' && !HASH.test(String(item.qrHash || ''))) throw new Error('Huella de QR invalida.');
  if (item.metodo === 'QR' && (typeof item.qrToken !== 'string' || !item.qrToken.trim())) throw new Error('Falta la credencial QR para sincronizar.');
  if (!Number.isFinite(item.fechaCreacion) || item.fechaCreacion <= 0) throw new Error('Fecha de verificacion invalida.');
}

export const intentoExamenPendienteRepo = {
  async guardar(item) {
    validarIntentoPendiente(item);
    // La credencial solo se conserva mientras el rechazo este pendiente o en revision.
    const registro = {
      clientUuid: item.clientUuid, operadorId: Number(item.operadorId),
      asignaturaControl: Number(item.asignaturaControl), examenControl: Number(item.examenControl),
      ambienteControl: Number(item.ambienteControl), estudianteSis: Number(item.estudianteSis),
      asignaturaDestino: Number(item.asignaturaDestino), examenDestino: Number(item.examenDestino),
      ambienteDestino: Number(item.ambienteDestino),
      metodo: item.metodo, qrHash: item.metodo === 'QR' ? item.qrHash : null,
      qrToken: item.metodo === 'QR' ? item.qrToken.trim() : null,
      fechaCreacion: item.fechaCreacion, estado: 'pendiente',
    };
    await db.transaction('rw', db.intentos_examen_pendientes, async () => {
      const previo = await db.intentos_examen_pendientes.get(registro.clientUuid);
      if (previo) {
        const campos = ['operadorId', 'asignaturaControl', 'examenControl', 'ambienteControl', 'estudianteSis', 'asignaturaDestino', 'examenDestino', 'ambienteDestino', 'metodo', 'qrHash', 'fechaCreacion'];
        if (campos.some((k) => previo[k] !== registro[k])) throw new Error('El identificador ya pertenece a otra verificacion.');
        return;
      }
      await db.intentos_examen_pendientes.add(registro);
    });
    return registro.clientUuid;
  },

  async pendientes(operadorId) {
    const id = Number(operadorId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Operador invalido.');
    return db.intentos_examen_pendientes.where('operadorId').equals(id)
      .filter((item) => item.estado === 'pendiente').sortBy('fechaCreacion');
  },

  async confirmar(clientUuid, operadorId) {
    return db.transaction('rw', db.intentos_examen_pendientes, async () => {
      const item = await db.intentos_examen_pendientes.get(clientUuid);
      if (!item || item.operadorId !== Number(operadorId)) throw new Error('Intento no disponible para este operador.');
      if (item.estado === 'pendiente') {
        await db.intentos_examen_pendientes.update(clientUuid, { estado: 'sincronizado', confirmadoEn: Date.now(), qrToken: null });
      }
    });
  },

  async marcarRevision(clientUuid, operadorId) {
    return db.transaction('rw', db.intentos_examen_pendientes, async () => {
      const item = await db.intentos_examen_pendientes.get(clientUuid);
      if (!item || item.operadorId !== Number(operadorId)) throw new Error('Intento no disponible para este operador.');
      if (item.estado === 'pendiente') await db.intentos_examen_pendientes.update(clientUuid, { estado: 'revision' });
    });
  },

  async reintentarRevision(clientUuid, operadorId) {
    return db.transaction('rw', db.intentos_examen_pendientes, async () => {
      const item = await db.intentos_examen_pendientes.get(clientUuid);
      if (!item || item.operadorId !== Number(operadorId)) throw new Error('Intento no disponible para este operador.');
      if (item.estado === 'revision') await db.intentos_examen_pendientes.update(clientUuid, { estado: 'pendiente' });
    });
  },
};
