// Grupo del examen y aulas ocupadas (registro de exámenes, HU02).
// - Grupos del docente en una asignatura: endpoint que ya existe.
// - Tipos usados por grupo y aulas ocupadas: dependen del backend (guía para Diego).
//   Mientras no existan, estas funciones devuelven null y el formulario funciona como antes.
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken } from "./authService";

function construirHeaders() {
    const strToken = obtenerToken();
    return {
        "Content-Type": "application/json",
        ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    };
}

// GET /api/grupos/asignaturas/{idAsignatura}/docentes/{idUsuarioDocente}
// → [{ idGrupo, nombreGrupo, ... }]
export async function obtenerGruposDocenteAsignatura(idAsignatura, idUsuarioDocente) {
    const response = await fetch(
        `${strApiBaseUrl}/api/grupos/asignaturas/${idAsignatura}/docentes/${idUsuarioDocente}`,
        { headers: construirHeaders() }
    );
    if (!response.ok) throw new Error("No se pudieron obtener los grupos del docente.");
    const data = await response.json();
    return (Array.isArray(data) ? data : []).filter((g) => g.estadoGrupo !== false);
}

// GET /api/examenes/tipos-usados?idAsignatura=&codsisDocente=&idGrupo=
// Mientras el backend no filtre por grupo, devuelve lo mismo que antes.
export async function obtenerTiposUsadosPorGrupo(idAsignatura, codsisDocente, idGrupo) {
    const params = new URLSearchParams();
    if (idAsignatura) params.set("idAsignatura", idAsignatura);
    if (codsisDocente) params.set("codsisDocente", codsisDocente);
    if (idGrupo) params.set("idGrupo", idGrupo);
    const response = await fetch(`${strApiBaseUrl}/api/examenes/tipos-usados?${params}`, {
        headers: construirHeaders(),
    });
    if (!response.ok) throw new Error("No se pudieron obtener los tipos de examen usados.");
    return response.json();
}

// GET /api/aulas/ocupadas?fecha=&horaInicio=&horaFin=&idExamenExcluir=
// → [{ idAula, nombreAula, horaInicio, horaFin }]
// Devuelve null si el endpoint todavía no existe (así no se marca ninguna aula).
export async function obtenerAulasOcupadas({ fecha, horaInicio, horaFin, idExamenExcluir }) {
    const params = new URLSearchParams({ fecha, horaInicio, horaFin });
    if (idExamenExcluir) params.set("idExamenExcluir", idExamenExcluir);
    try {
        const response = await fetch(`${strApiBaseUrl}/api/aulas/ocupadas?${params}`, {
            headers: construirHeaders(),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return Array.isArray(data) ? data : null;
    } catch {
        return null;
    }
}
