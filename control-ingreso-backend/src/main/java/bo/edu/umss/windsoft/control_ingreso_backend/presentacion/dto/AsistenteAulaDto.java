package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

/**
 * Un estudiante en la lista de un aula (HU10).
 * estado: PRESENTE | EXCEPCIONAL | AUSENTE | RETIRADO.
 * metodo: QR | Manual (null si no ingresó).
 */
public record AsistenteAulaDto(
        Integer codSis,
        String nombre,
        String ci,
        String estado,
        LocalDateTime hora,
        String metodo,
        String observacion) {
}
