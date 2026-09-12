package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/habilitaciones")
public class HabilitacionController {

    private final HabilitacionService habilitacionService;

    public HabilitacionController(HabilitacionService habilitacionService) {
        this.habilitacionService = habilitacionService;
    }

    @GetMapping
    public ResponseEntity<List<HabilitacionResponseDTO>> listarHabilitaciones() {
        return ResponseEntity.ok(habilitacionService.listarHabilitaciones());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HabilitacionResponseDTO> obtenerPorId(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(habilitacionService.obtenerPorId(id));
    }

    @GetMapping("/estudiante/{codsis}")
    public ResponseEntity<HabilitacionResponseDTO> obtenerPorEstudiante(@PathVariable("codsis") Integer codsis) {
        return ResponseEntity.ok(habilitacionService.obtenerUltimaPorEstudiante(codsis));
    }

    @PostMapping
    public ResponseEntity<HabilitacionResponseDTO> registrarHabilitacion(@Valid @RequestBody HabilitacionRequestDTO dto) {
        HabilitacionResponseDTO response = habilitacionService.registrarHabilitacion(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabilitacionResponseDTO> actualizarHabilitacion(@PathVariable("id") Integer id,
                                                                         @Valid @RequestBody HabilitacionRequestDTO dto) {
        HabilitacionResponseDTO response = habilitacionService.actualizarHabilitacion(id, dto);
        return ResponseEntity.ok(response);
    }
}
