package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/** Datos disponibles del intento; valores no registrados permanecen nulos. */
public record ReporteIntentoDto(
        Integer idIntento, Integer idAsignatura, String nombreAsignatura,
        Integer idExamen, String nombreExamen, String estudianteNombre,
        String codSis, String ci, String carreraEstudiante,
        String motivo, String motivoEtiqueta, String sePresentoEn,
        String examenAulaAsignada, String fecha, String hora,
        String operador, String estadoPosterior, String estadoPosteriorTipo) {}
