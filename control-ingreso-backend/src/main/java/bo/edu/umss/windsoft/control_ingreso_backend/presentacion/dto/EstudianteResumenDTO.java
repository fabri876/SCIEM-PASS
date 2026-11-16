package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

public record EstudianteResumenDTO(
        Integer idusuario,
        Integer codsisestudiante,
        String ci,
        String nombreCompleto,
        String carrera,
        String fotoUrl,
        String estadoEnrolamientoFacial
) {
    /** Compatibilidad para vistas que no necesitan decidir el ingreso. */
    public EstudianteResumenDTO(Integer idusuario, Integer codsisestudiante, String ci,
                                String nombreCompleto, String carrera, String fotoUrl) {
        this(idusuario, codsisestudiante, ci, nombreCompleto, carrera, fotoUrl, null);
    }
}
