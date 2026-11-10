package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CambioContrasenaObligatorioFilterTest {

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void bloqueaOtraApiMientrasLaClaveInicialSiguePendiente() throws Exception {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        Usuario usuario = new Usuario();
        usuario.setDebeCambiarContrasena(true);
        when(usuarios.findById(9)).thenReturn(Optional.of(usuario));
        CambioContrasenaObligatorioFilter filtro = new CambioContrasenaObligatorioFilter(usuarios);
        autenticar(9);

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        StringWriter salida = new StringWriter();
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/admin/usuarios");
        when(response.getWriter()).thenReturn(new PrintWriter(salida));

        filtro.doFilter(request, response, chain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(chain, never()).doFilter(any(), any());
        assertTrue(salida.toString().contains("cambiar tu contraseña inicial"));
    }

    @Test
    void permiteCambiarLaClavePendiente() throws Exception {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        CambioContrasenaObligatorioFilter filtro = new CambioContrasenaObligatorioFilter(usuarios);
        autenticar(9);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/auth/cambiar-contrasena");

        filtro.doFilter(request, response, chain);

        verifyNoInteractions(usuarios);
        verify(chain).doFilter(request, response);
    }

    private void autenticar(int idUsuario) {
        var autenticacion = new UsernamePasswordAuthenticationToken("usuario@umss.edu", null,
                List.of(new SimpleGrantedAuthority("ROLE_ESTUDIANTE")));
        autenticacion.setDetails(idUsuario);
        SecurityContextHolder.getContext().setAuthentication(autenticacion);
    }
}
