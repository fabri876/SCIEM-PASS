package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CerrarIncidenciaDto(
        @NotBlank(message = "La resolución es obligatoria para cerrar la incidencia.")
        @Size(max = 1000, message = "La resolución admite como máximo 1000 caracteres.")
        String resolucion) {
}
