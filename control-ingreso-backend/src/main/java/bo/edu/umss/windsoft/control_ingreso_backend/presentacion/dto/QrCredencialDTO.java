package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Respuesta que el estudiante recibe al consultar su credencial QR para un examen.
 * Si el QR aún no está disponible (fuera de ventana de tiempo), contenidoQr será null.
 */
public record QrCredencialDTO(
        // Contenido que se debe codificar/mostrar como imagen QR. Ej: "SCIEMPASS:1:K7P2-9XQM-4TRA"
        // Será null si el QR no está dentro de su ventana de validez.
        String contenidoQr,

        // Mensaje informativo para el estudiante (en caso de que el QR esté nulo o haya sido anulado)
        String mensaje,

        // Info del examen para mostrar en la pantalla del estudiante
        String materia,
        String examen,
        String aula,
        LocalDate fecha,
        LocalTime horaInicio,

        // Rango de validez del QR
        LocalDateTime validoDesde,
        LocalDateTime validoHasta
) {
}
