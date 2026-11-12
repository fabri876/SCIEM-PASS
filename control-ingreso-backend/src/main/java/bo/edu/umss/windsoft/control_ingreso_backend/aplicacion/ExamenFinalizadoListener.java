package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ExamenFinalizadoListener {
    private final AuditoriaService auditoriaService;

    public ExamenFinalizadoListener(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void registrarFinalizacionConfirmada(ExamenFinalizadoEvent event) {
        auditoriaService.registrar("FINALIZACION_EXAMEN_CONFIRMADA", event.correoDocente(), null,
                "examen=" + event.idExamen() + ", finalizadoEn=" + event.finalizadoEn(), event.ip());
    }
}
