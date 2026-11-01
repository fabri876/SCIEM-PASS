package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;
import java.util.List;
public final class HorarioImportacionDto {
    private HorarioImportacionDto() {}
    public record Fila(Integer codigoAsignatura, String nombreAsignatura, String nombreGrupo, Integer idAsignaturaDestino) {}
    public record VistaPrevia(List<Fila> filas, String carrera, String gestion) {
        public VistaPrevia(List<Fila> filas) {this(filas,null,null);}
    }
    public record Existente(String codigoOficial, String nombreAsignatura, String nombreGrupo) {}
    public record Resultado(int asignaturasCreadas, int gruposCreados, int asignaturasExistentes, int gruposExistentes,
                            List<Existente> detalleAsignaturasExistentes, List<Existente> detalleGruposExistentes) {
        public Resultado(int nuevas,int grupos,int existentes,int gruposPrevios) {this(nuevas,grupos,existentes,gruposPrevios,List.of(),List.of());}
    }
}
