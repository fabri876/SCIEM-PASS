import { useState, useEffect } from "react";
import { obtenerToken } from "../../services/authService";
import { strApiBaseUrl } from "../../services/apiConfig";
import { fotoRepo } from "../../offline/fotoRepo";

// Evita reintentos inmediatos para una foto que el servidor ya confirmó ausente.
// Es temporal: si el estudiante se enrola, una recarga normal vuelve a consultarla.
const fotosNoEncontradasHasta = new Map();
const DURACION_AUSENCIA_MS = 30_000;

/**
 * Muestra la foto biométrica del estudiante (fetch autenticado con JWT).
 * Si falla, renderiza el fallback (iniciales).
 *
 * Props:
 *  - idUsuario: Integer — id del usuario cuya foto se busca
 *  - idExamen: Integer — contexto académico requerido para docente u operador
 *  - className: string  — clases Tailwind del contenedor <div>
 *  - fallback: ReactNode — qué mostrar si no hay foto (iniciales, etc.)
 */
export default function AvatarConFoto({ idUsuario, codigoSis, idExamen, className, fallback }) {
  const [foto, setFoto] = useState(null); // { clave, url }
  const clave = `${idUsuario ?? ''}|${codigoSis ?? ''}|${idExamen ?? ''}`;

  useEffect(() => {
    let cancelado = false;
    let urlActual = null;
    const mostrar = (blob) => {
      if (cancelado || !(blob instanceof Blob)) return;
      if (urlActual) URL.revokeObjectURL(urlActual);
      urlActual = URL.createObjectURL(blob);
      setFoto({ clave, url: urlActual });
    };
    const token = obtenerToken();
    async function cargar() {
      if (!idUsuario) {
        if (codigoSis) {
          try { mostrar((await fotoRepo.obtenerFoto(codigoSis))?.blob); } catch { /* sin copia local */ }
        }
        return;
      }
      const sinFotoHasta = fotosNoEncontradasHasta.get(idUsuario);
      if (sinFotoHasta && sinFotoHasta > Date.now()) return;
      try {
        const params = new URLSearchParams();
        if (idExamen != null) params.set("idExamen", String(idExamen));
        const respuesta = await fetch(`${strApiBaseUrl}/api/face/enrollment/${idUsuario}/foto${params.size ? `?${params}` : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!respuesta.ok) {
          // Un 404 confirma que la foto se eliminó del servidor: no mantener
          // una miniatura biométrica antigua en IndexedDB.
          if (respuesta.status === 404) {
            fotosNoEncontradasHasta.set(idUsuario, Date.now() + DURACION_AUSENCIA_MS);
            if (codigoSis) await fotoRepo.eliminarFoto(codigoSis);
          }
          return;
        }
        const blob = await respuesta.blob();
        fotosNoEncontradasHasta.delete(idUsuario);
        mostrar(blob);
        if (codigoSis) await fotoRepo.guardarMiniatura(codigoSis, blob);
      } catch {
        // Sin red, la copia local permite seguir operando offline.
        if (codigoSis) {
          try { mostrar((await fotoRepo.obtenerFoto(codigoSis))?.blob); } catch { /* sin copia local */ }
        }
      }
    }
    cargar();

    return () => {
      cancelado = true;
      if (urlActual) URL.revokeObjectURL(urlActual);
    };
  }, [clave, idUsuario, codigoSis, idExamen]);

  const objectUrl = foto && foto.clave === clave ? foto.url : null;

  return (
    <div className={className}>
      {objectUrl ? (
        <img src={objectUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        fallback
      )}
    </div>
  );
}
