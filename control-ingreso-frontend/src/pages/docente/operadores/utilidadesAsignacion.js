/**
 * Cálculos de la asignación de operadores por aula (sin React ni red).
 *
 * Idea: los inscritos se ordenan por apellido y se cortan en bloques
 * seguidos, uno por aula. Dentro de cada aula, si hay varios responsables, se
 * divide el bloque por letras del apellido (A–F, G–L…).
 */

export function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .trim();
}

export function inicialApellido(estudiante) {
    return normalizar(estudiante?.apellidoEstudiante)[0] || "#";
}

export function ordenarPorApellido(lista) {
    return [...(lista || [])].sort((a, b) => {
        const ap = normalizar(a.apellidoEstudiante).localeCompare(normalizar(b.apellidoEstudiante), "es");
        if (ap !== 0) return ap;
        return normalizar(a.nombreEstudiante).localeCompare(normalizar(b.nombreEstudiante), "es");
    });
}

/** Reparte `total` en partes iguales; el resto va a las primeras aulas y se respeta la capacidad. */
export function repartoEquilibrado(total, capacidades) {
    const n = capacidades.length;
    if (n === 0) return [];
    const base = Math.floor(total / n);
    const resto = total % n;
    const res = capacidades.map((_, i) => base + (i < resto ? 1 : 0));
    let exceso = 0;
    res.forEach((v, i) => {
        const cap = capacidades[i];
        if (cap != null && v > cap) { exceso += v - cap; res[i] = cap; }
    });
    for (let i = 0; i < n && exceso > 0; i++) {
        const cap = capacidades[i];
        const libre = cap == null ? exceso : Math.max(0, cap - res[i]);
        const mover = Math.min(libre, exceso);
        res[i] += mover;
        exceso -= mover;
    }
    return res;
}

/** Devuelve { ok, mensaje } según la suma y la capacidad de cada aula. */
export function validarReparto(cantidades, capacidades, total) {
    const suma = cantidades.reduce((a, b) => a + (Number(b) || 0), 0);
    if (cantidades.some((c) => !Number.isInteger(Number(c)) || Number(c) < 0)) {
        return { ok: false, mensaje: "Escribe números enteros mayores o iguales a 0." };
    }
    const iExceso = cantidades.findIndex((c, i) => capacidades[i] != null && Number(c) > capacidades[i]);
    if (iExceso >= 0) {
        return { ok: false, mensaje: `El aula ${iExceso + 1} supera su capacidad (${capacidades[iExceso]}).` };
    }
    if (suma !== total) {
        return { ok: false, mensaje: `Hay ${suma} de ${total} estudiantes ubicados.` };
    }
    return { ok: true, mensaje: `${total} de ${total} estudiantes ubicados · ningún aula supera su capacidad` };
}

/** Corta la lista ordenada en bloques consecutivos con las cantidades dadas. */
export function cortarEnBloques(ordenados, cantidades) {
    let inicio = 0;
    return cantidades.map((c) => {
        const bloque = ordenados.slice(inicio, inicio + (Number(c) || 0));
        inicio += Number(c) || 0;
        return bloque;
    });
}

export function rangoLetras(bloque) {
    if (!bloque || bloque.length === 0) return "—";
    const a = inicialApellido(bloque[0]);
    const b = inicialApellido(bloque[bloque.length - 1]);
    return a === b ? a : `${a} – ${b}`;
}

/** Letras distintas (en orden) que aparecen en el bloque. */
export function letrasDeBloque(bloque) {
    const letras = [];
    (bloque || []).forEach((e) => {
        const l = inicialApellido(e);
        if (letras[letras.length - 1] !== l) letras.push(l);
    });
    return letras;
}

/**
 * Parte el bloque en k sub-bloques usando `hastas` (k-1 letras crecientes):
 * el responsable i atiende hasta la letra hastas[i] (inclusive).
 */
export function partirPorLetras(bloque, hastas) {
    const k = hastas.length + 1;
    const subs = Array.from({ length: k }, () => []);
    let idx = 0;
    (bloque || []).forEach((e) => {
        const l = inicialApellido(e);
        while (idx < k - 1 && l > hastas[idx]) idx++;
        subs[idx].push(e);
    });
    return subs;
}

/**
 * Elige k-1 letras de corte para que los k sub-bloques queden lo más parejos
 * posible sin partir una letra. Devuelve null si no hay suficientes letras.
 */
export function cortesEquitativos(bloque, k) {
    if (k <= 1) return [];
    const letras = letrasDeBloque(bloque);
    if (letras.length < k) return null;
    const acumulado = [];
    let cuenta = 0;
    letras.forEach((l) => {
        cuenta += bloque.filter((e) => inicialApellido(e) === l).length;
        acumulado.push(cuenta);
    });
    const n = bloque.length;
    const cortes = [];
    let previo = -1;
    for (let j = 1; j < k; j++) {
        const objetivo = Math.round((j * n) / k);
        const maximo = letras.length - 1 - (k - 1 - j);
        let mejor = previo + 1;
        for (let i = previo + 1; i <= maximo; i++) {
            if (Math.abs(acumulado[i] - objetivo) < Math.abs(acumulado[mejor] - objetivo)) mejor = i;
        }
        cortes.push(letras[mejor]);
        previo = mejor;
    }
    return cortes;
}

export function etiquetaRango(desde, hasta) {
    if (!desde) return "—";
    return desde === hasta ? desde : `${desde} – ${hasta}`;
}
