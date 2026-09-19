// presentacion/ExamenController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HorarioRegular;
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
    public ResponseEntity<Examen> registrarExamen(@Valid @RequestBody ExamenRequest request) {
        Examen examen = examenService.registrarExamen(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(examen);
    }

    // NUEVO: el frontend llama esto al elegir la asignatura, para mostrar
    // los horarios/aulas regulares ya registrados antes de crear el examen.
    @GetMapping("/horarios-regulares")
    public ResponseEntity<List<HorarioRegular>> obtenerHorariosRegulares(
            @RequestParam Integer idUsuario,
            @RequestParam Integer codsisDocente,
            @RequestParam Integer idAsignatura) {

        return ResponseEntity.ok(
                examenService.obtenerHorariosRegulares(idUsuario, codsisDocente, idAsignatura));
    }

    @GetMapping
    public ResponseEntity<List<Examen>> obtenerExamenes() {
        return ResponseEntity.ok(examenService.obtenerExamenes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Examen> obtenerExamenPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(examenService.obtenerExamenPorId(id));
    }
}