package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.SincronizarIntentoOfflineService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/sync/intentos-examen-incorrecto")
public class SincronizarIntentoOfflineController {
    private final SincronizarIntentoOfflineService servicio;
    private final ContextoUsuarioService contexto;
    public SincronizarIntentoOfflineController(SincronizarIntentoOfflineService servicio, ContextoUsuarioService contexto) {
        this.servicio = servicio; this.contexto = contexto;
    }
    @PostMapping
    @PreAuthorize("hasAnyRole('OPERADOR','DOCENTE','ADMINISTRADOR')")
    public Map<String, Object> sincronizar(@RequestBody SincronizarIntentoOfflineService.Solicitud solicitud,
                                           HttpServletRequest request) {
        int id = servicio.sincronizar(solicitud, contexto.actual().idUsuario(), ClientIpResolver.resolver(request));
        return Map.of("registrado", true, "idIntento", id);
    }
}
