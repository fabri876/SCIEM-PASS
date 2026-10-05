package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

public enum SeveridadIncidencia {
    BAJA("Baja"),
    MEDIA("Media"),
    ALTA("Alta");

    private final String etiqueta;

    SeveridadIncidencia(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }
}
