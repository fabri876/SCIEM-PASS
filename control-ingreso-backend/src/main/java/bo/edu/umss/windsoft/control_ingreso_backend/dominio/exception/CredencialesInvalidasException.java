package bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception;

public class CredencialesInvalidasException extends RuntimeException {
    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}
