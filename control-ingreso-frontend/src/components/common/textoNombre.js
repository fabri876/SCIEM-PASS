// Nombres de personas en pantalla: siempre con la primera letra de cada palabra en mayúscula,
// sin importar cómo se registraron ("caceres rengel fabricio" o "CACERES RENGEL FABRICIO"
// → "Caceres Rengel Fabricio"). Las partículas "de", "del", "la", "las", "los" y "y"
// quedan en minúscula cuando no son la primera palabra ("Pérez de la Cruz").
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y"]);

export function textoNombre(valor) {
  const str = String(valor ?? "").trim().replace(/\s+/g, " ");
  if (!str) return "";
  return str
    .toLocaleLowerCase("es")
    .split(" ")
    .map((strPalabra, i) => {
      if (i > 0 && PARTICULAS.has(strPalabra)) return strPalabra;
      // También después de guion o apóstrofo: "garcía-pérez" → "García-Pérez"
      return strPalabra.replace(/(^|[-'])(\p{L})/gu, (_, strAntes, strLetra) => strAntes + strLetra.toLocaleUpperCase("es"));
    })
    .join(" ");
}

// "Apellidos Nombres" de una fila de estudiante, ya con mayúsculas iniciales
export function nombreEstudiante(objFila) {
  const strCompleto = `${objFila?.apellidos || ""} ${objFila?.nombres || ""}`.trim()
    || objFila?.nombre || objFila?.nombreEstudiante || "";
  return textoNombre(strCompleto);
}
