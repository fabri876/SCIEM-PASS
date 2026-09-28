package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.MotivoInhabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @GetMapping("/{id}")
    public ResponseEntity<MotivoInhabilitacionResponseDto> obtenerMotivoPorId(@PathVariable Integer id) {
        MotivoInhabilitacionResponseDto dto = motivoService.obtenerPorId(id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<MotivoInhabilitacionResponseDto> crearMotivo(
            @Valid @RequestBody MotivoInhabilitacionRequestDto request) {
        MotivoInhabilitacionResponseDto nuevoMotivo = motivoService.crearMotivo(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoMotivo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MotivoInhabilitacionResponseDto> actualizarMotivo(
            @PathVariable Integer id,
            @Valid @RequestBody MotivoInhabilitacionRequestDto request) {
        MotivoInhabilitacionResponseDto actualizado = motivoService.actualizarMotivo(id, request);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarMotivo(@PathVariable Integer id) {
        motivoService.eliminarMotivo(id);
        return ResponseEntity.noContent().build();
    }
}

