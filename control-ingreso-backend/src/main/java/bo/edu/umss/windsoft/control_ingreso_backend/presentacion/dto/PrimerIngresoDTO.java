package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record PrimerIngresoDTO(
        LocalDateTime horaIngreso,
        String nombreAmbiente,
        String ubicacionAmbiente
) {
}
