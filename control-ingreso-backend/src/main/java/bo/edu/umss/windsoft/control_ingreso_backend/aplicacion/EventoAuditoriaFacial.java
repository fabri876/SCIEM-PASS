package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

/**
 * Hecho facial ya confirmado por la transaccion de negocio. No debe contener
 * fotografia, rutas, embeddings, tokens ni material biometrico crudo.
 */
public record EventoAuditoriaFacial(String accion, String ejecutor, String afectado,
                                    String ip, String detalles) {
}
