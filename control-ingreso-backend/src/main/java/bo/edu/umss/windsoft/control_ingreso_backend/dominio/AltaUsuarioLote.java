package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import java.util.LinkedHashSet;
import java.util.Set;

/** Persona ya validada. La clave que contiene Usuario es siempre un hash individual. */
public record AltaUsuarioLote(Usuario usuario, String rol, Integer codigoSis, Set<Integer> grupos) {
    public AltaUsuarioLote {
        grupos = new LinkedHashSet<>(grupos);
    }
}
