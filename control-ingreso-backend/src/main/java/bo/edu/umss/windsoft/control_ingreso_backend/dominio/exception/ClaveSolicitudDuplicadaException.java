package bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception;

/**
 * La misma clave de solicitud llegó dos veces (doble clic, reintento o dos pestañas).
 *
 * <p>No es un rechazo: la incidencia ya está guardada. Se marca aparte para que el flujo
 * pueda reintentar la operación (en una transacción nueva) y devolver la incidencia ya
 * creada, en lugar de un 409. Así dos registros simultáneos con la misma clave terminan
 * los dos en 201 y no se crea una segunda expulsión (BUG-001).
 */
public class ClaveSolicitudDuplicadaException extends RuntimeException {

    public ClaveSolicitudDuplicadaException(String mensaje) {
        super(mensaje);
    }

    public ClaveSolicitudDuplicadaException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
