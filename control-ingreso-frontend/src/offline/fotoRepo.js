import { db } from './db.js';

function base64ABlob(base64, tipoFallback = 'image/jpeg') {
  if (base64 instanceof Blob) return base64;
  const partes = String(base64).split(',');
  const mime = partes.length > 1 ? (partes[0].match(/:(.*?);/) || [])[1] : tipoFallback;
  const raw = atob(partes.length > 1 ? partes[1] : partes[0]);
  const u8arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    u8arr[i] = raw.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime || tipoFallback });
}

export const fotoRepo = {
  /**
   * Guarda un lote de fotos en IndexedDB.
   * Omite y contabiliza ítems sin blob ni base64 o con error de conversión.
   * Retorna { guardadas, omitidas }.
   */
  async guardarFotos(lote) {
    if (!Array.isArray(lote) || lote.length === 0) {
      return { guardadas: 0, omitidas: 0 };
    }
    const ahoraIso = new Date().toISOString();
    let omitidas = 0;
    const aGuardar = [];

    for (const item of lote) {
      if (!item || (!item.blob && !item.base64)) {
        omitidas++;
        continue;
      }
      const sis = String(item.codigoSis || '').trim();
      if (!sis) {
        omitidas++;
        continue;
      }

      try {
        const blob = item.blob instanceof Blob ? item.blob : base64ABlob(item.base64, item.tipo);
        aGuardar.push({
          codigoSis: sis,
          blob,
          tipo: blob.type || item.tipo || 'image/jpeg',
          actualizadoEn: ahoraIso
        });
      } catch (errConv) {
        console.warn(`[fotoRepo.guardarFotos] Error al procesar imagen para SIS ${sis}:`, errConv);
        omitidas++;
      }
    }

    if (aGuardar.length > 0) {
      await db.fotos.bulkPut(aGuardar);
    }
    return { guardadas: aGuardar.length, omitidas };
  },

  /**
   * Obtiene la foto de un estudiante por su código SIS.
   */
  async obtenerFoto(codigoSis) {
    const sis = String(codigoSis).trim();
    if (!sis) return null;
    return await db.fotos.get(sis);
  },

  /**
   * Retorna el número total de fotos almacenadas.
   */
  async contarFotos() {
    return await db.fotos.count();
  },

  /** Cuenta solo las fotos cuyos SIS pertenecen a la nómina indicada. */
  async contarFotosDeNomina(examenId) {
    const exId = Number(examenId);
    if (!Number.isInteger(exId) || exId <= 0) return 0;
    const nomina = await db.nominas.where('examenId').equals(exId).toArray();
    const sis = new Set(nomina.map((item) => String(item.codigoSis || '').trim()));
    const claves = await db.fotos.toCollection().primaryKeys();
    return claves.filter((codigo) => sis.has(String(codigo))).length;
  },

  /** Guarda la versión reducida de una foto obtenida individualmente online. */
  async guardarMiniatura(codigoSis, blob) {
    const sis = String(codigoSis || '').trim();
    if (!sis || !(blob instanceof Blob)) return { guardadas: 0, omitidas: 1 };
    let miniatura = blob;
    try {
      const bitmap = await createImageBitmap(blob);
      const escala = Math.min(1, 160 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      const contexto = canvas.getContext('2d');
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, canvas.width, canvas.height);
      contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      miniatura = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!miniatura) miniatura = blob;
    } catch {
      // Algunos WebViews no soportan createImageBitmap; conservar la foto recibida.
    }
    return this.guardarFotos([{ codigoSis: sis, blob: miniatura, tipo: miniatura.type || 'image/jpeg' }]);
  },

  /**
   * Elimina fotos que ya no pertenezcan a ninguna nómina local activa.
   * Extrae el código SIS de la clave compuesta [examenId, codigoSis].
   */
  async limpiarFotosSinNomina() {
    const clavesPrimarias = await db.nominas.toCollection().primaryKeys();
    const codigosEnNomina = new Set(clavesPrimarias.map((k) => k[1]));
    const fotosGuardadas = await db.fotos.toCollection().primaryKeys();

    const huerfanas = fotosGuardadas.filter((sis) => !codigosEnNomina.has(sis));
    if (huerfanas.length > 0) {
      await db.fotos.bulkDelete(huerfanas);
    }
    return huerfanas.length;
  }
};
