
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

// Solo docentes activos (estado: true). Distinto de listarUsuarios({rol:"DOCENTE"})
// de adminService.js, que trae todos los usuarios sin filtrar por estado.
export async function obtenerDocentesAdmin(strBusqueda) {
    const params = new URLSearchParams();
    if (strBusqueda) params.set("busqueda", strBusqueda);
    const strQuery = params.toString() ? `?${params.toString()}` : "";
    return fetchAutenticado(`/api/admin/docentes${strQuery}`);
}

// Aulas asignadas a un examen puntual (principal + adicionales, si las hubo).
// Ya viene con nombreAmbiente/ubicacionAmbiente/capacidadAmbiente poblados.
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

// BUG-006 (QA): el GET público (obtenerNormasGenerales en examenService.js)
// solo trae activas — este trae TODAS (activas e inactivas) para que el
// admin pueda ver y reactivar las desactivadas.
export async function listarTodasNormasGeneralesAdmin() {
    return fetchAutenticado("/api/admin/normas-generales");
}

export async function activarNormaGeneralAdmin(idNormaGeneral) {
    return fetchAutenticado(`/api/admin/normas-generales/${idNormaGeneral}/activar`, {
        method: "PATCH",
    });
}

export async function crearNormaGeneralAdmin(strDescripcionNorma) {
    return fetchAutenticado("/api/admin/normas-generales", {
        method: "POST",
        body: JSON.stringify({ descripcionNorma: strDescripcionNorma }),
    });
}

// Copia el texto literal de una norma particular hacia una norma general
// nueva, y marca esa particular como promovida:true. Da 400 si ya se
// promovió antes (el frontend igual esconde el botón cuando promovida ya
// es true, para no llegar a intentarlo dos veces).
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

// Baja lógica (estadoNorma = false); deja de aparecer en el catálogo público
// pero no afecta exámenes que ya la usaron.
export async function eliminarNormaGeneralAdmin(idNormaGeneral) {
    return fetchAutenticado(`/api/admin/normas-generales/${idNormaGeneral}`, {
        method: "DELETE",
    });
}


export async function actualizarExamen(idExamen, objBody) {
    return fetchAutenticado(`/api/examenes/${idExamen}`, {
        method: "PUT",
        body: JSON.stringify(objBody),
    });
}


export async function obtenerTiposUsados(idAsignatura, codsisDocente) {
    const params = new URLSearchParams();
    if (idAsignatura) params.set("idAsignatura", idAsignatura);
    if (codsisDocente) params.set("codsisDocente", codsisDocente);
    const strQuery = params.toString() ? `?${params.toString()}` : "";
    return fetchAutenticado(`/api/examenes/tipos-usados${strQuery}`);
}