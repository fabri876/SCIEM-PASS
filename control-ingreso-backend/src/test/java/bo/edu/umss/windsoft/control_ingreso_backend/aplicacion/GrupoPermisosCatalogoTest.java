package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.*;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ValidacionNegocioException;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class GrupoPermisosCatalogoTest {
    @Mock GrupoRepository grupos;
    @Mock DocenteGrupoRepository docentes;
    @Mock UsuarioRepository usuarios;
    @InjectMocks GrupoService servicio;
    @AfterEach void limpiar(){SecurityContextHolder.clearContext();}
    private void sesion(String rol){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("docente@example.test",null,List.of(new SimpleGrantedAuthority("ROLE_"+rol))));}
    @Test void administradorValidaCatalogoSinRepetirConsultas(){
        sesion("ADMINISTRADOR");var grupo=new Grupo(10,"2",null);grupo.setIdGrupo(7);
        servicio.validarAccesoRegistro(List.of(7),"DOCENTE",Map.of(7,grupo));verifyNoInteractions(grupos,docentes,usuarios);
        grupo.setEstadoGrupo(false);assertThrows(ValidacionNegocioException.class,()->servicio.validarAccesoRegistro(List.of(7),"DOCENTE",Map.of(7,grupo)));
    }
    @Test void catalogoPrecargadoNoConcedeGruposAUnDocenteAjeno(){
        sesion("DOCENTE");var u=new Usuario();u.setIdusuario(5);when(usuarios.findByCorreousuario(any())).thenReturn(Optional.of(u));
        var grupo=new Grupo(10,"2",null);grupo.setIdGrupo(7);
        assertThrows(AccessDeniedException.class,()->servicio.validarAccesoRegistro(List.of(7),"ESTUDIANTE",Map.of(7,grupo)));
        verify(docentes).existsByIdUsuarioAndIdGrupo(5,7);
    }
    @Test void invitadoNoPuedeUsarElCatalogoParaRegistrar(){
        assertThrows(AccessDeniedException.class,()->servicio.validarAccesoRegistro(List.of(7),"DOCENTE",Map.of(7,new Grupo(10,"2",null))));
    }
}
