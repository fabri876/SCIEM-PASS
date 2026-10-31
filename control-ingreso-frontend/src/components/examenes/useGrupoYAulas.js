// Lógica compartida del formulario de examen (docente y admin):
// - useGruposDocente: grupos que el docente dicta en la asignatura (si es uno solo, se elige solo).
// - useAulasOcupadas: aulas con otro examen que se cruza en la fecha y horario elegidos.
import { useEffect, useState } from "react";
import { obtenerGruposDocenteAsignatura, obtenerAulasOcupadas } from "../../services/grupoExamenService";

export function useGruposDocente(idAsignatura, idUsuarioDocente, idGrupoInicial = "") {
    const [arrGrupos, setArrGrupos] = useState([]);
    const [boolCargandoGrupos, setBoolCargandoGrupos] = useState(false);
    const [idGrupo, setIdGrupo] = useState(idGrupoInicial ? String(idGrupoInicial) : "");

    useEffect(() => {
        if (!idAsignatura || !idUsuarioDocente) {
            setArrGrupos([]);
            return undefined;
        }
        let boolVigente = true;
        setBoolCargandoGrupos(true);
        obtenerGruposDocenteAsignatura(idAsignatura, idUsuarioDocente)
            .then((grupos) => {
                if (!boolVigente) return;
                setArrGrupos(grupos);
                setIdGrupo((actual) => {
                    if (actual && grupos.some((g) => String(g.idGrupo) === String(actual))) return actual;
                    if (idGrupoInicial && grupos.some((g) => String(g.idGrupo) === String(idGrupoInicial))) return String(idGrupoInicial);
                    return grupos.length === 1 ? String(grupos[0].idGrupo) : "";
                });
            })
            .catch(() => boolVigente && setArrGrupos([]))
            .finally(() => boolVigente && setBoolCargandoGrupos(false));
        return () => { boolVigente = false; };
    }, [idAsignatura, idUsuarioDocente, idGrupoInicial]);

    return { arrGrupos, boolCargandoGrupos, idGrupo, setIdGrupo };
}

// "Grupo 2" o "2" → "Grupo 2"
export function textoGrupo(grupo) {
    const str = String(grupo?.nombreGrupo ?? "").trim();
    if (!str) return `Grupo ${grupo?.idGrupo ?? ""}`.trim();
    return /^grupo/i.test(str) ? str : `Grupo ${str}`;
}

// Devuelve un Map idAula → { horaInicio, horaFin } con las aulas ocupadas.
// Si el backend todavía no tiene el endpoint, el Map queda vacío y no se bloquea nada.
export function useAulasOcupadas({ fecha, horaInicio, horaFin, idExamenExcluir }) {
    const [mapOcupadas, setMapOcupadas] = useState(() => new Map());

    useEffect(() => {
        if (!fecha || !horaInicio || !horaFin || horaFin <= horaInicio) {
            setMapOcupadas(new Map());
            return undefined;
        }
        let boolVigente = true;
        const t = setTimeout(() => {
            obtenerAulasOcupadas({
                fecha,
                horaInicio: String(horaInicio).slice(0, 5),
                horaFin: String(horaFin).slice(0, 5),
                idExamenExcluir,
            }).then((lista) => {
                if (!boolVigente) return;
                const map = new Map();
                (lista || []).forEach((a) => map.set(Number(a.idAula), {
                    horaInicio: String(a.horaInicio || "").slice(0, 5),
                    horaFin: String(a.horaFin || "").slice(0, 5),
                }));
                setMapOcupadas(map);
            });
        }, 300);
        return () => { boolVigente = false; clearTimeout(t); };
    }, [fecha, horaInicio, horaFin, idExamenExcluir]);

    return mapOcupadas;
}
