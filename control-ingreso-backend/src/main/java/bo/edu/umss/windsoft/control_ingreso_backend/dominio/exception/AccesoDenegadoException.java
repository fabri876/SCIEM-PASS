package bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception;

/** 403 con un mensaje propio (por ejemplo "No es docente de esta materia."). */
public class AccesoDenegadoException extends RuntimeException {
    public AccesoDenegadoException(String mensaje) {
        super(mensaje);
    }
}
