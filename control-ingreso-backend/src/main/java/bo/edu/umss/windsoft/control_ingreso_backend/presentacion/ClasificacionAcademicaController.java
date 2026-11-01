package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ClasificacionAcademicaService;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ClasificacionAcademicaRepository.*;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/catalogo-academico")
public class ClasificacionAcademicaController {
    private final ClasificacionAcademicaService servicio;
    public ClasificacionAcademicaController(ClasificacionAcademicaService servicio){this.servicio=servicio;}
    @GetMapping("/carreras") public List<Carrera> carreras(){return servicio.carreras();}
    @GetMapping("/carreras/{carrera}/niveles") public List<Nivel> niveles(@PathVariable Integer carrera){return servicio.niveles(carrera);}
    @GetMapping("/asignaturas") public List<Materia> materias(@RequestParam Integer carrera,@RequestParam Integer nivel){return servicio.materias(carrera,nivel);}
}
