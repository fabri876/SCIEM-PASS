package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalTime;

public record AulaOcupadaDTO(
        Integer idAula,
        String nombreAula,
        LocalTime horaInicio,
        LocalTime horaFin) {
}
