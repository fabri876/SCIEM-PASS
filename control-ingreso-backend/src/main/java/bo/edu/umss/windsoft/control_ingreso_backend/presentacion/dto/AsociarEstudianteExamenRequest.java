package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.constraints.NotNull;

public record AsociarEstudianteExamenRequest(
        @NotNull Integer codigoSis,
        @NotNull Integer idAsignatura,
        @NotNull Integer idExamen,
        Boolean habilitado,
        String observacion
) {}
