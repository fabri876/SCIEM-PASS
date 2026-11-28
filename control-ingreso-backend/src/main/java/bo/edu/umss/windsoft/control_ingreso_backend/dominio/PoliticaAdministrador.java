package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Reglas puras del administrador unico del sistema.
 *
 * <p>El prototipo admite como maximo una cuenta con rol ADMINISTRADOR. La
 * garantia definitiva vive en la base de datos (indice unico sobre {@code admin});
 * estas reglas solo producen un mensaje claro antes de intentar escribir.</p>
 */
public final class PoliticaAdministrador {

    private static final Pattern PATRON_CORREO_INSTITUCIONAL =
            Pattern.compile("^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+@umss\\.edu\\.bo$");

    private static final List<String> PALABRAS_RESERVADAS_CORREO = List.of(
            "admin", "administrador", "root", "test", "usuario"
    );

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

    /**
     * Exige un correo institucional UMSS valido (ej. nombre.apellido@umss.edu.bo)
     * sin palabras reservadas o genericas para la cuenta del administrador.
     */
    public static void validarCorreoInstitucional(String correo) {
        String normalizado = correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
        if (!PATRON_CORREO_INSTITUCIONAL.matcher(normalizado).matches()) {
            throw new SolicitudInvalidaException(
                    "El correo del administrador debe ser institucional con formato nombre.apellido@umss.edu.bo.");
        }
        String parteLocal = normalizado.split("@", 2)[0];
        for (String reservada : PALABRAS_RESERVADAS_CORREO) {
            if (parteLocal.contains(reservada)) {
                throw new SolicitudInvalidaException(
                        "El correo del administrador no puede contener palabras reservadas como admin, administrador, root, test o usuario.");
            }
        }
    }
}
