package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoExpulsion;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** DTO de respuesta al registrar o consultar una expulsión (HU14). */
public record RegistroExpulsionResponse(
        Integer idExpulsion,
        Integer idIngreso,
        Integer idUsuario,
        String motivoExpulsion,
        LocalDate fechaExpulsion,
        LocalDateTime horaExpulsion,
        String observacion,
        String evidencia,
        EstadoExpulsion estado,
        LocalDateTime fechaAutorizacion,
        Integer idUsuarioAutoriza,
        Integer idIncidencia
) {
}
