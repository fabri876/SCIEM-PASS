package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenPublicoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CambioExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CambioExamenDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenPublicoDto;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/publico/examenes")
public class ExamenPublicoController {
    private final ExamenPublicoService examenes;
    private final CambioExamenService cambios;
    public ExamenPublicoController(ExamenPublicoService examenes, CambioExamenService cambios) { this.examenes = examenes; this.cambios = cambios; }
    @GetMapping("/cambios")
    public List<CambioExamenDto> cambios() { return cambios.recientes(); }
    @GetMapping("/proximos")
    public List<ExamenPublicoDto> proximos() { return examenes.proximos(); }
}
