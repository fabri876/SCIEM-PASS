package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;

/** Ocupación de un aula en un examen. capacidad/disponibles son null si el aula no tiene capacidad cargada. */
public record AforoDto(long ocupados, Integer capacidad, Integer disponibles) {
}
