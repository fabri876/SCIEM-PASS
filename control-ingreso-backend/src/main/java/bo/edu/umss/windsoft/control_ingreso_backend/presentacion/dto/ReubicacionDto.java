package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record ReubicacionDto(
        Integer codSis,
        String estudiante,
        String aulaOrigen,
        String aulaDestino,
        LocalDateTime horaIngreso,
        String mensaje) {
}
