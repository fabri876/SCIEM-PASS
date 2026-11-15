import { strApiBaseUrl } from "./apiConfig";

const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
});

async function request(path, options = {}) {
    const res = await fetch(`${strApiBaseUrl}/api/admin/backups${path}`, {
        ...options,
        headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.mensaje || "Error en la operación");
    return data;
}

export const listarBackups = () => request("");
export const generarBackup = () => request("", { method: "POST" });
export const obtenerUrlDescarga = (nombre) =>
    request(`/${encodeURIComponent(nombre)}/descarga`);
export const restaurarBackup = (nombre) =>
    request(`/${encodeURIComponent(nombre)}/restaurar`, { method: "POST" });
export const listarBitacoraBackups = () => request("/bitacora");