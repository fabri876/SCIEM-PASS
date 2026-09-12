package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

public class RecursoDuplicadoException extends RuntimeException {
    public RecursoDuplicadoException(String mensaje) {
        super(mensaje);
    }
}
