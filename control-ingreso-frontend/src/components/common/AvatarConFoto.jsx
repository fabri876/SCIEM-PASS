import { useState, useEffect } from "react";
import { obtenerToken } from "../../services/authService";
import { strApiBaseUrl } from "../../services/apiConfig";
import { fotoRepo } from "../../offline/fotoRepo";

/**
 * Muestra la foto biométrica del estudiante (fetch autenticado con JWT).
 * Si falla, renderiza el fallback (iniciales).
 *
 * Props:
 *  - idUsuario: Integer — id del usuario cuya foto se busca
 *  - className: string  — clases Tailwind del contenedor <div>
 *  - fallback: ReactNode — qué mostrar si no hay foto (iniciales, etc.)
 */
export default function AvatarConFoto({ idUsuario, codigoSis, className, fallback }) {
  const [foto, setFoto] = useState(null); // { clave, url }
  const clave = `${idUsuario ?? ''}|${codigoSis ?? ''}`;

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
      if (codigoSis) {
        try { mostrar((await fotoRepo.obtenerFoto(codigoSis))?.blob); } catch { /* sin copia local */ }
      }
      if (!idUsuario) return;
      try {
        const respuesta = await fetch(`${strApiBaseUrl}/api/face/enrollment/${idUsuario}/foto`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!respuesta.ok) return;
        const blob = await respuesta.blob();
        mostrar(blob);
        if (codigoSis) await fotoRepo.guardarMiniatura(codigoSis, blob);
      } catch { /* La copia local se conserva si la red falla. */ }
    }
    cargar();

    return () => {
      cancelado = true;
      if (urlActual) URL.revokeObjectURL(urlActual);
    };
  }, [clave, idUsuario, codigoSis]);

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
