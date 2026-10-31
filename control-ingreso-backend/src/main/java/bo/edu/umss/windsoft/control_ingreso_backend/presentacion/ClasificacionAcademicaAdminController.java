package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ClasificacionAcademicaService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/admin/academico/clasificacion")
public class ClasificacionAcademicaAdminController {
    private final ClasificacionAcademicaService servicio;
    public ClasificacionAcademicaAdminController(ClasificacionAcademicaService servicio){this.servicio=servicio;}
    public record Solicitud(Integer idAsignatura,Integer idCarrera,Integer idNivel) {}
    @PostMapping public void vincular(@RequestBody Solicitud datos){servicio.vincular(datos.idAsignatura(),datos.idCarrera(),datos.idNivel());}
}
