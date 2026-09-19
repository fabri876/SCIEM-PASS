// presentacion/AsignaturaController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignaturaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asignaturas")
public class AsignaturaController {

    private final AsignaturaService asignaturaService;

    public AsignaturaController(AsignaturaService asignaturaService) {
        this.asignaturaService = asignaturaService;
    }

    @GetMapping("/por-docente")
    public ResponseEntity<List<Asignatura>> porDocente(
            @RequestParam Integer idUsuario,
            @RequestParam Integer codsisDocente) {
        return ResponseEntity.ok(asignaturaService.obtenerPorDocente(idUsuario, codsisDocente));
    }
}