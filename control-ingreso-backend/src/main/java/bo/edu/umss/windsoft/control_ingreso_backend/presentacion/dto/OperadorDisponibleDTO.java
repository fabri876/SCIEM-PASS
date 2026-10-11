package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/**
 * Operador (ayudante) que está disponible para ser asignado a un aula de examen.
 * Se incluye si ya tiene asignación activa para informarla al admin.
 */
public record OperadorDisponibleDTO(
        Integer idUsuario,
        String nombre,
        String apellido,
        String ci,
        String correo,
        /** Indica si ya tiene al menos una asignación ACTIVA en ESTE examen. */
        boolean yaAsignado
) {}
