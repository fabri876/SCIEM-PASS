package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/** DTO de entrada para registrar una expulsión (HU14). */
public record RegistroExpulsionRequest(
        Integer idIngreso,
        String motivoExpulsion,
        String observacion
) {
}
