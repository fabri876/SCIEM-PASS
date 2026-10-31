package bo.edu.umss.windsoft.control_ingreso_backend.dominio;
import java.util.List;

/** Carrera/plan y niveles descritos por el PDF, independientes de la identidad de sus grupos. */
public record ClasificacionHorario(String carrera, String gestion, List<MateriaNivel> materias) {
    public record MateriaNivel(Integer codigo, String nivel) {}
}
