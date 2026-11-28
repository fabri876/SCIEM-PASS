package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.util.Locale;
import java.util.Optional;

/** Reglas puras compartidas para una contraseña de nivel 8. */
public final class PoliticaContrasena {

    private static final String[] PALABRAS_COMUNES = {
            "password", "contrasena", "contraseña", "qwerty", "admin", "administrador", "root"
    };

    private PoliticaContrasena() {
    }

    public static Optional<String> validarNivelOcho(String contrasena) {
        if (contrasena == null || contrasena.length() < 12) {
            return Optional.of("La nueva contraseña debe tener al menos 12 caracteres.");
        }
        if (!contrasena.matches(".*[a-z].*")) {
            return Optional.of("La nueva contraseña debe incluir una minúscula.");
        }
        if (!contrasena.matches(".*[A-Z].*")) {
            return Optional.of("La nueva contraseña debe incluir una mayúscula.");
        }
        if (!contrasena.matches(".*\\d.*")) {
            return Optional.of("La nueva contraseña debe incluir un número.");
        }
        if (!contrasena.matches(".*[^A-Za-z0-9\\s].*")) {
            return Optional.of("La nueva contraseña debe incluir un carácter especial.");
        }
        if (contrasena.toLowerCase(Locale.ROOT).matches(".*(.)\\1\\1.*")) {
            return Optional.of("La nueva contraseña no puede repetir un carácter tres veces.");
        }
        if (contieneSecuencia(contrasena)) {
            return Optional.of("La nueva contraseña no puede incluir secuencias como abc o 123.");
        }
        return Optional.empty();
    }

    public static Optional<String> validarCambio(String contrasenaActual, String nuevaContrasena) {
        return validarCambio(contrasenaActual, nuevaContrasena, null);
    }

    public static Optional<String> validarCambio(String contrasenaActual, String nuevaContrasena, String correo) {
        Optional<String> errorNivel = validarNivelOcho(nuevaContrasena);
        if (errorNivel.isPresent()) {
            return errorNivel;
        }
        if (nuevaContrasena.equals(contrasenaActual)) {
            return Optional.of("La nueva contraseña debe ser distinta de la actual.");
        }
        if (contrasenaActual != null && !contrasenaActual.isBlank()
                && nuevaContrasena.toLowerCase(Locale.ROOT).contains(contrasenaActual.toLowerCase(Locale.ROOT))) {
            return Optional.of("La nueva contraseña no puede contener la contraseña actual.");
        }
        return validarPalabrasComunesYCorreo(nuevaContrasena, correo);
    }

    /** Reglas adicionales para credenciales privilegiadas; nunca devuelve la clave. */
    public static Optional<String> validarAdministrador(String contrasena, String ci, String correo) {
        Optional<String> nivel = validarNivelOcho(contrasena);
        if (nivel.isPresent()) return nivel;
        if (contrasena.length() > 256) return Optional.of("La contraseña no puede superar 256 caracteres.");
        Optional<String> errorComunOCorreo = validarPalabrasComunesYCorreo(contrasena, correo);
        if (errorComunOCorreo.isPresent()) {
            return errorComunOCorreo;
        }
        String valor = contrasena.toLowerCase(Locale.ROOT);
        String carnet = ci == null ? "" : ci.trim().toLowerCase(Locale.ROOT);
        if (!carnet.isEmpty() && valor.contains(carnet)) {
            return Optional.of("La contraseña no puede contener el carnet de identidad.");
        }
        return Optional.empty();
    }

    private static Optional<String> validarPalabrasComunesYCorreo(String contrasena, String correo) {
        String valor = contrasena.toLowerCase(Locale.ROOT);
        for (String patron : PALABRAS_COMUNES) {
            if (valor.contains(patron)) {
                return Optional.of("La nueva contraseña no puede contener palabras comunes como admin, root o password.");
            }
        }
        if (correo != null && !correo.isBlank()) {
            String parteLocal = correo.trim().split("@", 2)[0].toLowerCase(Locale.ROOT);
            if (parteLocal.length() >= 3 && valor.contains(parteLocal)) {
                return Optional.of("La nueva contraseña no puede contener el nombre del correo.");
            }
            for (String segmento : parteLocal.split("[^a-z0-9]+")) {
                if (segmento.length() >= 3 && valor.contains(segmento)) {
                    return Optional.of("La nueva contraseña no puede contener partes del correo.");
                }
            }
        }
        return Optional.empty();
    }

    private static boolean contieneSecuencia(String contrasena) {
        String valor = contrasena.toLowerCase(Locale.ROOT);
        for (int i = 0; i <= valor.length() - 3; i++) {
            char primero = valor.charAt(i);
            char segundo = valor.charAt(i + 1);
            char tercero = valor.charAt(i + 2);
            if ((Character.isLetter(primero) && Character.isLetter(segundo) && Character.isLetter(tercero))
                    || (Character.isDigit(primero) && Character.isDigit(segundo) && Character.isDigit(tercero))) {
                int pasoUno = segundo - primero;
                int pasoDos = tercero - segundo;
                if ((pasoUno == 1 && pasoDos == 1) || (pasoUno == -1 && pasoDos == -1)) {
                    return true;
                }
            }
        }
        return false;
    }
}
