/**
 * Utilidades de la HU10. El backend manda fechas en hora de Bolivia y sin zona
 * ("2026-10-10T08:19:30"): se muestran tal cual, sin pasar por Date.
 */

/** "2026-10-10T08:19:30" → "08:19:30" */
export function horaConSegundos(strFechaHora) {
    if (!strFechaHora) return "--:--:--";
    const partes = String(strFechaHora).split("T");
    return (partes.length > 1 ? partes[1] : partes[0]).substring(0, 8);
}

/** "08:00:00" → "08:00" */
export function horaCorta(strHora) {
    return strHora ? String(strHora).substring(0, 5) : "";
}

/** Hora local del navegador "HH:MM:SS" (solo si el servidor no mandó 'actualizado'). */
export function horaLocalActual() {
    return new Date().toLocaleTimeString("es-BO", { hour12: false });
}

/** "Aula 601" aunque el backend mande solo "601". */
export function nombreAula(strAula) {
    if (!strAula) return "—";
    return /^aula/i.test(String(strAula)) ? String(strAula) : `Aula ${strAula}`;
}

/**
 * Nivel de ocupación (CA-06): verde < 70 %, ámbar 70–89 %, rojo ≥ 90 %.
 * "Fuera de límite" lo marca el backend (aula pasada de su capacidad).
 */
export const ESTILOS_OCUPACION = {
    sinCapacidad: { clave: "SIN_CAPACIDAD", etiqueta: "Sin capacidad registrada", pill: "bg-slate-100 text-slate-600", barra: "bg-slate-400", borde: "border-slate-200" },
    fuera: { clave: "FUERA_DE_LIMITE", etiqueta: "Aula Fuera de Límite", pill: "bg-rose-600 text-white", barra: "bg-rose-500", borde: "border-rose-300 ring-2 ring-rose-100" },
    casiLlena: { clave: "CASI_LLENA", etiqueta: "Casi llena", pill: "bg-rose-100 text-rose-700", barra: "bg-rose-500", borde: "border-rose-300 ring-2 ring-rose-100" },
    alta: { clave: "ALTA", etiqueta: "Ocupación alta", pill: "bg-amber-100 text-amber-800", barra: "bg-amber-500", borde: "border-slate-200" },
    disponible: { clave: "DISPONIBLE", etiqueta: "Con cupos", pill: "bg-emerald-100 text-emerald-800", barra: "bg-emerald-500", borde: "border-slate-200" },
};

export function estiloOcupacion(aula) {
    if (aula?.capacidad == null) return ESTILOS_OCUPACION.sinCapacidad;
    const dblPct = Number(aula.porcentajeOcupacion) || 0;
    if (aula.nivel === "FUERA_DE_LIMITE") return ESTILOS_OCUPACION.fuera;
    if (dblPct >= 90) return ESTILOS_OCUPACION.casiLlena;
    if (dblPct >= 70) return ESTILOS_OCUPACION.alta;
    return ESTILOS_OCUPACION.disponible;
}

/** Normaliza el tablero para que la pantalla nunca falle por un campo ausente. */
export function normalizarTablero(objTablero) {
    const m = objTablero?.metricas || {};
    return {
        actualizado: objTablero?.actualizado || null,
        metricas: {
            habilitados: m.habilitados ?? 0,
            ingresados: m.ingresados ?? 0,
            pendientes: m.pendientes ?? 0,
            excepcionales: m.excepcionales ?? 0,
            modoRapido: m.modoRapido ?? 0,
            porcentajeAvance: m.porcentajeAvance ?? 0,
            duplicadosBloqueados: m.duplicadosBloqueados ?? 0,
            aulasFueraDeLimite: m.aulasFueraDeLimite ?? 0,
        },
        aulas: Array.isArray(objTablero?.aulas) ? objTablero.aulas : [],
        alertas: Array.isArray(objTablero?.alertas) ? objTablero.alertas : [],
    };
}

/* ---------- Curva de llegada ---------- */

function aHoraCorta(valor) {
    if (valor == null) return "";
    const str = String(valor);
    const parte = str.includes("T") ? str.split("T")[1] : str;
    return parte.substring(0, 5);
}

/**
 * Acepta [{hora, cantidad}] o {llegadas|puntos|intervalos: [...]}.
 * Cada punto: etiqueta = hora|desde|etiqueta|intervalo; cantidad = cantidad|ingresos|total.
 */
export function normalizarLlegadas(datos) {
    const arr = Array.isArray(datos) ? datos : datos?.llegadas || datos?.puntos || datos?.intervalos || [];
    return arr.map((p) => ({
        etiqueta: aHoraCorta(p.hora ?? p.desde ?? p.etiqueta ?? p.intervalo),
        cantidad: Number(p.cantidad ?? p.ingresos ?? p.total ?? p.count ?? 0) || 0,
    }));
}

/* ---------- Detalle de aula ---------- */

export const ESTADOS_ASISTENTE = {
    PRESENTE: { etiqueta: "Presente", clase: "bg-emerald-100 text-emerald-800" },
    EXCEPCIONAL: { etiqueta: "Excepcional", clase: "bg-amber-100 text-amber-800" },
    AUSENTE: { etiqueta: "Ausente", clase: "bg-slate-100 text-slate-600" },
    RETIRADO: { etiqueta: "Retirado", clase: "bg-rose-100 text-rose-700" },
};

/**
 * Acepta una lista o {asistentes|estudiantes|items: [...], aula, ubicacion, docente, ingresoAbierto}.
 * Los totales se calculan de la lista (Presentes = presentes + excepcionales, un retirado NO cuenta).
 */
export function normalizarAsistentes(datos) {
    const arr = Array.isArray(datos) ? datos : datos?.asistentes || datos?.estudiantes || datos?.items || [];
    const asistentes = arr.map((a) => ({
        codSis: a.codSis ?? a.codigoSis ?? a.codsisestudiante ?? "",
        nombre: a.nombre ?? a.estudiante ?? a.nombreCompleto ?? "—",
        estado: String(a.estado || "").toUpperCase(),
        hora: aHoraCorta(a.hora ?? a.horaIngreso) || "—",
        metodo: a.metodo ?? a.metodoIngreso ?? "—",
        observacion: a.observacion || "—",
    }));
    const cuenta = (e) => asistentes.filter((a) => a.estado === e).length;
    const intPresentes = cuenta("PRESENTE");
    const intExcepcionales = cuenta("EXCEPCIONAL");
    const intAusentes = cuenta("AUSENTE");
    const intRetirados = cuenta("RETIRADO");
    let boolAbierto = null;
    if (typeof datos?.ingresoAbierto === "boolean") boolAbierto = datos.ingresoAbierto;
    else if (typeof datos?.ingresoCerrado === "boolean") boolAbierto = !datos.ingresoCerrado;
    return {
        asistentes,
        docente: datos?.docente ?? datos?.docenteResponsable ?? null,
        ubicacion: datos?.ubicacion ?? null,
        boolAbierto,
        totales: {
            todos: asistentes.length,
            presentes: intPresentes,
            excepcionales: intExcepcionales,
            ausentes: intAusentes,
            retirados: intRetirados,
            asignados: intPresentes + intAusentes + intRetirados, // los excepcionales no estaban asignados
            presentesTotal: intPresentes + intExcepcionales,
        },
    };
}

/** Para buscar sin importar tildes ni mayúsculas. */
export function textoBusqueda(valor) {
    return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
