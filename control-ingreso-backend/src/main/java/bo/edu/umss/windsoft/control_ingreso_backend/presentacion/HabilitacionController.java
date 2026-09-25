package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/habilitaciones", "/api/habilitacion", "/habilitacion"})
public class HabilitacionController {

    private final HabilitacionService habilitacionService;

    public HabilitacionController(HabilitacionService habilitacionService) {
        this.habilitacionService = habilitacionService;
    }

    @GetMapping
    public ResponseEntity<List<HabilitacionResponseDto>> obtenerHabilitaciones(
            @RequestParam(required = false) Integer idAsignatura) {
        if (idAsignatura != null) {
            return ResponseEntity.ok(habilitacionService.obtenerPorAsignatura(idAsignatura));
        }
        return ResponseEntity.ok(habilitacionService.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HabilitacionResponseDto> obtenerHabilitacionPorId(@PathVariable Integer id) {
        HabilitacionResponseDto dto = habilitacionService.obtenerPorId(id);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabilitacionResponseDto> actualizarHabilitacion(
            @PathVariable Integer id,
            @Valid @RequestBody HabilitacionRequestDto request) {
        HabilitacionResponseDto actualizado = habilitacionService.actualizarHabilitacion(id, request);
        return ResponseEntity.ok(actualizado);
    }
}

