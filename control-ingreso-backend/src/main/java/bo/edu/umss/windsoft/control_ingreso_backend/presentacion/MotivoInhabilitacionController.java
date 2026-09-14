package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.MotivoInhabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/motivos-inhabilitacion", "/api/motivosinhabilitacion"})
public class MotivoInhabilitacionController {

    private final MotivoInhabilitacionService motivoService;

    public MotivoInhabilitacionController(MotivoInhabilitacionService motivoService) {
        this.motivoService = motivoService;
    }

    @GetMapping
    public ResponseEntity<List<MotivoInhabilitacionResponseDto>> obtenerMotivos() {
        List<MotivoInhabilitacionResponseDto> lista = motivoService.obtenerTodos();
        return ResponseEntity.ok(lista);
    }

    @PostMapping
    public ResponseEntity<MotivoInhabilitacionResponseDto> crearMotivo(
            @Valid @RequestBody MotivoInhabilitacionRequestDto request) {
        MotivoInhabilitacionResponseDto nuevoMotivo = motivoService.crearMotivo(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoMotivo);
    }
}
