package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/**
 * Datos de un aula (ambiente) dentro de un examen, incluyendo el operador asignado.
 */
public record AulaAsignacionDTO(
        Integer idAmbiente,
        Integer idAula,
        String nombreAula,
        String ubicacionAula,
        Integer capacidadAula,
        /** null si no hay operador asignado y activo para esta aula. */
        Integer idOperadorAsignado,
        String nombreOperador,
        String apellidoOperador,
        String apellidoDesde,
        String apellidoHasta
) {}
