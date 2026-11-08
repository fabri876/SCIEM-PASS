package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

/** Fila de la tabla de incidencias. */
public record IncidenciaResumenDto(
        Integer idIncidencia,
        String codigo,
        LocalDateTime fechaHora,
        Integer idAmbiente,
        String aula,
        String asignatura,
        Integer idExamen,
        String tipo,
        String tipoEtiqueta,
        String severidad,
        String severidadEtiqueta,
        String estado,
        String estadoEtiqueta,
        String reportadoPor,
        String estudiante) {
}
