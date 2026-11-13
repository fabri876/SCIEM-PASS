package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CerrarIncidenciaDto(
        @NotBlank(message = "La resolución es obligatoria para cerrar la incidencia.")
        @Size(max = 255, message = "La resolución no puede superar los 255 caracteres.")
        String resolucion) {
}
