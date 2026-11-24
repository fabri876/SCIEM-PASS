package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository usuarios;
    private final bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver roles;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository usuarios,
                                   bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.TipoUsuarioResolver roles) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.usuarios = usuarios;
        this.roles = roles;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = extraerToken(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.validarToken(token)) {
            String correo = jwtTokenProvider.obtenerCorreo(token);
            String rol = jwtTokenProvider.obtenerRol(token);

            var usuario = usuarios.findById(jwtTokenProvider.obtenerIdUsuario(token));
            if (rol != null && correo != null && usuario.isPresent() && Boolean.TRUE.equals(usuario.get().getEstadousuario())
                    && correo.equalsIgnoreCase(usuario.get().getCorreousuario())
                    && rol.equals(roles.resolver(usuario.get().getIdusuario()))
                    && jwtTokenProvider.credencialVigente(token, usuario.get().getIdusuario(), usuario.get().getContraseniausuario())) {
                String authorityName = rol.startsWith("ROLE_") ? rol : "ROLE_" + rol;
                SimpleGrantedAuthority authority = new SimpleGrantedAuthority(authorityName);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(correo, null, Collections.singletonList(authority));
                authentication.setDetails(jwtTokenProvider.obtenerIdUsuario(token));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extraerToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
