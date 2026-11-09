import { obtenerToken, obtenerUsuarioActual } from '../services/authService.js';
import { strApiBaseUrl } from '../services/apiConfig.js';
import { intentoExamenPendienteRepo } from './intentoExamenPendienteRepo.js';

let enCurso = false;

/** Los conflictos se conservan para revision; no se convierten en asistencias. */
export async function sincronizarIntentosExamen() {
  if (enCurso) return { omitido: true };
  if ((typeof navigator !== 'undefined' && navigator.onLine === false)
      || (typeof window !== 'undefined' && window.__sciemSinInternet)) return { omitido: true };
  const usuario = obtenerUsuarioActual();
  const operador = Number(usuario?.idUsuario);
  const token = obtenerToken();
  if (!Number.isSafeInteger(operador) || operador <= 0 || !token) return { omitido: true };
  enCurso = true;
  let sincronizados = 0;
  let revision = 0;
  try {
    const pendientes = await intentoExamenPendienteRepo.pendientes(operador);
    for (const item of pendientes) {
      if (Number(obtenerUsuarioActual()?.idUsuario) !== operador || obtenerToken() !== token) break;
      const { clientUuid, asignaturaControl, examenControl, ambienteControl, estudianteSis,
        asignaturaDestino, examenDestino, ambienteDestino, metodo, qrHash, qrToken, fechaCreacion } = item;
      let respuesta;
      const controller = new AbortController();
      const temporizador = setTimeout(() => controller.abort(), 20000);
      try {
        respuesta = await fetch(`${strApiBaseUrl}/api/sync/intentos-examen-incorrecto`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clientUuid, asignaturaControl, examenControl, ambienteControl, estudianteSis,
            asignaturaDestino, examenDestino, ambienteDestino, metodo, qrHash, qrToken, fechaCreacion }),
          signal: controller.signal,
        });
      } catch { break; } finally { clearTimeout(temporizador); }
      if (Number(obtenerUsuarioActual()?.idUsuario) !== operador || obtenerToken() !== token) break;
      if (respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        if (cuerpo?.registrado !== true || !Number.isInteger(cuerpo.idIntento)) break;
        await intentoExamenPendienteRepo.confirmar(clientUuid, operador);
        sincronizados++;
      } else if ([400, 403, 409, 422].includes(respuesta.status)) {
        await intentoExamenPendienteRepo.marcarRevision(clientUuid, operador);
        revision++;
      } else {
        // Sesion vencida, servidor no disponible o error inesperado: conservar para reintento.
        break;
      }
    }
    return { sincronizados, revision };
  } finally { enCurso = false; }
}
