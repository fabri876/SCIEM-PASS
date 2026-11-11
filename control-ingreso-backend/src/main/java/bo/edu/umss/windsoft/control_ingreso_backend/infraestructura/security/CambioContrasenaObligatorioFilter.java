package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Hace obligatorio el cambio de clave aunque se borre sessionStorage en el navegador.
 * El JWT ya fue verificado por JwtAuthenticationFilter antes de ejecutar este filtro.
 */
@Component
public class CambioContrasenaObligatorioFilter extends OncePerRequestFilter {

    private static final String RUTA_CAMBIO = "/api/auth/cambiar-contrasena";
    private final UsuarioRepository usuarioRepository;

    public CambioContrasenaObligatorioFilter(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (HttpMethod.OPTIONS.matches(request.getMethod()) || rutaPermitida(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getName())) {
            Object detalle = authentication.getDetails();
            if (detalle instanceof Integer idUsuario) {
                Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
                if (usuario != null && Boolean.TRUE.equals(usuario.getDebeCambiarContrasena())) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write("{\"mensaje\":\"Debes cambiar tu contraseña inicial antes de continuar.\"}");
                    return;
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean rutaPermitida(HttpServletRequest request) {
        return HttpMethod.POST.matches(request.getMethod()) && RUTA_CAMBIO.equals(request.getRequestURI());
    }
}
