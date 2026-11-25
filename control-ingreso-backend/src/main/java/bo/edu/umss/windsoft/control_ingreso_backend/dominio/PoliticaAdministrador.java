package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;

/**
 * Reglas puras del administrador unico del sistema.
 *
 * <p>El prototipo admite como maximo una cuenta con rol ADMINISTRADOR. La
 * garantia definitiva vive en la base de datos (indice unico sobre {@code admin});
 * estas reglas solo producen un mensaje claro antes de intentar escribir.</p>
 */
public final class PoliticaAdministrador {

    private PoliticaAdministrador() {
    }

    /** Impide asignar el rol cuando ya existe una cuenta administradora. */
    public static void validarPuedeExistirOtro(long administradoresActuales) {
        if (administradoresActuales >= 1) {
            throw new SolicitudInvalidaException(
                    "Ya existe una cuenta con rol Administrador. Solo se permite un administrador.");
        }
    }

    /** Impide dejar al sistema sin su unico administrador. */
    public static void validarPuedeRetirarse(long administradoresActuales) {
        if (administradoresActuales <= 1) {
            throw new SolicitudInvalidaException(
                    "No se puede quitar ni desactivar al unico administrador del sistema.");
        }
    }
}
