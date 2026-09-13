package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.RolCatalogoService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RolRespuestaDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/roles")
public class RolController {

    private final RolCatalogoService rolCatalogoService;

    public RolController(RolCatalogoService rolCatalogoService) {
        this.rolCatalogoService = rolCatalogoService;
    }

    @GetMapping
    public ResponseEntity<List<RolRespuestaDto>> listar() {
        return ResponseEntity.ok(rolCatalogoService.listar());
    }
}
