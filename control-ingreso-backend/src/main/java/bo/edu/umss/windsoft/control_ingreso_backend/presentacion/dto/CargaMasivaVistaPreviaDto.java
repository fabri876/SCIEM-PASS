package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto;
import java.util.List;
public record CargaMasivaVistaPreviaDto(String archivo, List<Fila> filas) {
    public record Fila(int fila, String nombre, String apellido, String ci, Integer codigoSis,
                       String correo, Integer telefono, String rol, String asignatura, String grupo) {}
}
