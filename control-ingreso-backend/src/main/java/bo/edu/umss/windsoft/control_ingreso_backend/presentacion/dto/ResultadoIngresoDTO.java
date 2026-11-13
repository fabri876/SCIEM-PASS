package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

import java.time.LocalDateTime;

public record ResultadoIngresoDTO(
        String estado, // "PERMITIDO", "NO_ENCONTRADO", "INHABILITADO", "DUPLICADO", "RETIRADO"
        String mensaje,
        EstudianteResumenDTO estudiante,
        LocalDateTime horaIngreso,
        PrimerIngresoDTO primerIngreso,
        String motivoInhabilitacion,
        OtroExamenDTO otroExamen,
        boolean intentoRegistrado
) {
    public ResultadoIngresoDTO(String estado, String mensaje, EstudianteResumenDTO estudiante,
                               LocalDateTime horaIngreso, PrimerIngresoDTO primerIngreso,
                               String motivoInhabilitacion) {
        this(estado, mensaje, estudiante, horaIngreso, primerIngreso, motivoInhabilitacion, null, false);
    }
    public ResultadoIngresoDTO(String estado, String mensaje, EstudianteResumenDTO estudiante,
                               LocalDateTime horaIngreso, PrimerIngresoDTO primerIngreso,
                               String motivoInhabilitacion, OtroExamenDTO otroExamen) {
        this(estado, mensaje, estudiante, horaIngreso, primerIngreso, motivoInhabilitacion, otroExamen, false);
    }
}
