import { obtenerUsuarioActual } from "../services/authService";
import { obtenerPaqueteExamen } from "../services/facialService";
import { pinService } from "./pinService";
import {
  inicializarFacialSqlite,
  purgarPaqueteFacial,
  guardarPaqueteHabilitados,
} from "./facialSqliteDb";

// La nómina se puede descargar el día anterior; 24 h evita que el paquete
// facial venza antes del examen sin dejar una ventana demasiado larga.
const VIGENCIA_MS = 24 * 3600000;

/**
 * Descarga el paquete facial del examen y reemplaza solo ese examen en la base
 * local. Se llama junto con la descarga de la nómina; si falla, la nómina sigue
 * siendo válida y el paquete se puede recuperar volviendo a descargarla.
 */
export async function descargarPaqueteFacial(idExamen) {
  const exId = Number(idExamen);
  if (!Number.isInteger(exId) || exId <= 0) {
    throw new Error("Examen inválido para descargar el paquete facial.");
  }

  const usuario = obtenerUsuarioActual();
  const idOperador = usuario?.idUsuario ?? usuario?.idusuario;
  const passphrase = idOperador ? await pinService.obtenerPinHash(idOperador) : null;

  await inicializarFacialSqlite({ passphrase });
  const estudiantes = await obtenerPaqueteExamen(exId);
  const expiraEn = new Date(Date.now() + VIGENCIA_MS).toISOString();

  await purgarPaqueteFacial(exId);
  await guardarPaqueteHabilitados(estudiantes, expiraEn, exId);

  return {
    total: Array.isArray(estudiantes) ? estudiantes.length : 0,
    expiraEn,
  };
}
