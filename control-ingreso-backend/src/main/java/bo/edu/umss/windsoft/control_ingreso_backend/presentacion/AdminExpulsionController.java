package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.RegistroExpulsionService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExpulsionListaDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * HU14 · Reporte global de expulsiones (solo Administrador, solo lectura).
 * GET /api/admin/expulsiones
 */
@RestController
@RequestMapping("/api/admin/expulsiones")
public class AdminExpulsionController {

    private final RegistroExpulsionService registroExpulsionService;

    public AdminExpulsionController(RegistroExpulsionService registroExpulsionService) {
        this.registroExpulsionService = registroExpulsionService;
    }

    @GetMapping
    public ResponseEntity<List<ExpulsionListaDto>> listarTodas(HttpServletRequest request) {
        List<ExpulsionListaDto> lista = registroExpulsionService.listarTodas(
                ClientIpResolver.resolver(request));
        return ResponseEntity.ok(lista);
    }
}
