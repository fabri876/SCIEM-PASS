package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record ResultadoIngresoDTO(
        String estado, // "PERMITIDO", "NO_ENCONTRADO", "INHABILITADO", "DUPLICADO"
        String mensaje,
        EstudianteResumenDTO estudiante,
        LocalDateTime horaIngreso,
        PrimerIngresoDTO primerIngreso,
        String motivoInhabilitacion
) {
}
