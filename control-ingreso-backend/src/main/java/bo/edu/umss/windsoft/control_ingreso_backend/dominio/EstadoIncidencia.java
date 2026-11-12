package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

/**
 * ABIERTA → EN_REVISION → CERRADA. Desde CERRADA no se vuelve atrás.
 *
 * REVOCADA (HU21) es el estado final de una incidencia que el docente canceló
 * (por ejemplo, una expulsión que se levanto por error de identificación).
 * Revocar es cancelar: la incidencia deja de estar en vigor, pero no se borra
 * ni se reabre.
 *
 * La columna "incidencia.estadoincidencia" tiene el CHECK
 * {@code ck_incidencia_estado}: hay que aplicar la migración
 * {@code docs/migraciones/2026-11-12_hu21_estado_incidencia_revocada.sql}
 * para que PostgreSQL admita este valor.
 */
public enum EstadoIncidencia {
    ABIERTA("Abierta"),
    EN_REVISION("En revisión"),
    CERRADA("Cerrada"),
    REVOCADA("Revocada");

    private final String etiqueta;

    EstadoIncidencia(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }
}
