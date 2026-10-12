/**
 * habilitacionService.js
 *
 * Funciones para interactuar con los endpoints de habilitación y motivos
 * de inhabilitación del backend en Spring Boot.
 *
 * TC-217 (QA): estas rutas eran públicas y estas funciones nunca mandaban
 * el token — al asegurarlas en SecurityConfig.java, hay que mandar
 * Authorization acá también (mismo patrón fetchAutenticado que ya usan
 * adminService.js/usuarioService.js; se copia en vez de importar para no
 * crear una dependencia circular entre services).
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

async function fetchAutenticado(strRuta, objOpciones = {}) {
    const strToken = obtenerToken();

    const response = await fetch(`${strApiBaseUrl}${strRuta}`, {
        ...objOpciones,
        headers: {
            "Content-Type": "application/json",
            ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
            ...(objOpciones.headers || {}),
        },
    });

    if (response.status === 401) {
        cerrarSesion();
        sessionStorage.setItem(
            "mensajeSesion",
            "Sesión expirada. Por favor, inicia sesión nuevamente."
        );
        window.location.href = "/login";
        throw new Error("Sesión expirada.");
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Error ${response.status}: no se pudo completar la operación.`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

/**
 * Obtiene la lista de habilitaciones desde el backend, opcionalmente filtrada por idAsignatura.
 */
export async function obtenerHabilitaciones(idAsignatura) {
    const strRuta = idAsignatura
        ? `/api/habilitaciones?idAsignatura=${idAsignatura}`
        : `/api/habilitaciones`;
    return fetchAutenticado(strRuta);
}

/**
 * Obtiene el catálogo de motivos de inhabilitación.
 */
export async function obtenerMotivosInhabilitacion() {
    return fetchAutenticado(`/api/motivos-inhabilitacion`);
}

/**
 * Registra un nuevo motivo de inhabilitación en el backend.
 */
export async function crearMotivoInhabilitacion({ nombreMotivo, descripcionMotivo }) {
    return fetchAutenticado(`/api/motivos-inhabilitacion`, {
        method: "POST",
        body: JSON.stringify({
            nombreMotivo: nombreMotivo.trim(),
            descripcionMotivo: descripcionMotivo ? descripcionMotivo.trim() : null,
        }),
    });
}

/**
 * BUG-007 (QA): descarga real de la lista oficial en Excel (antes el botón
 * era decorativo). Devuelve el Blob del archivo — el componente que llama
 * es responsable de disparar la descarga en el navegador.
 */
export async function exportarListaOficial(idAsignatura) {
    const strToken = obtenerToken();
    const strRuta = idAsignatura
        ? `/api/habilitaciones/exportar?idAsignatura=${idAsignatura}`
        : `/api/habilitaciones/exportar`;

    const response = await fetch(`${strApiBaseUrl}${strRuta}`, {
        headers: strToken ? { Authorization: `Bearer ${strToken}` } : {},
    });

    if (response.status === 401) {
        cerrarSesion();
        sessionStorage.setItem(
            "mensajeSesion",
            "Sesión expirada. Por favor, inicia sesión nuevamente."
        );
        window.location.href = "/login";
        throw new Error("Sesión expirada.");
    }

    if (!response.ok) {
        throw new Error(`Error ${response.status}: no se pudo generar la lista oficial.`);
    }

    return response.blob();
}

/**
 * Actualiza el estado de habilitación u observación de un estudiante por su idHabilitacion.
 */
export async function actualizarHabilitacion(idHabilitacion, { estadoHabilitacion, observacionHabilitacion, idMotivo }) {
    return fetchAutenticado(`/api/habilitaciones/${idHabilitacion}`, {
        method: "PUT",
        body: JSON.stringify({
            estadoHabilitacion,
            observacionHabilitacion: estadoHabilitacion ? null : (observacionHabilitacion || null),
            idMotivo,
        }),
    });
}

export async function asociarEstudianteAExamen({ codigoSis, idAsignatura, idExamen, habilitado = true, observacion = null }) {
    return fetchAutenticado('/api/habilitaciones/asociar-examen', {
        method: 'POST',
        body: JSON.stringify({ codigoSis: Number(codigoSis), idAsignatura, idExamen, habilitado, observacion }),
    });
}
