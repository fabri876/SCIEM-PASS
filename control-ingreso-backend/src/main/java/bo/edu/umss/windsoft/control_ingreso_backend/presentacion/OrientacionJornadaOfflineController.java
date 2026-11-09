package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.OrientacionJornadaOfflineService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/control")
public class OrientacionJornadaOfflineController {
    private final OrientacionJornadaOfflineService service;
    private final ContextoUsuarioService contexto;
    public OrientacionJornadaOfflineController(OrientacionJornadaOfflineService service, ContextoUsuarioService contexto) {
        this.service = service; this.contexto = contexto;
    }

    @GetMapping("/orientacion-jornada")
    @PreAuthorize("hasAnyRole('OPERADOR','DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<OrientacionJornadaOfflineService.Jornada> descargar(
            @RequestParam("idasignatura") Integer idasignatura, @RequestParam("idexamen") Integer idexamen,
            @RequestParam("idambiente") Integer idambiente) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.descargar(contexto.actual().idUsuario(), idasignatura, idexamen, idambiente));
    }
}
