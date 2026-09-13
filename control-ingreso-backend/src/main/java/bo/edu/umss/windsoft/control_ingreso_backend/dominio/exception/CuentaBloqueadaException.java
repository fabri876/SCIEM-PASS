package bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception;

public class CuentaBloqueadaException extends RuntimeException {
    public CuentaBloqueadaException(String mensaje) {
        super(mensaje);
    }
}
