package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;
import java.time.OffsetDateTime;
public record CambioExamenDto(long id, String asignatura, String tipo, String anterior, String actual, OffsetDateTime fecha) {}
