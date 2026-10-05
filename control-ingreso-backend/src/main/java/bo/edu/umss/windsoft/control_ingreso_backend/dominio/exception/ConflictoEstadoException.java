package bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception;

/**
 * 409: la operación es válida pero el estado actual no la permite
 * (aula llena, ingreso cerrado, estudiante retirado, incidencia ya cerrada...).
 */
public class ConflictoEstadoException extends RuntimeException {
    public ConflictoEstadoException(String mensaje) {
        super(mensaje);
    }
}
