package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record JornadaActivaDTO(
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
        String estadoMateria,
        int cantidadAyudantesDelegados,
        int ingresaron,
        int faltantes,
        int inhabilitados,
        int totalHabilitados
) {
}
