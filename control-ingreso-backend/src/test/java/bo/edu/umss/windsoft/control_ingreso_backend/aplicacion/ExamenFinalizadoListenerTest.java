package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ExamenFinalizadoListenerTest {

    @Mock
    private AuditoriaService auditoriaService;

    @InjectMocks
    private ExamenFinalizadoListener listener;

    @Test
    void registrarFinalizacionConfirmada_registraAuditoria() {
        LocalDateTime ahora = LocalDateTime.now();
        ExamenFinalizadoEvent evento = new ExamenFinalizadoEvent(15, 2, "docente@umss.edu", ahora, "192.168.1.10");

        listener.registrarFinalizacionConfirmada(evento);

        verify(auditoriaService).registrar("FINALIZACION_EXAMEN_CONFIRMADA", "docente@umss.edu", null,
                "examen=15, finalizadoEn=" + ahora, "192.168.1.10");
    }
}

