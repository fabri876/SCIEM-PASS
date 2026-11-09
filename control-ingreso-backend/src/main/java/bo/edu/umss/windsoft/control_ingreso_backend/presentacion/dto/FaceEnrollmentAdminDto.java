package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record FaceEnrollmentAdminDto(Integer idEnrollment, Integer idUsuario, String nombreCompleto,
                                     Integer codsisEstudiante, String photoPath, String modelVersion, String estado,
                                     LocalDateTime consentimientoAt, LocalDateTime fechaRegistro) {
}
