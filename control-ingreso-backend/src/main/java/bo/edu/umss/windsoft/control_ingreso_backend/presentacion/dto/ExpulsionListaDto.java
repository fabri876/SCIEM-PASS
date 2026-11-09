package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.EstadoExpulsion;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Fila resumida para listar / historial de expulsiones (HU14). */
public record ExpulsionListaDto(
        Integer idExpulsion,
        Integer idIngreso,
        Integer idExamen,
        String nombreEstudiante,
        String ciEstudiante,
        Integer codSisEstudiante,
        String nombreAsignatura,
        String aula,
        LocalDate fechaExamen,
        String motivoExpulsion,
        String observacion,
        String evidencia,
        LocalDate fechaExpulsion,
        LocalDateTime horaExpulsion,
        EstadoExpulsion estado,
        LocalDateTime fechaAutorizacion,
        String nombreRegistra,
        String nombreAutoriza,
        Integer idIncidencia
) {
}
