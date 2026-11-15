package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Escribe el evento solo despues del commit; AuditoriaService nunca propaga su fallo. */
@Component
public class AuditoriaFacialListener {
    private final AuditoriaService auditoriaService;

    public AuditoriaFacialListener(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void registrar(EventoAuditoriaFacial evento) {
        auditoriaService.registrar(evento.accion(), evento.ejecutor(), evento.afectado(),
                evento.detalles(), evento.ip());
    }
}
