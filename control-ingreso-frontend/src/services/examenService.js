/**
 * examenService.js
 */
import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken } from "./authService";

export async function registrarExamen(objExamen) {
    const strToken = obtenerToken();

    const response = await fetch(`${strApiBaseUrl}/api/examenes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${strToken}`,
        },
        body: JSON.stringify(objExamen),
    });

    if (!response.ok) {
        throw new Error("No se pudo registrar el examen");
    }

    return response.json();
}