package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/** Acciones aplicables a una incidencia, ordenadas de menor a mayor severidad. */
public enum AccionIncidencia {
    REGISTRO("Registro de la incidencia", 1),
    ADVERTENCIA_VERBAL("Advertencia verbal", 2),
    ADVERTENCIA_ESCRITA("Advertencia escrita", 3),
    CAMBIO_ASIENTO("Cambio de asiento", 4),
    RETIRO_MATERIAL("Retiro del material o dispositivo", 5),
    DESCUENTO_PUNTAJE("Descuento de puntos", 6),
    ANULACION_PREGUNTA("Anulación de una pregunta o sección", 7),
    ANULACION_EXAMEN("Anulación del examen", 8),
    OTRO("Otro", 9);

    private final String etiqueta;
    private final int nivel;

    AccionIncidencia(String etiqueta, int nivel) {
        this.etiqueta = etiqueta;
        this.nivel = nivel;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    public int getNivel() {
        return nivel;
    }
}
