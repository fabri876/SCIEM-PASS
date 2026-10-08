package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record IngresoExcepcionalDto(
        Integer idIngreso,
        Integer codSis,
        String estudiante,
        String motivo,
        String motivoEtiqueta,
        String observacion,
        LocalDateTime horaIngreso,
        Integer idAmbiente,
        String aula,
        String asignatura,
        Integer idExamen,
        String autorizadoPor,
        String evidenciaUrl,
        AforoDto aforo) {
}
