package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/**
 * Una aula del examen en el dashboard (HU10).
 * nivel: DISPONIBLE (< 70 %), ALTA (70 % o más) o FUERA_DE_LIMITE (alcanzó o superó la capacidad).
 * capacidad, disponibles y porcentajeOcupacion vienen null si el aula no tiene capacidad cargada.
 */
public record AulaMonitoreoDto(
        Integer idAmbiente,
        String aula,
        String ubicacion,
        Integer capacidad,
        int asignados,
        int ingresados,
        int pendientes,
        Integer disponibles,
        Double porcentajeOcupacion,
        boolean fueraDeLimite,
        String nivel) {
}
