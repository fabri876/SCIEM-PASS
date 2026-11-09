package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.RegistroExpulsionService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExpulsionListaDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * HU14 · Expulsiones del usuario autenticado.
 * Endpoints:
 *   GET /api/expulsiones/pendientes → pendientes de todos mis exámenes (sin pedir idExamen)
 *   GET /api/expulsiones/historial  → historial con filtros por materia y estado
 */
@RestController
@RequestMapping("/api/expulsiones")
public class MisExpulsionesController {

    private final RegistroExpulsionService registroExpulsionService;

    public MisExpulsionesController(RegistroExpulsionService registroExpulsionService) {
        this.registroExpulsionService = registroExpulsionService;
    }

    @GetMapping("/pendientes")
    public ResponseEntity<List<ExpulsionListaDto>> pendientes(HttpServletRequest request) {
        List<ExpulsionListaDto> lista = registroExpulsionService.listarPendientesDeMisExamenes(
                ClientIpResolver.resolver(request));
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/historial")
    public ResponseEntity<List<ExpulsionListaDto>> historial(
            @RequestParam(required = false) String asignatura,
            @RequestParam(required = false) String estado,
            HttpServletRequest request) {
        List<ExpulsionListaDto> lista = registroExpulsionService.listarHistorialDeMisExamenes(
                ClientIpResolver.resolver(request), asignatura, estado);
        return ResponseEntity.ok(lista);
    }
}
