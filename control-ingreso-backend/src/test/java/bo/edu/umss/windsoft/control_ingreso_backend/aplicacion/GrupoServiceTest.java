package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ValidacionNegocioException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GrupoServiceTest {
    @Mock GrupoRepository grupos;
    @Mock AsignaturaRepository asignaturas;
    @Mock DocenteGrupoRepository docenteGrupos;
    @Mock EstudianteGrupoRepository estudianteGrupos;
    @Mock AyudanteGrupoRepository ayudanteGrupos;
    @Mock UsuarioRepository usuarios;
    @Mock DocenteRepository docentes;
    @Mock EstudianteRepository estudiantes;
    @Mock AyudanteRepository ayudantes;
    @Mock DocenteAsignaturaRepository docenteAsignaturas;
    @InjectMocks GrupoService servicio;

    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }
    private void grupo() {
        Grupo g = new Grupo(2008054, "2", null); g.setIdGrupo(7);
        when(grupos.findById(7)).thenReturn(Optional.of(g));
    }
    @Test void asignarDocenteMantieneRelacionUsadaPorExamenesYSisReal() {
        grupo(); when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        servicio.asignarDocenteAGrupo(5, null, 7);
        verify(docenteAsignaturas).save(argThat(a -> a.getId().getCodsisdocente().equals(98765)
                && a.getId().getIdasignatura().equals(2008054)));
        verify(docenteGrupos).save(argThat(g -> g.getCodSisDocente().equals(98765)));
    }
    @Test void repetirAsignacionNoDuplicaRelaciones() {
        grupo(); when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        when(docenteAsignaturas.existsById(any())).thenReturn(true);
        when(docenteGrupos.existsByIdUsuarioAndIdGrupo(5, 7)).thenReturn(true);
        servicio.asignarDocenteAGrupo(5, null, 7);
        verify(docenteAsignaturas, never()).save(any()); verify(docenteGrupos, never()).save(any());
    }
    @Test void rechazaSisInventado() {
        grupo(); when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        assertThrows(ValidacionNegocioException.class, () -> servicio.asignarDocenteAGrupo(5, 5, 7));
        verify(docenteGrupos, never()).save(any());
    }
    @Test void inscripcionUsaElSisDelEstudiante() {
        grupo(); when(estudiantes.findByIdusuario(4)).thenReturn(Optional.of(new Estudiante(4, 202309099)));
        servicio.inscribirEstudianteAGrupo(4, null, 7);
        verify(estudianteGrupos).save(argThat(g -> g.getCodSisEstudiante().equals(202309099)));
    }
    @Test void noAsignaUnUsuarioSinRolAyudante() {
        grupo(); assertThrows(ValidacionNegocioException.class, () -> servicio.asignarAyudanteAGrupo(4, 7));
        verify(ayudanteGrupos, never()).save(any());
    }
    @Test void unEstudianteNoPuedeModificarVinculaciones() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("est", null,
                List.of(new SimpleGrantedAuthority("ROLE_ESTUDIANTE"))));
        assertThrows(AccessDeniedException.class, () -> servicio.validarAccesoRegistro(List.of(7), "ESTUDIANTE"));
        verifyNoInteractions(grupos);
    }
    @Test void docenteSoloPuedeInscribirEnSusPropiosGrupos() {
        grupo(); SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("doc", null,
                List.of(new SimpleGrantedAuthority("ROLE_DOCENTE"))));
        Usuario u = new Usuario(); u.setIdusuario(5);
        when(usuarios.findByCorreousuario("doc")).thenReturn(Optional.of(u));
        assertThrows(AccessDeniedException.class, () -> servicio.validarAccesoRegistro(List.of(7), "ESTUDIANTE"));
        when(docenteGrupos.existsByIdUsuarioAndIdGrupo(5, 7)).thenReturn(true);
        assertDoesNotThrow(() -> servicio.validarAccesoRegistro(List.of(7), "ESTUDIANTE"));
    }
}
