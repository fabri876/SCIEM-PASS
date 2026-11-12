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
    @Test void estudianteRecibeUnAvisoConSuAulaDelMismoRepartoQueControlIngreso(){
        var auth=new UsernamePasswordAuthenticationToken("prueba@example.test",null,List.of(new SimpleGrantedAuthority("ROLE_ESTUDIANTE")));auth.setDetails(42);
        SecurityContextHolder.getContext().setAuthentication(auth);
        var eventos=mock(NotificacionEventoRepository.class);
        var aulas=mock(AsignacionAulaService.class);
        var fecha=java.time.OffsetDateTime.parse("2026-11-11T14:00:00-04:00");
        when(eventos.propios(42,"ESTUDIANTE")).thenReturn(List.of(new NotificacionEventoRepository.Evento(7,10,1,"PROGRAMADO","Examen programado","Registro",fecha,"Cálculo",java.time.LocalDate.of(2026,11,20),"Aula A, Aula B","08:00 - 10:00",100)));
        var ambiente=new bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ambiente();
        ambiente.setIdAmbiente(2);ambiente.setHoraInicio(java.time.LocalTime.of(8,0));ambiente.setHoraFin(java.time.LocalTime.of(10,0));
        when(aulas.aulaAsignada(1,10,100)).thenReturn(java.util.Optional.of(new AsignacionAulaService.AulaExamen(ambiente,"Aula B",null,30)));
        var resultado=new NotificacionesService(mock(ExamenPublicoRepository.class),mock(CambioExamenRepository.class),eventos,aulas).propios();
        assertEquals(1,resultado.eventos().size());
        var aviso=resultado.eventos().getFirst();
        assertTrue(aviso.strDescripcion().contains("Aula B"));
        assertFalse(aviso.strDescripcion().contains("Aula A"));
        assertEquals(fecha,aviso.fecha());
        verify(aulas).aulaAsignada(1,10,100);
    }
}
