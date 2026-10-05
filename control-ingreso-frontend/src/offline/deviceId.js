import { db } from './db.js';
import { generarUuid } from './uuid.js';

const CLAVE_DEVICE_ID = 'device_id';

/**
 * Obtiene el ID único de este dispositivo/navegador.
 * Si no existe, genera uno con generarUuid() y lo persiste en la tabla meta.
 */
export async function obtenerDeviceId() {
  const registro = await db.meta.get(CLAVE_DEVICE_ID);
  if (registro && registro.valor) {
    return registro.valor;
  }

  const nuevoId = generarUuid();
  await db.meta.put({ clave: CLAVE_DEVICE_ID, valor: nuevoId, creadoEn: new Date().toISOString() });
  return nuevoId;
}
