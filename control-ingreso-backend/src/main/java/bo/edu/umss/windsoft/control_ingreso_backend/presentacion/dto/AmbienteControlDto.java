package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/** Un aula de un examen, para el selector de la HU06 (y la HU10). */
public record AmbienteControlDto(
        Integer idAmbiente,
        Integer idAsignatura,
        String asignatura,
        Integer idExamen,
        LocalDate fechaExamen,
        String aula,
        LocalTime horaInicio,
        LocalTime horaFin,
        AforoDto aforo,
        boolean ingresoCerrado,
        String motivoCierre) {
}
