/**
 * asignacionOperadoresService.js
 *
 * Asignación de operadores por aula de un examen (la hace el docente).
 *
 * CONTRATO PARA BACKEND (pendiente de implementar por Diego). Hasta que
 * existan estos endpoints, la pantalla funciona pero muestra el aviso de que
 * el servicio no está disponible y no guarda nada:
 *
 *  GET  /api/examenes/{idExamen}/operadores-disponibles
 *       -> [{ idUsuario, nombre, apellido }]
 *       Operadores (ayudantes) de los grupos del docente en la asignatura
 *       del examen (los que él registró).
 *
 *  GET  /api/examenes/{idExamen}/asignacion-ingreso
 *       -> 404/204 si aún no hay asignación, o
 *          { modoReparto: "EQUILIBRADO"|"MANUAL",
 *            aulas: [{ idAmbiente, cantidad }],
 *            responsables: [{ idAmbiente, idUsuario, rol: "DOCENTE"|"OPERADOR",
 *                             nombreResponsable, apellidoDesde, apellidoHasta }] }
 *
 *  PUT  /api/examenes/{idExamen}/asignacion-ingreso
 *       body = { modoReparto, aulas: [{ idAmbiente, cantidad }],
 *                responsables: [{ idAmbiente, idUsuario, rol, nombreResponsable,
 *                                 apellidoDesde, apellidoHasta,
 *                                 codSisEstudiantes: [..] }] }
 *       Solo se acepta antes de que empiece el examen. Guarda a qué aula va
 *       cada estudiante y qué responsable lo atiende.
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken } from "./authService";

function construirHeaders() {
    const strToken = obtenerToken();
    return {
        "Content-Type": "application/json",
        ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
    };
}

export async function obtenerOperadoresDisponibles(idExamen) {
    const response = await fetch(`${strApiBaseUrl}/api/examenes/${idExamen}/operadores-disponibles`, {
        headers: construirHeaders(),
    });
    if (!response.ok) {
        throw new Error("No se pudieron obtener tus operadores.");
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

/** Devuelve la asignación guardada o null si todavía no existe. */
export async function obtenerAsignacionIngreso(idExamen) {
    const response = await fetch(`${strApiBaseUrl}/api/examenes/${idExamen}/asignacion-ingreso`, {
        headers: construirHeaders(),
    });
    if (response.status === 404 || response.status === 204) return null;
    if (!response.ok) {
        throw new Error("No se pudo obtener la asignación de operadores.");
    }
    return response.json();
}

export async function guardarAsignacionIngreso(idExamen, objAsignacion) {
    const response = await fetch(`${strApiBaseUrl}/api/examenes/${idExamen}/asignacion-ingreso`, {
        method: "PUT",
        headers: construirHeaders(),
        body: JSON.stringify(objAsignacion),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
            err.mensaje ||
            (response.status === 404
                ? "El servidor aún no tiene habilitado el guardado de operadores."
                : "No se pudo guardar la asignación.")
        );
    }
    return response.status === 204 ? null : response.json();
}
