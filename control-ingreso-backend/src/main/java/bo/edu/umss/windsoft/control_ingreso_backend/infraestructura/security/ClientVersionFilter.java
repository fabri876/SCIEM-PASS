package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Evita que un cliente offline anterior confirme ingresos sin conocer las
 * reglas nuevas de enrolamiento. Se activa de forma gradual con
 * CLIENT_MIN_VERSION; el valor 0 mantiene compatibilidad durante el rollout.
 */
@Component
public class ClientVersionFilter extends OncePerRequestFilter {
    private final int minVersion;

    public ClientVersionFilter(@Value("${client.min-version:0}") int minVersion) {
        this.minVersion = Math.max(0, minVersion);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (minVersion == 0 || "OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        String path = request.getRequestURI();
        return !(path.equals("/api/v1/control/ingresos")
                || path.equals("/api/v1/asistencias/batch-sync")
                || path.equals("/api/sync/ingresos-excepcionales")
                || (path.startsWith("/api/v1/examenes/") && path.endsWith("/nomina")));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        int version = parsearVersion(request.getHeader("X-App-Version"));
        if (version < minVersion) {
            response.setStatus(426);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"estado\":\"ACTUALIZACION_REQUERIDA\","
                    + "\"mensaje\":\"Actualiza la aplicacion antes de registrar ingresos.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private int parsearVersion(String valor) {
        try {
            return Integer.parseInt(valor);
        } catch (NumberFormatException | NullPointerException ex) {
            return 0;
        }
    }
}
