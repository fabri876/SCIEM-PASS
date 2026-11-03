import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, obtenerUsuarioActual } from "./authService";
import { cargarExamenesConRespaldo, examenRepo } from "../offline/examenRepo";


//examenService.js


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
    const res = await cargarExamenesConRespaldo({
        clave: `asignaturas-${idUsuario}`,
        usuarioId: idUsuario,
        fetcher: async ({ signal }) => {
            const response = await fetch(`${strApiBaseUrl}/api/asignaturas/por-docente?${params}`, {
                headers: construirHeaders(),
                signal,
            });

            if (!response.ok) {
                const err = new Error("No se pudieron obtener las asignaturas");
                err.status = response.status;
                throw err;
            }

            return response.json();
        },
    });

    return res.examenes;
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

export async function obtenerPerfilDocente() {
    const response = await fetch(`${strApiBaseUrl}/api/docente/perfil`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudo obtener el perfil del docente");
    }

    return response.json();
}

export async function obtenerTiposExamen() {
    const response = await fetch(`${strApiBaseUrl}/api/tipos-examen`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudieron obtener los tipos de examen");
    }

    return response.json();
}

export async function obtenerExamenes() {
    const response = await fetch(`${strApiBaseUrl}/api/examenes`, {
        headers: construirHeaders(),
    });

    if (!response.ok) {
        throw new Error("No se pudieron obtener los exámenes");
    }

    return response.json();
}

export async function obtenerExamenesPorDocente(idUsuario) {
    const response = await fetch(`${strApiBaseUrl}/api/examenes/por-docente/${idUsuario}`, {
        headers: construirHeaders(),
    });
    if (!response.ok) {
        throw new Error("No se pudieron obtener los exámenes del docente");
    }
    return response.json();
}

export async function obtenerExamenesFinalizadosDocente(idUsuario) {
    const ruta = idUsuario
        ? `/api/examenes/por-docente/${idUsuario}/finalizados`
        : "/api/examenes/mis-examenes-finalizados";
    const response = await fetch(`${strApiBaseUrl}${ruta}`, { headers: construirHeaders() });
    if (!response.ok) throw new Error("No se pudieron obtener los exámenes finalizados");
    return response.json();
}

export async function obtenerMisExamenes() {
    const usuario = obtenerUsuarioActual();
    const res = await cargarExamenesConRespaldo({
        clave: "mis-examenes",
        usuarioId: usuario?.idUsuario ?? null,
    // Esta consulta puede tardar más cuando el docente tiene varios grupos,
    // ambientes y habilitaciones. Evitar cancelarla a los 5 s.
    timeoutMs: 20000,
        fetcher: async ({ signal }) => {
            const response = await fetch(`${strApiBaseUrl}/api/examenes/mis-examenes`, {
                headers: construirHeaders(),
                signal,
            });

            if (!response.ok) {
                const err = new Error("No se pudieron obtener los exámenes del docente");
                err.status = response.status;
                throw err;
            }

            return response.json();
        },
    });

    return res.examenes;
}

export async function obtenerExamenPorId(idExamen) {
    const usuario = obtenerUsuarioActual();
    const controller = new AbortController();
    let timerId = null;

    try {
        const promesaTimeout = new Promise((_, reject) => {
            timerId = setTimeout(() => {
                controller.abort();
                reject(Object.assign(new Error("Timeout de red"), { name: "TimeoutError" }));
            }, 5000);
        });

        const promesaFetch = (async () => {
            const response = await fetch(`${strApiBaseUrl}/api/examenes/${idExamen}`, {
                headers: construirHeaders(),
                signal: controller.signal,
            });

            if (!response.ok) {
                const err = new Error("No se pudo obtener el examen");
                err.status = response.status;
                throw err;
            }

            return await response.json();
        })();

        // Evitar unhandled rejection si el timeout rechaza primero
        promesaFetch.catch(() => {});

        return await Promise.race([promesaFetch, promesaTimeout]);
    } catch (error) {
        const status = error?.status;
        const esTimeout = error?.name === "TimeoutError";
        const esErrorRedSinStatus = status === undefined || status === null;
        const es5xx = typeof status === "number" && status >= 500 && status <= 599;
        const es401 = status === 401;

        // Solo cae al respaldo ante error de red, timeout, 5xx o 401. 403, 404 u otros 4xx se propagan.
        if (esTimeout || esErrorRedSinStatus || es5xx || es401) {
            const local = await examenRepo.obtenerExamen(idExamen, { usuarioId: usuario?.idUsuario ?? null });
            if (local) return local;
        }

        throw error;
    } finally {
        if (timerId) {
            clearTimeout(timerId);
        }
    }
}

/** Cartelera publica: datos de examen, docente y aula, sin informacion de estudiantes. */
export async function obtenerExamenesProximos() {
    const res = await cargarExamenesConRespaldo({
        clave: "proximos",
        usuarioId: null,
        fetcher: async ({ signal }) => {
            const response = await fetch(`${strApiBaseUrl}/api/publico/examenes/proximos`, {
                signal,
            });

            if (!response.ok) {
                const err = new Error("No se pudieron cargar los proximos examenes.");
                err.status = response.status;
                throw err;
            }

            return response.json();
        },
    });

    return res.examenes;
}

export async function obtenerCambiosExamenes() {
    const response = await fetch(`${strApiBaseUrl}/api/publico/examenes/cambios`);
    if (!response.ok) throw new Error("No se pudieron cargar los cambios de examenes.");
    return response.json();
}
