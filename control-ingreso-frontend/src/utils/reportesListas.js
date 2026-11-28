import { textoAsignatura, textoInterfaz } from './textoInterfaz.js';
import { textoNombre, nombreEstudiante } from '../components/common/textoNombre.js';

// Solo columnas explícitas de presentación; nunca se serializan los objetos de la API.
export function reporteColumnas(registros, columnas) {
  return { cabeceras: columnas.map(([titulo]) => titulo), filas: registros.map(r => columnas.map(([, valor]) => valor(r) ?? '')) };
}

export function reporteExamenes(registros) {
  return reporteColumnas(registros, [
    ['Asignatura', e => textoAsignatura(e.nombreAsignatura || e.nombreExamen || e.materia || e.strNombre || e.nombre)],
    ['Tipo', e => textoInterfaz(e.tipoExamen || e.nombreTipoExamen || e.tipo || e.strTipo)],
    ['Estado', e => textoInterfaz(e.estado || e.strEstado || (e.cancelado ? 'Cancelado' : ''))],
    ['Fecha', e => e.fechaExamen || e.fecha || e.strFecha],
    ['Grupo', e => e.nombreGrupo || e.grupo],
    ['Horario', e => e.horario || [e.horaInicio || e.strHoraInicio, e.horaFin || e.strHoraFin].filter(Boolean).join(' – ')],
    ['Aula', e => e.aula || e.strAmbiente || e.ambientes?.map(a => a.nombreAmbiente || a.nombreAula).filter(Boolean).join(', ')],
    ['Docente', e => textoNombre(e.nombreDocente || e.docente || e.strDocente)],
  ]);
}

export function reporteEstudiantes(registros, estado = r => r.estado) {
  return reporteColumnas(registros, [
    ['Estudiante', r => nombreEstudiante(r)], ['SIS', r => r.sis || r.codSis || r.codigoSis],
    ['CI', r => r.ci], ['Estado', r => textoInterfaz(estado(r))],
    ['Hora de ingreso', r => r.horaIngreso || r.hora], ['Aula', r => r.aulaAsignada || r.aula],
    ['Observación', r => r.observacion || r.observacionHabilitacion],
  ]);
}
