package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AuditoriaFacialListenerTest {
    @Test
    void registrar_delegaEnModoNoBloqueante() {
        AuditoriaService auditoria = mock(AuditoriaService.class);
        AuditoriaFacialListener listener = new AuditoriaFacialListener(auditoria);
        EventoAuditoriaFacial evento = new EventoAuditoriaFacial("FACIAL_QR_AUTORIZADO", "est@umss.edu",
                "est@umss.edu", "127.0.0.1", "origen=estudiante_web | examen=3");

        listener.registrar(evento);

        verify(auditoria).registrar("FACIAL_QR_AUTORIZADO", "est@umss.edu", "est@umss.edu",
                "origen=estudiante_web | examen=3", "127.0.0.1");
    }
}
