package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

public class ValidacionNegocioException extends RuntimeException {
    public ValidacionNegocioException(String mensaje) {
        super(mensaje);
    }
}
