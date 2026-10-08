package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public record EstudianteResumenDTO(
        Integer idusuario,
        Integer codsisestudiante,
        String ci,
        String nombreCompleto,
        String carrera,
        String fotoUrl
) {
}
