package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository.Datos;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IntentoExamenIncorrectoRepository.Guardado;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class IntentoExamenIncorrectoServiceTest {
    private final IntentoExamenIncorrectoRepository repo = mock(IntentoExamenIncorrectoRepository.class);
    private final AuditoriaService auditoria = mock(AuditoriaService.class);
    private final IntentoExamenIncorrectoService service = new IntentoExamenIncorrectoService(repo, auditoria);
    private final Datos datos = new Datos(UUID.randomUUID(), 1, 2, 3, 4, 5, 6, "SIS", 7, 8, 9);

    @Test void insertaYRegistraAuditoria() {
        when(repo.insertar(datos)).thenReturn(Optional.of(10));
        assertEquals(10, service.registrar(datos, "op", "est", "ip").idIntento());
        verify(auditoria).registrarEnTransaccion(eq("INTENTO_EXAMEN_INCORRECTO"), eq("op"), eq("est"),
                contains("intento=10"), eq("ip"));
    }
    @Test void repeticionRecuperaOriginalSinSegundaAuditoria() {
        when(repo.insertar(datos)).thenReturn(Optional.empty());
        when(repo.buscar(datos.solicitud())).thenReturn(Optional.of(new Guardado(10, datos)));
        assertEquals(10, service.registrar(datos, "op", "est", "ip").idIntento());
        verifyNoInteractions(auditoria);
    }
    @Test void reutilizarClaveParaOtraPersonaEsRechazado() {
        when(repo.insertar(datos)).thenReturn(Optional.empty());
        var distinto = new Datos(datos.solicitud(), 1, 2, 3, 4, 99, 6, "SIS", null, null, null);
        when(repo.buscar(datos.solicitud())).thenReturn(Optional.of(new Guardado(10, distinto)));
        assertThrows(IllegalArgumentException.class, () -> service.registrar(datos, "op", "est", "ip"));
        verifyNoInteractions(auditoria);
    }
    @Test void errorAuditoriaSePropagaParaRevertirTransaccion() {
        when(repo.insertar(datos)).thenReturn(Optional.of(10));
        doThrow(new IllegalStateException("error"))
                .when(auditoria).registrarEnTransaccion(anyString(), any(), any(), anyString(), any());
        assertThrows(IllegalStateException.class, () -> service.registrar(datos, "op", "est", "ip"));
    }
    @Test void metodoInvalidoNoSeGuarda() {
        var incorrecto = new Datos(datos.solicitud(), 1, 2, 3, 4, 5, 6, null, null, null, null);
        assertThrows(IllegalArgumentException.class, () -> service.registrar(incorrecto, "op", "est", "ip"));
        verifyNoInteractions(repo, auditoria);
    }

    @Test void sincronizacionConservaHoraDeVerificacion() {
        var momento = LocalDateTime.of(2026, 11, 7, 8, 30);
        when(repo.insertar(datos, momento)).thenReturn(Optional.of(11));
        assertEquals(11, service.registrar(datos, "op", "est", "ip", "offline", momento).idIntento());
        verify(repo).insertar(datos, momento);
        verify(auditoria).registrarEnTransaccion(eq("INTENTO_EXAMEN_INCORRECTO"), eq("op"), eq("est"), contains("offline"), eq("ip"));
    }
}
