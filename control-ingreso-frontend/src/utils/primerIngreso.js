// Nombre del campo que devuelve el backend dentro de "usuario" en el login.
// Si tu pair lo llama distinto, cambia SOLO esta constante.
export const STR_CAMPO_BACKEND = "debeCambiarContrasena";

const STR_CLAVE_SESSION = "debeCambiarContrasena";

/**
 * Se llama en cada login: guarda la marca si el usuario debe cambiar su
 * contraseña y la borra si no (así no se arrastra de un usuario anterior).
 */
export function fnGuardarEstadoPrimerIngreso(objUsuario) {
    try {
        if (objUsuario?.[STR_CAMPO_BACKEND] === true) {
            sessionStorage.setItem(STR_CLAVE_SESSION, "1");
        } else {
            sessionStorage.removeItem(STR_CLAVE_SESSION);
        }
    } catch {
        // sessionStorage no disponible: no se muestra el aviso
    }
}

export function fnDebeCambiarContrasena() {
    try {
        return sessionStorage.getItem(STR_CLAVE_SESSION) === "1";
    } catch {
        return false;
    }
}

export function fnLimpiarPrimerIngreso() {
    try {
        sessionStorage.removeItem(STR_CLAVE_SESSION);
    } catch {
        // nada que limpiar
    }
}