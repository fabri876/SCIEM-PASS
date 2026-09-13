/**
 * examenService.js
 *
 * Funciones que hacen las llamadas HTTP al backend para el módulo de
 * exámenes (HU2). Centralizado acá para no repetir fetch() en cada
 * componente, igual que hace apiConfig con la URL base.
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