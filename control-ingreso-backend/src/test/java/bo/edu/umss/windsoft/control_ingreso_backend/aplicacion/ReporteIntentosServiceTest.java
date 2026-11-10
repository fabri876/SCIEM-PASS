package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ReporteIntentosRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReporteIntentosServiceTest {
    private final ReporteIntentosRepository repo = mock(ReporteIntentosRepository.class);
    private final ReporteIntentosService service = new ReporteIntentosService(repo);

    @Test void docenteSoloConsultaSusExamenes() {
        var usuario = new ContextoUsuarioService.UsuarioActual(12, "docente@example.invalid", "DOCENTE");
        var fecha = LocalDate.of(2026, 11, 6);
        when(repo.listar(12, 4, 8, "DUPLICADO", fecha, "texto")).thenReturn(List.of());
        assertTrue(service.listar(usuario, 4, 8, "DUPLICADO_BLOQUEADO", fecha, "texto").isEmpty());
        verify(repo).listar(12, 4, 8, "DUPLICADO", fecha, "texto");
    }

    @Test void administradorConsultaTodos() {
        var usuario = new ContextoUsuarioService.UsuarioActual(1, "admin@example.invalid", "ADMINISTRADOR");
        service.listar(usuario, null, null, "AULA_DIFERENTE", null, null);
        verify(repo).listar(null, null, null, "AMBIENTE_DIFERENTE", null, null);
    }

    @Test void catalogoRespetaRolInclusoSinIntentos() {
        var docente = new ContextoUsuarioService.UsuarioActual(12, "docente@example.invalid", "DOCENTE");
        var admin = new ContextoUsuarioService.UsuarioActual(1, "admin@example.invalid", "ADMINISTRADOR");
        service.catalogo(docente);
        service.catalogo(admin);
        verify(repo).catalogo(12);
        verify(repo).catalogo(null);
        assertThrows(AccessDeniedException.class, () -> service.catalogo(
                new ContextoUsuarioService.UsuarioActual(5, "operador@example.invalid", "OPERADOR")));
        verifyNoMoreInteractions(repo);
    }

    @Test void otrosRolesYDocenteSinIdSonRechazados() {
        assertThrows(AccessDeniedException.class, () -> service.listar(
                new ContextoUsuarioService.UsuarioActual(1, "x", "OPERADOR"), null, null, null, null, null));
        assertThrows(AccessDeniedException.class, () -> service.listar(
                new ContextoUsuarioService.UsuarioActual(null, "x", "DOCENTE"), null, null, null, null, null));
        verifyNoInteractions(repo);
    }
}
