// Servicio de la credencial QR del estudiante (backend real).

import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken, cerrarSesion } from "./authService";

async function pedir(strRuta) {
    const strToken = obtenerToken();
    const resp = await fetch(`${strApiBaseUrl}${strRuta}`, {
        headers: {
            "Content-Type": "application/json",
            ...(strToken ? { Authorization: `Bearer ${strToken}` } : {}),
        },
    });
    if (resp.status === 401) {
        cerrarSesion();
        sessionStorage.setItem("mensajeSesion", "Tu sesión expiró, vuelve a iniciar sesión");
        window.location.href = "/login";
        throw new Error("Tu sesión expiró, vuelve a iniciar sesión");
    }
    if (!resp.ok) {
        const objError = await resp.json().catch(() => null);
        throw new Error(objError?.mensaje || objError?.error || `Error ${resp.status} en el servidor.`);
    }
    return resp.status === 204 ? null : resp.json();
}

const hhmm = (v) => (v ? String(v).substring(0, 5) : "");
const soloFecha = (v) => (v ? String(v).substring(0, 10) : "");

// Estado del QR según su ventana de validez
// DISPONIBLE | PENDIENTE (aún no) | VENCIDO | NO_DISPONIBLE (anulado, inhabilitado, etc.)
function calcularEstadoQr(objQr) {
    if (objQr.contenidoQr) return "DISPONIBLE";
    const ahora = new Date();
    if (objQr.validoDesde && ahora < new Date(objQr.validoDesde)) return "PENDIENTE";
    if (objQr.validoHasta && ahora > new Date(objQr.validoHasta)) return "VENCIDO";
    return "NO_DISPONIBLE";
}

/* ============================================================
   1. Mis exámenes (estudiante)
   Endpoint pendiente en el backend. Propuesto:
   GET /api/v1/estudiante/examenes
   [{ idexamen, nombreExamen, nombreAsignatura, grupo, nombreAmbiente, ubicacionAmbiente,
      fechaExamen, horaInicio, horaFin, habilitado, motivoInhabilitacion }]
   ============================================================ */
export async function obtenerMisExamenesEstudiante() {
    const datos = await pedir("/api/v1/estudiante/examenes");
    return (datos || []).map((e) => ({
        id: e.idexamen,
        materia: e.nombreAsignatura,
        tipo: e.nombreExamen,
        grupo: e.grupo,
        aula: e.nombreAmbiente,
        edificio: e.ubicacionAmbiente || "",
        fecha: soloFecha(e.fechaExamen),
        horaInicio: hhmm(e.horaInicio),
        horaFin: hhmm(e.horaFin),
        habilitado: e.habilitado !== false,
        motivo: e.motivoInhabilitacion || "",
    }));
}

/* ============================================================
   2. Credencial QR de un examen
   GET /api/v1/estudiante/examenes/{idExamen}/qr
   { contenidoQr, mensaje, materia, examen, aula, fecha, horaInicio, validoDesde, validoHasta }
   contenidoQr = null si el QR todavía no está disponible (o ya venció)
   ============================================================ */
export async function obtenerQrExamen(idExamen) {
    const d = await pedir(`/api/v1/estudiante/examenes/${idExamen}/qr`);
    const objQr = {
        contenidoQr: d?.contenidoQr || null,
        mensaje: d?.mensaje || "",
        materia: d?.materia || "",
        tipo: d?.examen || "",
        aula: d?.aula || "",
        fecha: soloFecha(d?.fecha),
        horaInicio: hhmm(d?.horaInicio),
        validoDesde: d?.validoDesde || null,
        validoHasta: d?.validoHasta || null,
    };
    return { ...objQr, estado: calcularEstadoQr(objQr) };
}

// Estado aproximado del QR para la lista (sin pedir el QR de cada examen):
// misma regla que el backend (desde el día anterior 00:00 hasta el fin del día del examen)
export function estadoQrPorFecha(strFecha, boolHabilitado = true) {
    if (!boolHabilitado) return { estado: "INHABILITADO" };
    if (!strFecha) return { estado: "NO_DISPONIBLE" };
    const fin = new Date(`${strFecha}T23:59:59`);
    const ini = new Date(`${strFecha}T00:00:00`);
    ini.setDate(ini.getDate() - 1);
    const ahora = new Date();
    if (ahora < ini) return { estado: "PENDIENTE", desde: ini };
    if (ahora > fin) return { estado: "VENCIDO" };
    return { estado: "DISPONIBLE", hasta: fin };
}