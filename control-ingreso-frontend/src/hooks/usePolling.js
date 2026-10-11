import { useEffect, useRef } from "react";

/**
 * usePolling.js · HU10 (CA-04)
 *
 * Ejecuta fnTarea al montar y luego cada intMs milisegundos. Con la pestaña
 * oculta NO consulta (ahorra red y no llena el servidor); al volver a verla
 * actualiza de inmediato.
 *
 *   usePolling(fnActualizar, 15000, { boolActivo: !!idExamen, clave: idExamen });
 *
 * - boolActivo: false pausa el polling (p. ej. todavía no hay examen elegido).
 * - clave: cuando cambia (otro examen) se reinicia el ciclo y se consulta ya.
 */
export default function usePolling(fnTarea, intMs = 15000, { boolActivo = true, clave = null } = {}) {
    const refTarea = useRef(fnTarea);
    useEffect(() => {
        refTarea.current = fnTarea;
    });

    useEffect(() => {
        if (!boolActivo) return undefined;

        refTarea.current();
        const idIntervalo = setInterval(() => {
            if (!document.hidden) refTarea.current();
        }, intMs);
        const alCambiarVisibilidad = () => {
            if (!document.hidden) refTarea.current();
        };
        document.addEventListener("visibilitychange", alCambiarVisibilidad);

        return () => {
            clearInterval(idIntervalo);
            document.removeEventListener("visibilitychange", alCambiarVisibilidad);
        };
    }, [intMs, boolActivo, clave]);
}