package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.MotivoInhabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionResponseDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/motivos-inhabilitacion")
public class MotivoInhabilitacionController {

    private final MotivoInhabilitacionService motivoInhabilitacionService;

    public MotivoInhabilitacionController(MotivoInhabilitacionService motivoInhabilitacionService) {
        this.motivoInhabilitacionService = motivoInhabilitacionService;
    }

    @GetMapping
    public ResponseEntity<List<MotivoInhabilitacionResponseDTO>> listarMotivos() {
        return ResponseEntity.ok(motivoInhabilitacionService.listarMotivos());
    }

    @PostMapping
    public ResponseEntity<MotivoInhabilitacionResponseDTO> crearMotivo(@Valid @RequestBody MotivoInhabilitacionRequestDTO dto) {
        MotivoInhabilitacionResponseDTO response = motivoInhabilitacionService.crearMotivo(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
