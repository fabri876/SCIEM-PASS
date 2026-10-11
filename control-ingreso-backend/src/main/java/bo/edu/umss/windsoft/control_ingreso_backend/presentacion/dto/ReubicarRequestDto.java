package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotNull;

/** "Reubicar y Autorizar": se reubica al estudiante de la alerta al aula donde se presentó. */
public record ReubicarRequestDto(
        @NotNull(message = "Falta la alerta a reubicar (idIntento).")
        Integer idIntento) {
}
