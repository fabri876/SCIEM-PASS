package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/** Examen del selector del dashboard (HU10). */
public record ExamenMonitoreoDto(
        Integer idExamen,
        Integer idAsignatura,
        String asignatura,
        LocalDate fechaExamen,
        LocalTime horaInicio,
        LocalTime horaFin,
        int cantidadAulas,
        boolean enCurso) {
}
