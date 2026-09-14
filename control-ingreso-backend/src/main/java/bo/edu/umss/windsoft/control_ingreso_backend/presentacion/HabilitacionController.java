package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public ResponseEntity<List<HabilitacionResponseDto>> obtenerHabilitaciones() {
        List<HabilitacionResponseDto> lista = habilitacionService.obtenerTodas();
        return ResponseEntity.ok(lista);
    }
}
