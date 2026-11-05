import { strApiBaseUrl } from "./apiConfig";
import { obtenerToken } from "./authService";

async function solicitar(ruta, opciones) {
  const respuesta = await fetch(`${strApiBaseUrl}${ruta}`, opciones);
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => null);
    throw new Error(error?.mensaje || error?.message || "No se pudo consultar el archivo de exámenes pasados.");
  }
  return respuesta;
}
export async function guardarExamenPasado(datos) {
  return (await solicitar("/api/admin/examenes-pasados", {
    method: "POST", headers: { Authorization: `Bearer ${obtenerToken()}` }, body: datos,
  })).json();
}
export async function obtenerExamenesPasados(offset = 0, limite = 20) {
  return (await solicitar(`/api/publico/examenes/pasados?offset=${offset}&limite=${limite}`)).json();
}
export async function descargarExamenPasado(id) {
  return (await solicitar(`/api/publico/examenes/pasados/${id}/pdf`)).blob();
}
