package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record FaceEnrollmentStatusDto(Integer idUsuario, String estado, LocalDateTime fechaRegistro) {
}
