package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import org.springframework.context.ApplicationEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Punto unico para publicar la trazabilidad facial segura. */
@Service
public class AuditoriaFacialService {
    private static final Logger logger = LoggerFactory.getLogger(AuditoriaFacialService.class);
    private final ApplicationEventPublisher eventPublisher;

    public AuditoriaFacialService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void publicar(String accion, String ejecutor, String afectado, String ip,
                         String origen, String detalles) {
        String detalleSeguro = "origen=" + valor(origen) + " | " + detallesSeguros(detalles);
        eventPublisher.publishEvent(new EventoAuditoriaFacial(accion, ejecutor, afectado, ip, detalleSeguro));
    }

    private String valor(String valor) {
        return valor == null || valor.isBlank() ? "-" : valor;
    }

    private String detallesSeguros(String detalles) {
        String resultado = valor(detalles);
        String normalizado = resultado.toLowerCase(java.util.Locale.ROOT);
        if (normalizado.contains("photo_path") || normalizado.contains("fotografia")
                || normalizado.contains("embedding") || normalizado.contains("token")
                || normalizado.contains("contrasen") || normalizado.contains("password")) {
            logger.warn("Se omitieron detalles sensibles de un evento facial [{}]", resultado.length());
            return "detalle_omitido=datos_sensibles";
        }
        return resultado;
    }
}
