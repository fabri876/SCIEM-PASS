package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;
import java.util.List;

public record IncidenciaDetalleDto(
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
        Integer codSisEstudiante,
        String estudiante,
        boolean estudianteRetirado,
        String descripcion,
        String accion,
        String accionEtiqueta,
        Double puntajeReducir,
        String detalleTipoOtro,
        String detalleAccionOtro,
        String evidenciaUrl,
        String resolucion,
        Integer idExpulsion,
        String estadoExpulsion,
        List<EventoIncidenciaDto> lineaTiempo) {
}
