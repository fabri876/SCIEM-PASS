package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.util.List;

/** Lista de un aula del examen: asignados (reparto + reubicaciones) y quienes ingresaron en ella. */
public record AsistentesAulaDto(
        Integer idAmbiente,
        Integer idExamen,
        String aula,
        String ubicacion,
        String docente,
        Integer capacidad,
        List<AsistenteAulaDto> asistentes) {
}
