package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.time.LocalDateTime;

public record ExamenFinalizadoEvent(Integer idExamen, Integer idDocente, String correoDocente,
                                    LocalDateTime finalizadoEn, String ip) {
}
