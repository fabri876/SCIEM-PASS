package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record FaceAuditoriaDto(Integer idIngreso, Integer codsisEstudiante, String nombreCompleto,
                               Integer idAmbiente, Integer idAsignatura, Integer idExamen, String tipoIngreso,
                               String metodoIngreso, String motivoExcepcion, String observacionIngreso,
                               Double scoreFacial, Double serverRecheckScore, LocalDateTime sincronizadoEn,
                               LocalDateTime horaIngreso, Integer idUsuario) {
}
