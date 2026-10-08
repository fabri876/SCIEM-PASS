package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record DelegadoExamenDTO(
        Integer idayudante,
        Integer idasignatura,
        String nombreAsignatura,
        String siglaAsignatura,
        Integer idexamen,
        String nombreExamen,
        Integer idambiente,
        String nombreAmbiente,
        String ubicacionAmbiente,
        LocalDate fechaExamen,
        LocalTime horaInicio,
        LocalTime horaFin,
        String grupo,
        String estadoAsignacion,
        String estadoMateria,
        int ingresaron,
        int faltantes,
        int inhabilitados,
        int totalHabilitados
) {
}
