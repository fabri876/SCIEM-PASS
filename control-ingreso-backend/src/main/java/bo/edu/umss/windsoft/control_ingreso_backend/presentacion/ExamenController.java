package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/examenes")
public class ExamenController {

    private final ExamenService examenService;

    public ExamenController(ExamenService examenService) {
        this.examenService = examenService;
    }

    @PostMapping
    public ResponseEntity<Examen> registrarExamen(
            @Valid @RequestBody ExamenRequest request) {

        Examen examen = examenService.registrarExamen(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(examen);
    }

    @GetMapping
    public ResponseEntity<List<Examen>> obtenerExamenes() {

        return ResponseEntity.ok(
                examenService.obtenerExamenes()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Examen> obtenerExamenPorId(
            @PathVariable Integer id) {

        return ResponseEntity.ok(
                examenService.obtenerExamenPorId(id)
        );
    }
}