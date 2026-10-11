import { useState, useCallback, useRef, useEffect } from "react";
import usePolling from "./usePolling";
import { listarIncidencias, obtenerAmbientesDelDia } from "../services/incidenciaService";
import { obtenerLlegadas, esEndpointNoDisponible } from "../services/monitoreoService";
import { normalizarLlegadas } from "../components/monitoreo/utilidadesMonitoreo";

/**
 * useExtrasExamen.js · HU10
 * Datos que acompañan al tablero y que se consultan en paralelo, cada uno con su
 * propio fallo (si uno falla, el resto del dashboard sigue):
 *   - incidencias del examen      → endpoint REAL de la HU06 (GET /api/incidencias)
 *   - aulas con ingreso cerrado   → endpoint REAL de la HU06 (GET /api/incidencias/ambientes)
 *   - curva de llegada            → endpoint PROPUESTO de la HU10 (puede no existir aún)
 */
export default function useExtrasExamen(examen, boolActivo) {
    const idExamen = examen?.idExamen ?? null;
    const strFecha = examen?.fechaExamen ?? null;

    const [incidencias, setIncidencias] = useState(null); // { lista, abiertas, altas, porAula } | null
    const [cierres, setCierres] = useState({}); // idAmbiente → { cerrado, motivo }
    const [llegadas, setLlegadas] = useState({ estado: "cargando", datos: [] }); // cargando | ok | noDisponible | error
    const refId = useRef(null);

    // Al cambiar de examen se parte de cero (no mezclar datos de otro examen)
    useEffect(() => {
        refId.current = idExamen;
        setIncidencias(null);
        setCierres({});
        setLlegadas({ estado: "cargando", datos: [] });
    }, [idExamen]);

    const fnActualizar = useCallback(async () => {
        const id = refId.current;
        if (!id) return;
        const [rInc, rAmb, rLleg] = await Promise.allSettled([
            listarIncidencias({ idExamen: id }),
            obtenerAmbientesDelDia(strFecha),
            obtenerLlegadas(id, 5),
        ]);
        if (refId.current !== id) return; // cambió de examen mientras cargaba

        if (rInc.status === "fulfilled") {
            const lista = (rInc.value?.incidencias || []).filter((i) => i.estado !== "CERRADA");
            const porAula = {};
            lista.forEach((i) => {
                const a = (porAula[i.idAmbiente] ||= { abiertas: 0, altas: 0 });
                a.abiertas += 1;
                if (i.severidad === "ALTA") a.altas += 1;
            });
            setIncidencias({ lista, abiertas: lista.length, altas: lista.filter((i) => i.severidad === "ALTA").length, porAula });
        }
        if (rAmb.status === "fulfilled" && Array.isArray(rAmb.value)) {
            const mapa = {};
            rAmb.value
                .filter((a) => a.idExamen === id)
                .forEach((a) => {
                    mapa[a.idAmbiente] = { cerrado: Boolean(a.ingresoCerrado), motivo: a.motivoCierre || null };
                });
            setCierres(mapa);
        }
        if (rLleg.status === "fulfilled") {
            setLlegadas({ estado: "ok", datos: normalizarLlegadas(rLleg.value) });
        } else if (esEndpointNoDisponible(rLleg.reason)) {
            setLlegadas({ estado: "noDisponible", datos: [] });
        } else {
            setLlegadas((prev) => ({ ...prev, estado: prev.datos.length ? "ok" : "error" }));
        }
    }, [strFecha]);

    usePolling(fnActualizar, 15000, { boolActivo: boolActivo && Boolean(idExamen), clave: idExamen });

    /** Refleja un cierre/reapertura al instante y confirma con el servidor. */
    const aplicarCierre = useCallback(
        (idAmbiente, boolCerrado) => {
            setCierres((prev) => ({ ...prev, [idAmbiente]: { cerrado: boolCerrado, motivo: null } }));
            fnActualizar();
        },
        [fnActualizar]
    );

    return { incidencias, cierres, llegadas, aplicarCierre, recargar: fnActualizar };
}