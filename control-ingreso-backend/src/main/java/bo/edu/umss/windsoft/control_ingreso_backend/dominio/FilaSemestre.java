package bo.edu.umss.windsoft.control_ingreso_backend.dominio;
import java.util.List;
public record FilaSemestre(String codigo, String asignatura, String grupo, List<String> docentes) {}
