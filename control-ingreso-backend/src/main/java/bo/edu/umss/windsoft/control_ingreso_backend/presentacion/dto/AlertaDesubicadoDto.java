package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

/**
 * Estudiante que se presentó en un aula diferente a la asignada y todavía no ingresó (HU10).
 * Si puedeReubicar es false, motivoNoReubicable explica por qué.
 */
public record AlertaDesubicadoDto(
        Integer idIntento,
        Integer codSis,
        String estudiante,
        String ci,
        LocalDateTime hora,
        Integer idAmbienteActual,
        String aulaActual,
        Integer idAmbienteAsignado,
        String aulaAsignada,
        String ubicacionAsignada,
        Integer cuposAulaActual,
        boolean puedeReubicar,
        String motivoNoReubicable) {
}
