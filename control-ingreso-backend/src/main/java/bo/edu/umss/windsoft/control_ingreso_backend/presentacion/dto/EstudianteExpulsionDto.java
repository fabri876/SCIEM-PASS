package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

/** Resultado de buscar un estudiante para expulsión en un examen. */
public record EstudianteExpulsionDto(
        Integer idIngreso,
        Integer codSis,
        String ci,
        String nombreCompleto,
        String aula,
        LocalDateTime horaIngreso,
        boolean yaRetirado
) {
}
