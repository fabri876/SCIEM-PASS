package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenFinalizadoRespuestaDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamenFinalizacionServiceTest {
    @Mock private ExamenRepository examenRepository;
    @Mock private ContextoUsuarioService contextoUsuarioService;
    @Mock private AuditoriaService auditoriaService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private ExamenFinalizacionService service;

    @Test
    void finalizar_propietarioDesactivaYPublicaEvento() {
        Examen examen = new Examen();
        examen.setIdExamen(10);
        examen.setIdUsuario(4);
        examen.setEstadoExamen(true);
        when(examenRepository.findById(10)).thenReturn(Optional.of(examen));
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(4, "docente@umss.edu", "DOCENTE"));

        ExamenFinalizadoRespuestaDto respuesta = service.finalizar(10, "127.0.0.1");

        assertFalse(examen.getEstadoExamen());
        assertTrue(respuesta.finalizado());
        assertTrue(respuesta.cambioAplicado());
        verify(examenRepository).save(examen);
        verify(auditoriaService).registrarEnTransaccion("FINALIZACION_EXAMEN", "docente@umss.edu", null,
                "examen=10", "127.0.0.1");
        ArgumentCaptor<ExamenFinalizadoEvent> evento = ArgumentCaptor.forClass(ExamenFinalizadoEvent.class);
        verify(eventPublisher).publishEvent(evento.capture());
        assertEquals(10, evento.getValue().idExamen());
    }

    @Test
    void finalizar_docenteAjenoEsRechazado() {
        Examen examen = new Examen();
        examen.setIdExamen(10);
        examen.setIdUsuario(4);
        examen.setEstadoExamen(true);
        when(examenRepository.findById(10)).thenReturn(Optional.of(examen));
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(9, "otro@umss.edu", "DOCENTE"));

        assertThrows(AccesoDenegadoException.class, () -> service.finalizar(10, "127.0.0.1"));

        verify(examenRepository, never()).save(examen);
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void finalizar_administradorEsRechazado() {
        Examen examen = new Examen();
        examen.setIdExamen(10);
        examen.setIdUsuario(4);
        examen.setEstadoExamen(true);
        when(examenRepository.findById(10)).thenReturn(Optional.of(examen));
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(1, "admin@umss.edu", "ADMINISTRADOR"));

        assertThrows(AccesoDenegadoException.class, () -> service.finalizar(10, "127.0.0.1"));

        verify(examenRepository, never()).save(examen);
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void finalizar_examenInexistenteEsRechazado() {
        when(examenRepository.findById(999)).thenReturn(Optional.empty());
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(4, "docente@umss.edu", "DOCENTE"));

        assertThrows(RecursoNoEncontradoException.class, () -> service.finalizar(999, "127.0.0.1"));

        verify(examenRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void finalizar_dobleLlamadaNoDuplicaEvento() {
        Examen examen = new Examen();
        examen.setIdExamen(10);
        examen.setIdUsuario(4);
        examen.setEstadoExamen(false);
        when(examenRepository.findById(10)).thenReturn(Optional.of(examen));
        when(contextoUsuarioService.actual()).thenReturn(new ContextoUsuarioService.UsuarioActual(4, "docente@umss.edu", "DOCENTE"));

        ExamenFinalizadoRespuestaDto respuesta = service.finalizar(10, "127.0.0.1");

        assertTrue(respuesta.finalizado());
        assertFalse(respuesta.cambioAplicado());
        verify(examenRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
}
