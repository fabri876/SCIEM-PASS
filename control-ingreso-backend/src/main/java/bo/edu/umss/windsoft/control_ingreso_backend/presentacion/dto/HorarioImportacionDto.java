package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;
import java.util.List;
public final class HorarioImportacionDto {
    private HorarioImportacionDto() {}
    public record Fila(Integer codigoAsignatura, String nombreAsignatura, String nombreGrupo, Integer idAsignaturaDestino) {}
    public record VistaPrevia(List<Fila> filas) {}
    public record Resultado(int asignaturasCreadas, int gruposCreados) {}
}
