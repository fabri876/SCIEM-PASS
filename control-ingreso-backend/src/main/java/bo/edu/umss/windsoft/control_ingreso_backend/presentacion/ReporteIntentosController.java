package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ReporteIntentosService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReporteIntentoDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reportes/intentos-incorrectos")
public class ReporteIntentosController {
    private final ReporteIntentosService service;
    private final ContextoUsuarioService contexto;
    public ReporteIntentosController(ReporteIntentosService service, ContextoUsuarioService contexto) {
        this.service = service; this.contexto = contexto;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DOCENTE','ADMINISTRADOR')")
    public List<ReporteIntentoDto> listar(@RequestParam(required = false) Integer idAsignatura,
            @RequestParam(required = false) Integer idExamen, @RequestParam(required = false) String motivo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) String busqueda) {
        return service.listar(contexto.actual(), idAsignatura, idExamen, motivo, fecha, busqueda);
    }
}
