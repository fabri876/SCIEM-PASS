package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.NotificacionesService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionesController {
    private final NotificacionesService servicio;
    public NotificacionesController(NotificacionesService servicio){this.servicio=servicio;}
    @GetMapping public NotificacionesService.Avisos propias(){return servicio.propios();}
}
