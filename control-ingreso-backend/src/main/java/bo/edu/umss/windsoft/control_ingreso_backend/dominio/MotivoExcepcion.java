package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/** Motivos válidos de ingreso excepcional (CHECK ck_ingreso_motivo en la BD). */
public enum MotivoExcepcion {
    SIN_CARNET_QR("Sin carnet o QR"),
    NO_FIGURA_EN_LISTA("No figura en la lista"),
    LLEGADA_TARDIA("Llegada tardía"),
    TRASLADO_AULA("Traslado desde otra aula"),
    FALLO_FACIAL("Fallo de verificación facial"),
    SIN_ENROLAMIENTO_FACIAL("Sin enrolamiento facial");

    private final String etiqueta;

    MotivoExcepcion(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    /** Motivos que puede autorizar el operador desde el control de ingreso. */
    public boolean esFacial() {
        return this == FALLO_FACIAL || this == SIN_ENROLAMIENTO_FACIAL;
    }
}
