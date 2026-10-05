package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/** Tipos de incidencia (CHECK ck_incidencia_tipo en la BD). */
public enum TipoIncidencia {
    SUPLANTACION("Suplantación de identidad"),
    OBJETO_PROHIBIDO("Objeto prohibido"),
    CONDUCTA_INAPROPIADA("Conducta inapropiada"),
    FALLA_TECNICA("Falla técnica"),
    PROBLEMA_AULA("Problema del aula"),
    OTRO("Otro");

    private final String etiqueta;

    TipoIncidencia(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }
}
