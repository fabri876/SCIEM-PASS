// Utilidades del panel del estudiante: estado de cada examen, orden y textos.
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const inicioExamen = (e) => new Date(`${e.fecha}T${e.horaInicio || "00:00"}:00`);
const finExamen = (e) => new Date(`${e.fecha}T${e.horaFin || e.horaInicio || "23:59"}:00`);

// EN_CURSO | PROXIMO | FINALIZADO | SIN_FECHA
export function estadoExamenEstudiante(examen, dateAhora = new Date()) {
    if (!examen?.fecha) return "SIN_FECHA";
    if (dateAhora > finExamen(examen)) return "FINALIZADO";
    if (dateAhora >= inicioExamen(examen)) return "EN_CURSO";
    return "PROXIMO";
}

export function esHoyEstudiante(examen, dateAhora = new Date()) {
    const m = String(examen?.fecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return false;
    return Number(m[1]) === dateAhora.getFullYear() && Number(m[2]) === dateAhora.getMonth() + 1 && Number(m[3]) === dateAhora.getDate();
}

const ORDEN_ESTADO = { EN_CURSO: 0, PROXIMO: 1, SIN_FECHA: 2, FINALIZADO: 3 };

// Primero en curso, luego los próximos (el más cercano primero) y al final los finalizados (el más reciente primero)
export function ordenarExamenesEstudiante(list = [], dateAhora = new Date()) {
    return list
        .map((e) => ({ e, strEstado: estadoExamenEstudiante(e, dateAhora) }))
        .sort((a, b) => {
            if (ORDEN_ESTADO[a.strEstado] !== ORDEN_ESTADO[b.strEstado]) return ORDEN_ESTADO[a.strEstado] - ORDEN_ESTADO[b.strEstado];
            const numA = a.e.fecha ? inicioExamen(a.e).getTime() : 0;
            const numB = b.e.fecha ? inicioExamen(b.e).getTime() : 0;
            return a.strEstado === "FINALIZADO" ? numB - numA : numA - numB;
        });
}

// "690B" | "Aula 690B" → "Aula 690B"; sin aula → "Aula por definir"
export function textoAula(strAula) {
    const str = String(strAula || "").replace(/^aula\s*/i, "").trim();
    if (!str || /^no asignada$/i.test(str) || /^por definir$/i.test(str)) return "Aula por definir";
    return `Aula ${str}`;
}

// "2026-10-24" → { strDia: "24", strMes: "OCT" }
export function partesFecha(strFecha) {
    const m = String(strFecha || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? { strDia: String(Number(m[3])), strMes: MESES[Number(m[2]) - 1] } : null;
}

// "Sábado 24 de octubre"
export function fechaDeHoy() {
    const str = new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
    return str.charAt(0).toUpperCase() + str.slice(1);
}