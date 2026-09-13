package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenResponseDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/examenes")
public class ExamenController {

    private final ExamenService examenService;

    public ExamenController(ExamenService examenService) {
        this.examenService = examenService;
    }

    @GetMapping
    public ResponseEntity<List<ExamenResponseDTO>> listarExamenes(
            @RequestParam(name = "idAsignatura", required = false) Integer idAsignatura) {
        if (idAsignatura != null) {
            return ResponseEntity.ok(examenService.listarPorAsignatura(idAsignatura));
        }
        return ResponseEntity.ok(examenService.listarExamenes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamenResponseDTO> obtenerPorId(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(examenService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<ExamenResponseDTO> crearExamen(@Valid @RequestBody ExamenRequestDTO dto) {
        ExamenResponseDTO response = examenService.crearExamen(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
