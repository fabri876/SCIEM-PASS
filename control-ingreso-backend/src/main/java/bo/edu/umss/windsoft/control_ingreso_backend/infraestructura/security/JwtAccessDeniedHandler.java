package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuditoriaService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ErrorResponseDto;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    // HU06: un rol sin permiso que intenta entrar a estas rutas queda en
    // auditoría como ACCESO_DENEGADO (criterio de QA).
    private static final List<String> RUTAS_AUDITADAS = List.of("/api/incidencias", "/api/ingresos-excepcionales");

    private final ObjectMapper objectMapper;
    private final AuditoriaService auditoriaService;

    public JwtAccessDeniedHandler(ObjectMapper objectMapper, AuditoriaService auditoriaService) {
        this.objectMapper = objectMapper;
        this.auditoriaService = auditoriaService;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                        AccessDeniedException accessDeniedException) throws IOException {
        auditarSiCorresponde(request);

        ErrorResponseDto errorDto = new ErrorResponseDto(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                "Acceso denegado: no cuenta con los permisos necesarios para realizar esta acción.");

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(errorDto));
    }

    private void auditarSiCorresponde(HttpServletRequest request) {
        String ruta = request.getRequestURI();
        if (RUTAS_AUDITADAS.stream().noneMatch(ruta::startsWith)) {
            return;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String correo = auth == null ? null : auth.getName();
        String rol = auth == null ? "-" : auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.replaceFirst("^ROLE_", ""))
                .collect(Collectors.joining(","));
        auditoriaService.registrar("ACCESO_DENEGADO", correo, correo,
                "Rol " + rol + " intentó " + request.getMethod() + " " + ruta, ClientIpResolver.resolver(request));
    }
}
