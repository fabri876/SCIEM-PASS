// Rango de apellidos guardado en el equipo para el usuario actual (sin internet).
// Sirve para el docente que se asignó a sí mismo como responsable en "Asignar ayudantes":
// sin internet ve su tramo (franja y "Mi lista"), igual que un ayudante.
// Solo LEE la tabla de asignaciones que descarga el modo sin conexión (HU07); no cambia nada.
import { useEffect, useState } from "react";
import { asignacionRepo } from "../../../offline";
import { obtenerUsuarioActual } from "../../../services/authService";

export default function useRangoLocal(idExamen, idAmbiente, boolActivo) {
  const [objRango, setObjRango] = useState(null);

  useEffect(() => {
    const exId = Number(idExamen);
    if (!boolActivo || !Number.isInteger(exId) || exId <= 0) {
      setObjRango(null);
      return undefined;
    }
    let boolVivo = true;
    (async () => {
      try {
        const usuario = obtenerUsuarioActual();
        const idUsuario = usuario?.idUsuario ?? usuario?.idusuario ?? usuario?.id;
        const asignacion = await asignacionRepo.obtenerRangoOperador(exId, idUsuario, idAmbiente ?? null);
        const boolTramo = asignacion && asignacion.modoAsignacion === "SUBDIVISION" && asignacion.apellidoDesde && asignacion.apellidoHasta;
        if (boolVivo) setObjRango(boolTramo ? { desde: asignacion.apellidoDesde, hasta: asignacion.apellidoHasta } : null);
      } catch {
        if (boolVivo) setObjRango(null);
      }
    })();
    return () => { boolVivo = false; };
  }, [idExamen, idAmbiente, boolActivo]);

  return objRango;
}
