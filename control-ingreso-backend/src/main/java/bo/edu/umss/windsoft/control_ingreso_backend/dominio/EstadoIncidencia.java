package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/** ABIERTA → EN_REVISION → CERRADA. Desde CERRADA no se vuelve atrás. */
public enum EstadoIncidencia {
    ABIERTA("Abierta"),
    EN_REVISION("En revisión"),
    CERRADA("Cerrada");

    private final String etiqueta;

    EstadoIncidencia(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }
}
