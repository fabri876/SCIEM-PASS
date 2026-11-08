package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/** Contrato mínimo para la operación facial offline; no contiene CI, correo ni contraseña. */
public record FaceExamPackageStudentDto(
        Integer idUsuarioEstudiante,
        Integer codsisEstudiante,
        String nombreCompleto,
        String apellidoPaterno,
        Integer idAmbiente,
        String embedding,
        boolean requiereIngresoManual) {
}
