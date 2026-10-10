package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Todo el dashboard de un examen en una sola respuesta (la que se consulta cada 15 s). */
public record TableroMonitoreoDto(
        Integer idExamen,
        Integer idAsignatura,
        String asignatura,
        LocalDate fechaExamen,
        LocalDateTime actualizado,
        MetricasMonitoreoDto metricas,
        List<AulaMonitoreoDto> aulas,
        List<AlertaDesubicadoDto> alertas) {
}
