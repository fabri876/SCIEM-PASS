package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

/** Un punto de la línea de tiempo del detalle de una incidencia. */
public record EventoIncidenciaDto(LocalDateTime fechaHora, String accion, String usuario, String detalle) {
}
