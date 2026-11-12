package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotBlank;

public record FaceVerificacionEstudianteRequestDto(
        @NotBlank(message = "El vector biométrico en vivo es obligatorio.")
        String embedding,
        Double livenessScore,
        Integer idExamen
) {
}

