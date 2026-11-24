package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtRevocacionCredencialesTest {
    private final JwtTokenProvider tokens = new JwtTokenProvider("clave-ficticia-test-no-utilizar-en-produccion-1234567890", 60000);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final TipoUsuarioResolver roles = mock(TipoUsuarioResolver.class);
    private final JwtAuthenticationFilter filtro = new JwtAuthenticationFilter(tokens, usuarios, roles);

    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }

    @Test void cambioDeClaveYDeRolInvalidanTokenAnterior() throws Exception {
        Usuario usuario = new Usuario("1234567", "Prueba", "Local", null, "cuenta@example.invalid", "hash-anterior", true);
        usuario.setIdusuario(42);
        when(usuarios.findById(42)).thenReturn(Optional.of(usuario));
        when(roles.resolver(42)).thenReturn("ADMINISTRADOR");
        String token = tokens.generarToken(usuario.getCorreousuario(), "ADMINISTRADOR", 42, "Prueba", "hash-anterior");
        autenticar(token);
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());

        usuario.setContraseniausuario("hash-nuevo");
        SecurityContextHolder.clearContext();
        autenticar(token);
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        usuario.setContraseniausuario("hash-anterior");
        when(roles.resolver(42)).thenReturn("DOCENTE");
        SecurityContextHolder.clearContext();
        autenticar(token);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private void autenticar(String token) throws Exception {
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        filtro.doFilter(request, new MockHttpServletResponse(), (req, res) -> {});
    }
}
