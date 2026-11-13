package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/**
 * Métricas generales del examen (HU10).
 * pendientes = habilitados que todavía no ingresaron; porcentajeAvance = ingresados
 * habilitados / habilitados. ingresados incluye los ingresos excepcionales.
 */
public record MetricasMonitoreoDto(
        int habilitados,
        int ingresados,
        int pendientes,
        double porcentajeAvance,
        int excepcionales,
        int modoRapido,
        long duplicadosBloqueados,
        int aulasFueraDeLimite,
        int estudiantesDesubicados) {
}
