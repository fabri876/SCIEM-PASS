/**
 * examenService.js
 */
import { strApiBaseUrl } from "./apiConfig";

export async function registrarExamen(objExamen) {
    const response = await fetch(`${strApiBaseUrl}/api/examenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(objExamen),
    });

    if (!response.ok) {
        throw new Error("No se pudo registrar el examen");
    }

    return response.json();
}