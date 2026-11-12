package bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception;

/**
 * Error transitorio de la sincronización offline (HU21): el registro se puede
 * volver a enviar más adelante porque su causa va a desaparecer por sí sola.
 *
 * El caso típico: una incidencia creada sin conexión para un estudiante cuyo
 * ingreso todavía no se ha sincronizado. Si se rechazara la incidencia de
 * inmediato, se perdería para siempre.
 */
public class ReintentarSincronizacionException extends RuntimeException {

    public ReintentarSincronizacionException(String mensaje) {
        super(mensaje);
    }
}
