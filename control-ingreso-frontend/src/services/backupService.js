import { strApiBaseUrl } from "./apiConfig";

const fnObtenerHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
});

async function fnRequest(strRuta, objOpciones = {}) {
    const res = await fetch(`${strApiBaseUrl}/api/admin/backups${strRuta}`, {
        ...objOpciones,
        headers: fnObtenerHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.mensaje || "Error en la operación");
    return data;
}

export const listarBackups = () => fnRequest("");
export const generarBackup = () => fnRequest("", { method: "POST" });
export const obtenerUrlDescarga = (strNombre) =>
    fnRequest(`/${encodeURIComponent(strNombre)}/descarga`);
export const restaurarBackup = (strNombre) =>
    fnRequest(`/${encodeURIComponent(strNombre)}/restaurar`, { method: "POST" });
export const listarBitacoraBackups = () => fnRequest("/bitacora");