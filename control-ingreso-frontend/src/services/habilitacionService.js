/**
 * habilitacionService.js
 *
 * Funciones para interactuar con los endpoints de habilitación y motivos
 * de inhabilitación del backend en Spring Boot.
 */
import { strApiBaseUrl } from "./apiConfig";

/**
 * Obtiene la lista de habilitaciones desde el backend, opcionalmente filtrada por idAsignatura.
 */
export async function obtenerHabilitaciones(idAsignatura) {
    try {
        const url = idAsignatura
            ? `${strApiBaseUrl}/api/habilitaciones?idAsignatura=${idAsignatura}`
            : `${strApiBaseUrl}/api/habilitaciones`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.mensaje || `Error ${response.status}: No se pudo obtener la lista de habilitaciones`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en obtenerHabilitaciones:", error);
        throw error;
    }
}

/**
 * Obtiene el catálogo de motivos de inhabilitación.
 */
export async function obtenerMotivosInhabilitacion() {
    try {
        const response = await fetch(`${strApiBaseUrl}/api/motivos-inhabilitacion`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudieron cargar los motivos`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en obtenerMotivosInhabilitacion:", error);
        throw error;
    }
}

/**
 * Registra un nuevo motivo de inhabilitación en el backend.
 */
export async function crearMotivoInhabilitacion({ nombreMotivo, descripcionMotivo }) {
    try {
        const response = await fetch(`${strApiBaseUrl}/api/motivos-inhabilitacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombreMotivo: nombreMotivo.trim(),
                descripcionMotivo: descripcionMotivo ? descripcionMotivo.trim() : null
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.mensaje || 'Error al registrar el motivo en el servidor.');
        }

        return await response.json();
    } catch (error) {
        console.error("Error en crearMotivoInhabilitacion:", error);
        throw error;
    }
}

/**
 * Actualiza el estado de habilitación u observación de un estudiante por su idHabilitacion.
 */
export async function actualizarHabilitacion(idHabilitacion, { estadoHabilitacion, observacionHabilitacion, idMotivo }) {
    try {
        const response = await fetch(`${strApiBaseUrl}/api/habilitaciones/${idHabilitacion}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                estadoHabilitacion,
                observacionHabilitacion: estadoHabilitacion ? null : (observacionHabilitacion || null),
                idMotivo
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.mensaje || `Error ${response.status}: No se pudo actualizar la habilitación`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error en actualizarHabilitacion:", error);
        throw error;
    }
}

