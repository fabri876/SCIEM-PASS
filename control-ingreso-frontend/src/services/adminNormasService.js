
//adminNormasService.js

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
        const objError = await response.json().catch(() => null);
        throw new Error(objError?.mensaje || "Ocurrió un error al comunicarse con el servidor.");
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// Solo docentes activos (estado: true)
export async function obtenerDocentesAdmin(strBusqueda) {
    const params = new URLSearchParams();
    if (strBusqueda) params.set("busqueda", strBusqueda);
    const strQuery = params.toString() ? `?${params.toString()}` : "";
    return fetchAutenticado(`/api/admin/docentes${strQuery}`);
}

// Aulas asignadas a un examen puntual (principal + adicionales, si las hubo).
export async function obtenerAmbientesPorExamen(idExamen) {
    return fetchAutenticado(`/api/examenes/${idExamen}/ambientes`);
}

// Historial completo de normas particulares (todos los exámenes). Filtros
// opcionales: idAsignatura, idExamen.
export async function obtenerNormasParticularesAdmin({ idAsignatura, idExamen } = {}) {
    const params = new URLSearchParams();
    if (idAsignatura) params.set("idAsignatura", idAsignatura);
    if (idExamen) params.set("idExamen", idExamen);
    const strQuery = params.toString() ? `?${params.toString()}` : "";
    return fetchAutenticado(`/api/admin/normas-particulares${strQuery}`);
}

export async function crearNormaGeneralAdmin(strDescripcionNorma) {
    return fetchAutenticado("/api/admin/normas-generales", {
        method: "POST",
        body: JSON.stringify({ descripcionNorma: strDescripcionNorma }),
    });
}

// Copia el texto literal de una norma particular hacia una norma general
// nueva, y marca esa particular como promovida:true. 
export async function promoverNormaEspecificaAdmin(idNormaEspecifica) {
    return fetchAutenticado(`/api/admin/normas-generales/promover/${idNormaEspecifica}`, {
        method: "POST",
    });
}

export async function editarNormaGeneralAdmin(idNormaGeneral, strDescripcionNorma) {
    return fetchAutenticado(`/api/admin/normas-generales/${idNormaGeneral}`, {
        method: "PUT",
        body: JSON.stringify({ descripcionNorma: strDescripcionNorma }),
    });
}

export async function eliminarNormaGeneralAdmin(idNormaGeneral) {
    return fetchAutenticado(`/api/admin/normas-generales/${idNormaGeneral}`, {
        method: "DELETE",
    });
}