import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken } from "./authService";

/**
 * examenService.js
 *
 * Confirmado contra el codigo real de Neil, mas la guia actualizada
 * del 19-sep con el catalogo de tipos de examen.
 */

function construirHeaders() {
    const strToken = obtenerToken();
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${strToken}`,
    };
}

export async function registrarExamen(objExamen) {
    const response = await fetch(`${strApiBaseUrl}/api/examenes`, {
        method: "POST",
        headers: construirHeaders(),
        body: JSON.stringify(objExamen),
    });

    if (!response.ok) {
        const objError = await response.json().catch(() => null);
        throw new Error(objError?.mensaje || "No se pudo registrar el examen");
    }

    return response.json();
}

export async function obtenerAsignaturasPorDocente(idUsuario, codsisDocente) {
    const params = new URLSearchParams({ idUsuario, codsisDocente });
    const response = await fetch(`${strApiBaseUrl}/api/asignaturas/por-docente?${params}`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudieron obtener las asignaturas");
    }

    return response.json();
}

export async function obtenerHorariosRegulares(idUsuario, codsisDocente, idAsignatura) {
    const params = new URLSearchParams({ idUsuario, codsisDocente, idAsignatura });
    const response = await fetch(`${strApiBaseUrl}/api/horarios-regulares?${params}`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudieron obtener los horarios regulares");
    }

    return response.json();
}

export async function obtenerAulas() {
    const response = await fetch(`${strApiBaseUrl}/api/aulas`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudieron obtener las aulas");
    }

    return response.json();
}

export async function obtenerNormasGenerales() {
    const response = await fetch(`${strApiBaseUrl}/api/normas-generales`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudieron obtener las normas generales");
    }

    return response.json();
}

// NUEVO: catálogo de tipos de examen (Primer Parcial, Segundo Parcial,
// Examen Final, Segunda Instancia, Otro). Cada uno trae
// "requiereDescripcion" para saber si hay que pedir el campo de texto.
export async function obtenerTiposExamen() {
    const response = await fetch(`${strApiBaseUrl}/api/tipos-examen`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudieron obtener los tipos de examen");
    }

    return response.json();
}