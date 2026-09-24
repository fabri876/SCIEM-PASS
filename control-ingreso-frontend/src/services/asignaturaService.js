import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken } from "./authService";

function construirHeaders() {
    const strToken = obtenerToken();
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${strToken}`,
    };
}

/**
 * Obtiene todas las asignaturas desde el backend (/api/asignaturas).
 */
export async function obtenerTodasAsignaturas() {
    try {
        const response = await fetch(`${strApiBaseUrl}/api/asignaturas`, {
            headers: construirHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudieron obtener las asignaturas`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en obtenerTodasAsignaturas:", error);
        throw error;
    }
}

/**
 * Obtiene el detalle del examen asociado a una asignatura (/api/examenes/por-asignatura/{idAsignatura}).
 */
export async function obtenerExamenPorAsignatura(idAsignatura) {
    try {
        const response = await fetch(`${strApiBaseUrl}/api/examenes/por-asignatura/${idAsignatura}`, {
            headers: construirHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener el examen de la asignatura`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en obtenerExamenPorAsignatura:", error);
        throw error;
    }
}
