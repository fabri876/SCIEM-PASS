package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record FaceIntentoAdminDto(Integer idIntento, String clientUuid, Integer estIdUsuario, Integer idUsuario,
                                  Integer idAmbiente, Double score, Double livenessScore, String resultado,
                                  String fotoPath, String deviceId, LocalDateTime capturadoEn,
                                  LocalDateTime sincronizadoEn) {
}
