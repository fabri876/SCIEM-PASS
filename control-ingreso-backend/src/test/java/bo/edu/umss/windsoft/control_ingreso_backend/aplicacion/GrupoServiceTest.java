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
    @Mock
    GrupoRepository grupos;
    @Mock
    AsignaturaRepository asignaturas;
    @Mock
    DocenteGrupoRepository docenteGrupos;
    @Mock
    EstudianteGrupoRepository estudianteGrupos;
    @Mock
    AyudanteGrupoRepository ayudanteGrupos;
    @Mock
    UsuarioRepository usuarios;
    @Mock
    DocenteRepository docentes;
    @Mock
    EstudianteRepository estudiantes;
    @Mock
    AyudanteRepository ayudantes;
    @Mock
    DocenteAsignaturaRepository docenteAsignaturas;
    @InjectMocks
    GrupoService servicio;

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private void grupo() {
        Grupo g = new Grupo(2008054, "2", null);
        g.setIdGrupo(7);
        when(grupos.findById(7)).thenReturn(Optional.of(g));
    }

    @Test
    void asignarDocenteMantieneRelacionUsadaPorExamenesYSisReal() {
        grupo();
        when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        servicio.asignarDocenteAGrupo(5, null, 7);
        verify(docenteAsignaturas).save(argThat(a -> a.getId().getCodsisdocente().equals(98765)
                && a.getId().getIdasignatura().equals(2008054)));
        verify(docenteGrupos).save(argThat(g -> g.getCodSisDocente().equals(98765)));
    }

    @Test
    void repetirAsignacionNoDuplicaRelaciones() {
        grupo();
        when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        when(docenteAsignaturas.existsById(any())).thenReturn(true);
        when(docenteGrupos.existsByIdUsuarioAndIdGrupo(5, 7)).thenReturn(true);
        servicio.asignarDocenteAGrupo(5, null, 7);
        verify(docenteAsignaturas, never()).save(any());
        verify(docenteGrupos, never()).save(any());
    }

    @Test
    void rechazaSisInventado() {
        grupo();
        when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        assertThrows(ValidacionNegocioException.class, () -> servicio.asignarDocenteAGrupo(5, 5, 7));
        verify(docenteGrupos, never()).save(any());
    }

    @Test
    void inscripcionUsaElSisDelEstudiante() {
        grupo();
        when(estudiantes.bloquearParaInscripcion(4)).thenReturn(Optional.of(new Estudiante(4, 202309099)));
        servicio.inscribirEstudianteAGrupo(4, null, 7);
        verify(estudianteGrupos).save(argThat(g -> g.getCodSisEstudiante().equals(202309099)));
    }

    @Test
    void noAsignaUnUsuarioSinRolAyudante() {
        grupo();
        assertThrows(ValidacionNegocioException.class, () -> servicio.asignarAyudanteAGrupo(4, 7));
        verify(ayudanteGrupos, never()).save(any());
    }

    @Test
    void estudianteNoPuedeInscribirseEnOtroGrupoDeLaMismaMateria() {
        grupo();
        when(estudiantes.bloquearParaInscripcion(4)).thenReturn(Optional.of(new Estudiante(4, 202309099)));
        when(estudianteGrupos.existeOtroGrupoEnAsignatura(4, 2008054, 7)).thenReturn(true);
        assertThrows(ValidacionNegocioException.class, () -> servicio.inscribirEstudianteAGrupo(4, null, 7));
        verify(estudianteGrupos, never()).save(any());
    }

    @Test
    void estudiantePuedeRepetirElMismoGrupoSinDuplicarInscripcion() {
        grupo();
        when(estudiantes.bloquearParaInscripcion(4)).thenReturn(Optional.of(new Estudiante(4, 202309099)));
        when(estudianteGrupos.existsByIdUsuarioAndIdGrupo(4, 7)).thenReturn(true);
        servicio.inscribirEstudianteAGrupo(4, null, 7);
        verify(estudianteGrupos, never()).save(any());
    }

    @Test
    void seleccionEstudianteRechazaDosGruposDeUnaAsignaturaPeroAceptaMateriasDistintas() {
        grupo();
        Grupo otro = new Grupo(2008054, "3", null);
        otro.setIdGrupo(8);
        when(grupos.findById(8)).thenReturn(Optional.of(otro));
        assertThrows(ValidacionNegocioException.class, () -> servicio.validarUnGrupoPorAsignatura(List.of(7, 8)));
        otro.setIdAsignatura(2008019);
        assertDoesNotThrow(() -> servicio.validarUnGrupoPorAsignatura(List.of(7, 8)));
    }

    @Test
    void unEstudianteNoPuedeModificarVinculaciones() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("est", null,
                List.of(new SimpleGrantedAuthority("ROLE_ESTUDIANTE"))));
        assertThrows(AccessDeniedException.class, () -> servicio.validarAccesoRegistro(List.of(7), "ESTUDIANTE"));
        verifyNoInteractions(grupos);
    }

    @Test
    void docenteSoloPuedeInscribirEnSusPropiosGrupos() {
        grupo();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("doc", null,
                List.of(new SimpleGrantedAuthority("ROLE_DOCENTE"))));
        Usuario u = new Usuario();
        u.setIdusuario(5);
        when(usuarios.findByCorreousuario("doc")).thenReturn(Optional.of(u));
        assertThrows(AccessDeniedException.class, () -> servicio.validarAccesoRegistro(List.of(7), "ESTUDIANTE"));
        when(docenteGrupos.existsByIdUsuarioAndIdGrupo(5, 7)).thenReturn(true);
        assertDoesNotThrow(() -> servicio.validarAccesoRegistro(List.of(7), "ESTUDIANTE"));
    }

    private void admin() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(1, null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR"))));
    }

    @Test
    void quitarAsignacionExigeAdministrador() {
        assertThrows(AccessDeniedException.class, () -> servicio.desvincularUsuario(5, "DOCENTE", 7));
        verifyNoInteractions(docenteGrupos, estudianteGrupos, ayudanteGrupos);
    }

    @Test
    void quitarUltimoGrupoDocenteLimpiaMateria() {
        admin();
        grupo();
        when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        when(docenteGrupos.findGruposByAsignaturaAndDocente(2008054, 5)).thenReturn(List.of());
        when(docenteAsignaturas.existsById(any())).thenReturn(true);
        servicio.desvincularUsuario(5, "DOCENTE", 7);
        verify(docenteGrupos).deleteByIdUsuarioAndIdGrupo(5, 7);
        verify(docenteAsignaturas).deleteById(any());
        verify(usuarios, never()).deleteById(any());
    }

    @Test
    void conservaMateriaSiDocenteTieneOtroGrupo() {
        admin();
        grupo();
        when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        when(docenteGrupos.findGruposByAsignaturaAndDocente(2008054, 5))
                .thenReturn(List.of(new Grupo(2008054, "3", null)));
        servicio.desvincularUsuario(5, "DOCENTE", 7);
        verify(docenteAsignaturas, never()).deleteById(any());
    }

    @Test
    void quitarEstudianteBloqueaInscripcionYConservaUsuario() {
        admin();
        grupo();
        when(estudiantes.bloquearParaInscripcion(4)).thenReturn(Optional.of(new Estudiante(4, 123)));
        servicio.desvincularUsuario(4, "ESTUDIANTE", 7);
        verify(estudianteGrupos).deleteByIdUsuarioAndIdGrupo(4, 7);
        verify(usuarios, never()).deleteById(any());
    }

    @Test
    void quitarAyudanteConservaCuenta() {
        admin();
        grupo();
        when(ayudantes.existsByIdusuario(4)).thenReturn(true);
        servicio.desvincularUsuario(4, "OPERADOR", 7);
        verify(ayudanteGrupos).deleteByIdUsuarioAndIdGrupo(4, 7);
        verify(usuarios, never()).deleteById(any());
    }

    @Test
    void cambiarGrupoEstudianteBorraAnteriorAntesDeInsertarNuevo() {
        admin();
        grupo();
        Grupo nuevo = new Grupo(2008054, "3", null);
        nuevo.setIdGrupo(8);
        when(grupos.findById(8)).thenReturn(Optional.of(nuevo));
        when(estudiantes.bloquearParaInscripcion(4)).thenReturn(Optional.of(new Estudiante(4, 123)));
        when(estudianteGrupos.findByIdUsuario(4)).thenReturn(List.of(new EstudianteGrupo(4, 123, 7)));
        servicio.reemplazarGruposUsuario(4, "ESTUDIANTE", List.of(8));
        InOrder orden = inOrder(estudianteGrupos);
        orden.verify(estudianteGrupos).deleteByIdUsuarioAndIdGrupo(4, 7);
        orden.verify(estudianteGrupos).flush();
        orden.verify(estudianteGrupos).existsByIdUsuarioAndIdGrupo(4, 8);
        orden.verify(estudianteGrupos).save(argThat(g -> g.getIdGrupo().equals(8)));
    }

    @Test
    void editarNoPermiteDosGruposDeLaMismaMateria() {
        admin();
        grupo();
        Grupo otro = new Grupo(2008054, "3", null);
        otro.setIdGrupo(8);
        when(grupos.findById(8)).thenReturn(Optional.of(otro));
        assertThrows(ValidacionNegocioException.class,
                () -> servicio.reemplazarGruposUsuario(4, "ESTUDIANTE", List.of(7, 8)));
        verify(estudianteGrupos, never()).deleteByIdUsuarioAndIdGrupo(any(), any());
        verify(estudianteGrupos, never()).save(any());
    }

    @Test
    void quitarTodosLosGruposEstudianteEsUnaCorreccionExplicita() {
        admin();
        grupo();
        when(estudiantes.bloquearParaInscripcion(4)).thenReturn(Optional.of(new Estudiante(4, 123)));
        when(estudianteGrupos.findByIdUsuario(4)).thenReturn(List.of(new EstudianteGrupo(4, 123, 7)));
        servicio.reemplazarGruposUsuario(4, "ESTUDIANTE", List.of());
        verify(estudianteGrupos).deleteByIdUsuarioAndIdGrupo(4, 7);
        verify(estudianteGrupos, never()).save(any());
    }

    @Test
    void quitarGrupoDocenteNoBorraRelacionNecesariaParaExamenes() {
        admin();
        grupo();
        when(docentes.findByIdusuario(5)).thenReturn(Optional.of(new Docente(5, 98765)));
        when(docenteGrupos.findGruposByAsignaturaAndDocente(2008054, 5)).thenReturn(List.of());
        when(docenteAsignaturas.existsById(any())).thenReturn(true);
        when(docenteAsignaturas.tieneRegistrosVinculados(5, 2008054)).thenReturn(true);
        servicio.desvincularUsuario(5, "DOCENTE", 7);
        verify(docenteGrupos).deleteByIdUsuarioAndIdGrupo(5, 7);
        verify(docenteAsignaturas, never()).deleteById(any());
    }
}
