package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CarreraEstudianteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/estudiantes")
public class CarreraEstudianteController {
    private final CarreraEstudianteService service;
    public CarreraEstudianteController(CarreraEstudianteService service) { this.service = service; }

    @PutMapping("/{usuario}/carreras/{carrera}")
    public ResponseEntity<Void> vincular(@PathVariable Integer usuario, @PathVariable Integer carrera) {
        service.vincular(usuario, carrera);
        return ResponseEntity.noContent().build();
    }
}
