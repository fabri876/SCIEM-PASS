package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record UltimoIngresoDTO(
        Integer idIngreso,
        LocalDateTime horaIngreso,
        String metodoIngreso,
        EstudianteResumenDTO estudiante,
        String registradoPor,
        Integer idAsignatura,
        Integer idExamen,
        Integer idAmbiente
) {
}
