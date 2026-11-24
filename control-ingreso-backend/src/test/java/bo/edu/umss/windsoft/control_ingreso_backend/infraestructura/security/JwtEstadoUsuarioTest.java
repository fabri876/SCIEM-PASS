package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class JwtEstadoUsuarioTest {
    @Mock JwtTokenProvider tokens;
    @Mock UsuarioRepository usuarios;
    @Mock TipoUsuarioResolver roles;
    @Mock FilterChain cadena;
    @InjectMocks JwtAuthenticationFilter filtro;
    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }
    private void solicitar(Boolean estado) throws Exception {
        when(tokens.validarToken("token")).thenReturn(true);
        when(tokens.obtenerCorreo("token")).thenReturn("persona@example.test");
        when(tokens.obtenerRol("token")).thenReturn("ESTUDIANTE");
        when(tokens.obtenerIdUsuario("token")).thenReturn(4);
        if (estado != null) {
            Usuario u = new Usuario(); u.setIdusuario(4); u.setCorreousuario("persona@example.test"); u.setEstadousuario(estado); u.setContraseniausuario("hash");
            when(usuarios.findById(4)).thenReturn(Optional.of(u));
            if (Boolean.TRUE.equals(estado)) {
                when(roles.resolver(4)).thenReturn("ESTUDIANTE");
                when(tokens.credencialVigente("token", 4, "hash")).thenReturn(true);
            }
        } else when(usuarios.findById(4)).thenReturn(Optional.empty());
        MockHttpServletRequest request = new MockHttpServletRequest(); request.addHeader("Authorization", "Bearer token");
        filtro.doFilter(request, new MockHttpServletResponse(), cadena);
    }
    @Test void tokenDeCuentaInactivaNoAutentica() throws Exception {
        solicitar(false); assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
    @Test void tokenDeCuentaEliminadaNoAutentica() throws Exception {
        solicitar(null); assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
    @Test void cuentaActivaConTokenValidoAccede() throws Exception {
        solicitar(true); assertTrue(SecurityContextHolder.getContext().getAuthentication().isAuthenticated());
    }
}
