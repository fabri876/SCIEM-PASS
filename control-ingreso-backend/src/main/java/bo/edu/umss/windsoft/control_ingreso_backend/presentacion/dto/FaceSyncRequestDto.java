package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Lote offline facial. Cada elemento debe llevar un UUID propio generado por el dispositivo. */
public record FaceSyncRequestDto(List<IntentoDto> intentos, List<IngresoDto> ingresos) {
    public record IntentoDto(
            String clientUuid, Integer idUsuarioEstudiante, Integer idAsignatura, Integer idExamen,
            Integer idAmbiente, Double score, Double livenessScore, String resultado, String fotoPath,
            String deviceId, String modelVersion, LocalDateTime capturadoEn) {
    }

    public record IngresoDto(
            String clientUuid, Integer idUsuarioEstudiante, Integer codsisEstudiante, Integer idAsignatura,
            Integer idExamen, Integer idAmbiente, String metodoIngreso, String tipoIngreso,
            String motivoExcepcion, String observacionIngreso, Double scoreFacial, Double livenessScore,
            String modelVersion, String deviceId, LocalDateTime horaMarcacion) {
    }
}
