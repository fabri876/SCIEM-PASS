package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/**
 * Estado de una expulsión (HU14).
 * PENDIENTE → el Docente/Administrador decide:
 *   AUTORIZADA (bloquea el reingreso) o DENEGADA (se deja sin efecto).
 * Una vez decidida no se puede volver a decidir.
 */
public enum EstadoExpulsion {
    PENDIENTE("Pendiente de autorización"),
    AUTORIZADA("Autorizada"),
    DENEGADA("Denegada");

    private final String etiqueta;

    EstadoExpulsion(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }
}
