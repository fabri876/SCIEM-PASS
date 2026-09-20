// presentacion/HorarioRegularController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HorarioRegularService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.HorarioRegularRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HorarioRegular;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/horarios-regulares")
public class HorarioRegularController {

    private final HorarioRegularService horarioRegularService;

    public HorarioRegularController(HorarioRegularService horarioRegularService) {
        this.horarioRegularService = horarioRegularService;
    }

    @PostMapping
    public ResponseEntity<HorarioRegular> crear(@Valid @RequestBody HorarioRegularRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(horarioRegularService.crear(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HorarioRegular> actualizar(
            @PathVariable Integer id, @Valid @RequestBody HorarioRegularRequest request) {
        return ResponseEntity.ok(horarioRegularService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Integer id) {
        horarioRegularService.desactivar(id);
        return ResponseEntity.noContent().build(); // 204
    }

    @GetMapping
    public ResponseEntity<List<HorarioRegular>> listar(
            @RequestParam Integer idUsuario,
            @RequestParam Integer codsisDocente,
            @RequestParam Integer idAsignatura) {
        return ResponseEntity.ok(horarioRegularService.listar(idUsuario, codsisDocente, idAsignatura));
    }
}