package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AuditoriaFacialServiceTest {
    @Test
    void publicar_omiteDetallesSensibles() {
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
        AuditoriaFacialService service = new AuditoriaFacialService(publisher);

        service.publicar("FACIAL_QR_AUTORIZADO", "est@umss.edu", "est@umss.edu", "127.0.0.1",
                "estudiante_web", "embedding=[0.12, 0.34]");

        org.mockito.ArgumentCaptor<EventoAuditoriaFacial> captor = org.mockito.ArgumentCaptor.forClass(EventoAuditoriaFacial.class);
        verify(publisher).publishEvent(captor.capture());
        assertTrue(captor.getValue().detalles().contains("detalle_omitido"));
        assertFalse(captor.getValue().detalles().contains("embedding="));
    }
}
