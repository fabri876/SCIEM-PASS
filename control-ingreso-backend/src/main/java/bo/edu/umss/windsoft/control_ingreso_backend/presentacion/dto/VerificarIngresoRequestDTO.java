package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record VerificarIngresoRequestDTO(
        @NotBlank(message = "El C.I. o Código SIS del estudiante es obligatorio.")
        String identificador,

        @NotNull(message = "El ID de la asignatura es obligatorio.")
        Integer idasignatura,

        @NotNull(message = "El ID del examen es obligatorio.")
        Integer idexamen,

        @NotNull(message = "El ID del ambiente es obligatorio.")
        Integer idambiente,

        MetodoIngreso metodoIngreso
) {
}
