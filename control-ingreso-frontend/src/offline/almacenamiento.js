/**
 * Verifica la cuota y uso de almacenamiento disponible en el navegador.
 */
export async function verificarAlmacenamiento() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return { disponible: false };
  }

  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const libreBytes = Math.max(0, quota - usage);

    const toMB = (bytes) => Math.round((bytes / (1024 * 1024)) * 100) / 100;
    const libreMB = toMB(libreBytes);

    return {
      disponible: true,
      usadoMB: toMB(usage),
      cuotaMB: toMB(quota),
      libreMB,
      critico: libreMB < 50
    };
  } catch (error) {
    console.warn('[almacenamiento] Error al estimar almacenamiento:', error);
    return { disponible: false };
  }
}

/**
 * Solicita al navegador que no purgue los datos de IndexedDB bajo presión de espacio.
 */
export async function solicitarPersistencia() {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.persist !== 'function'
  ) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch (error) {
    console.warn('[almacenamiento] Error al solicitar persistencia:', error);
    return false;
  }
}
