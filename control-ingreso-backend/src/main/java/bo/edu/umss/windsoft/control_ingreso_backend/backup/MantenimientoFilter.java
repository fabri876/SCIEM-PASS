package bo.edu.umss.windsoft.control_ingreso_backend.backup;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@ConditionalOnProperty(prefix = "backup", name = "enabled", havingValue = "true")
public class MantenimientoFilter extends OncePerRequestFilter {

    @Autowired private BackupService backupService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        boolean esBackup = request.getRequestURI().startsWith("/api/admin/backups");
        if (backupService.isRestaurando() && !esBackup) {
            response.setStatus(503);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"mensaje\":\"Sistema en mantenimiento: restauración de base de datos en curso\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
