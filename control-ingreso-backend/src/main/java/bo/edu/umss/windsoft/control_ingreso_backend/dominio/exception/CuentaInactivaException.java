package bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception;

public class CuentaInactivaException extends RuntimeException {
    public CuentaInactivaException(String mensaje) {
        super(mensaje);
    }
}
