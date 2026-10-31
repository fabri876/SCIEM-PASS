import { strApiBaseUrl } from './apiConfig';
import { obtenerToken, cerrarSesion } from './authService';
import { invalidarCatalogo } from './grupoService';

async function consultar(ruta = '', opciones = {}, pdf = false) {
  const respuesta = await fetch(`${strApiBaseUrl}/api/admin/semestres${ruta}`, {
    ...opciones, headers: { Authorization: `Bearer ${obtenerToken()}` },
  });
  if (respuesta.status === 401) cerrarSesion();
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => null);
    throw new Error(error?.mensaje || 'No se pudo completar la operación de semestres.');
  }
  if (opciones.method && opciones.method !== 'GET') invalidarCatalogo();
  return pdf ? respuesta.blob() : respuesta.json();
}
export const listarSemestres = () => consultar();
export const compararSemestre = id => consultar(`/${id}/comparacion`);
export const obtenerListadoSemestre = id => consultar(`/${id}/listado`);
export const obtenerPdfSemestre = id => consultar(`/${id}/pdf`, {}, true);
export const previsualizarSemestre = body => consultar('/vista-previa', { method: 'POST', body });
export const abrirSemestre = body => consultar('/abrir', { method: 'POST', body });
export const guardarHistorico = body => consultar('/historicos', { method: 'POST', body });
export const configurarFechasSemestre = body => consultar('/fechas', { method: 'PUT', body });
export async function descargarSemestre(id, nombre, original = false) {
  const blob = await consultar(`/${id}/pdf?original=${original}`, {}, true);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url; enlace.download = `horario-${nombre}${original ? '-original' : ''}.pdf`;
  document.body.appendChild(enlace); enlace.click(); enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
