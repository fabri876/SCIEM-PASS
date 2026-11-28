export const NIVEL_REQUERIDO = 8;

const REGEX_MINUSCULA = /[a-z]/;
const REGEX_MAYUSCULA = /[A-Z]/;
const REGEX_NUMERO = /[0-9]/;
const REGEX_ESPECIAL = /[^A-Za-z0-9\s]/;
const PALABRAS_COMUNES = ["password", "contrasena", "contraseña", "qwerty", "admin", "administrador", "root"];

export function fnContienePalabraComunOCorreo(strContrasena = "", strCorreo = "") {
    const strMin = (strContrasena || "").toLowerCase();
    if (!strMin) return false;
    if (PALABRAS_COMUNES.some((strPalabra) => strMin.includes(strPalabra))) {
        return true;
    }
    const strParteLocal = (strCorreo || "").trim().split("@")[0].toLowerCase();
    if (strParteLocal.length >= 3 && strMin.includes(strParteLocal)) {
        return true;
    }
    return strParteLocal
        .split(/[^a-z0-9]+/)
        .some((strSegmento) => strSegmento.length >= 3 && strMin.includes(strSegmento));
}

// Detecta 3 caracteres iguales seguidos o secuencias ascendentes/descendentes (abc, 123, cba, 321)
function fnTieneRepeticionOSecuencia(strTexto) {
    const strMin = strTexto.toLowerCase();
    for (let i = 0; i < strMin.length - 2; i++) {
        const a = strMin.charCodeAt(i);
        const b = strMin.charCodeAt(i + 1);
        const c = strMin.charCodeAt(i + 2);
        if (a === b && b === c) return true;
        const trio = strMin.slice(i, i + 3);
        if (/^[a-z]{3}$|^[0-9]{3}$/.test(trio)) {
            if (b === a + 1 && c === b + 1) return true;
            if (b === a - 1 && c === b - 1) return true;
        }
    }
    return false;
}

/**
 * Evalúa la contraseña nueva y devuelve el nivel (0 a 8), los criterios
 * cumplidos y el color/etiqueta para el medidor visual.
 */
export function fnEvaluarContrasena(strNueva = "", strActual = "", objContexto = {}) {
    const boolHayTexto = strNueva.length > 0;
    const boolContieneComunOCorreo = fnContienePalabraComunOCorreo(strNueva, objContexto?.correo);

    const arrCriterios = [
        { strClave: "largo8", strTexto: "Al menos 8 caracteres", boolCumple: strNueva.length >= 8 },
        { strClave: "largo12", strTexto: "Al menos 12 caracteres", boolCumple: strNueva.length >= 12 },
        { strClave: "minuscula", strTexto: "Una letra minúscula", boolCumple: REGEX_MINUSCULA.test(strNueva) },
        { strClave: "mayuscula", strTexto: "Una letra mayúscula", boolCumple: REGEX_MAYUSCULA.test(strNueva) },
        { strClave: "numero", strTexto: "Un número", boolCumple: REGEX_NUMERO.test(strNueva) },
        { strClave: "especial", strTexto: "Un carácter especial (!@#$%&*...)", boolCumple: REGEX_ESPECIAL.test(strNueva) },
        {
            strClave: "sinPatrones",
            strTexto: "Sin repeticiones, secuencias ni palabras comunes o del correo",
            boolCumple: boolHayTexto && !fnTieneRepeticionOSecuencia(strNueva) && !boolContieneComunOCorreo,
        },
        {
            strClave: "distintaActual",
            strTexto: "Distinta de tu contraseña actual",
            boolCumple:
                boolHayTexto &&
                strNueva !== strActual &&
                !(strActual.trim().length > 0 && strNueva.toLowerCase().includes(strActual.toLowerCase())),
        },
    ];

    const intNivel = arrCriterios.filter((objC) => objC.boolCumple).length;

    let strColor = "rojo";
    let strEtiqueta = "Débil";
    if (intNivel === 0) {
        strEtiqueta = "";
    } else if (intNivel >= NIVEL_REQUERIDO) {
        strColor = "verde";
        strEtiqueta = "Segura";
    } else if (intNivel >= 4) {
        strColor = "amarillo";
        strEtiqueta = "Media";
    }

    return {
        intNivel,
        arrCriterios,
        strColor,
        strEtiqueta,
        boolContieneComunOCorreo,
        boolValida: intNivel >= NIVEL_REQUERIDO,
    };
}
