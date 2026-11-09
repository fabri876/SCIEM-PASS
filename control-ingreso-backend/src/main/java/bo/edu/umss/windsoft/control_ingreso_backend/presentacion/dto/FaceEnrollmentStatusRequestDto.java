package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotBlank;

public record FaceEnrollmentStatusRequestDto(@NotBlank String estado) {
}
