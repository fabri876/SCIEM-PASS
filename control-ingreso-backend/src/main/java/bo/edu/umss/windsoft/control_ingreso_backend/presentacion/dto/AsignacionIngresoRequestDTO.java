package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Cuerpo del PUT /api/v1/control/examenes/{idExamen}/asignacion-ingreso
 * Permite asignar (o desasignar) un operador a cada aula del examen.
 */
public record AsignacionIngresoRequestDTO(
        @NotNull Integer idAsignatura,
        @NotNull @Valid List<ItemAsignacion> asignaciones,
        String modoAsignacion
) {
    public record ItemAsignacion(
            /** idambiente de la tabla ambiente */
            @NotNull Integer idAmbiente,
            /**
             * idUsuario del operador a asignar; null para desasignar
             * (marcar INACTIVO cualquier asignacion existente en ese ambiente).
             */
            Integer idOperador,
            String apellidoDesde,
            String apellidoHasta
    ) {}
}
