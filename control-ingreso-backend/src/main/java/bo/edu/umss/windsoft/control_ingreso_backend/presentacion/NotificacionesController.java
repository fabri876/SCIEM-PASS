package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.NotificacionesService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionesController {
    private final NotificacionesService servicio;
    public NotificacionesController(NotificacionesService servicio){this.servicio=servicio;}
    @GetMapping public NotificacionesService.Avisos propias(
            @RequestParam(required=false) Integer carrera,
            @RequestParam(required=false) Integer nivel,
            @RequestParam(required=false) Integer asignatura){return servicio.propios(carrera,nivel,asignatura);}
}
