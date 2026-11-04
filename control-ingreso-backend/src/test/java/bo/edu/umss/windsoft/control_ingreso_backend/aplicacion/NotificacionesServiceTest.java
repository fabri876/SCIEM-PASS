package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class NotificacionesServiceTest {
    @AfterEach void limpiar(){SecurityContextHolder.clearContext();}
    @Test void invitadoNoConsultaDatos(){
        var examenes=mock(ExamenPublicoRepository.class);var cambios=mock(CambioExamenRepository.class);
        assertThrows(AccessDeniedException.class,()->new NotificacionesService(examenes,cambios).propios());
        verifyNoInteractions(examenes,cambios);
    }
    @Test void identidadProvieneDeLaSesion(){
        var auth=new UsernamePasswordAuthenticationToken("prueba@example.test",null,List.of(new SimpleGrantedAuthority("ROLE_ESTUDIANTE")));auth.setDetails(42);
        SecurityContextHolder.getContext().setAuthentication(auth);
        var examenes=mock(ExamenPublicoRepository.class);var cambios=mock(CambioExamenRepository.class);
        new NotificacionesService(examenes,cambios).propios();
        verify(examenes).proximosParaUsuario(any(),any(),eq(42),eq("ESTUDIANTE"));
        verify(cambios).recientesParaUsuario(42,"ESTUDIANTE");
    }
}
