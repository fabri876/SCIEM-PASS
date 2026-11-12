package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenFinalizacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenFinalizadoRespuestaDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/examenes")
public class FinalizacionExamenController {
    private final ExamenFinalizacionService finalizacionService;

    public FinalizacionExamenController(ExamenFinalizacionService finalizacionService) {
        this.finalizacionService = finalizacionService;
    }

    @PostMapping("/{id}/finalizar")
    @PreAuthorize("hasRole('DOCENTE')")
    public ResponseEntity<ExamenFinalizadoRespuestaDto> finalizar(@PathVariable Integer id,
                                                                    HttpServletRequest request) {
        return ResponseEntity.ok(finalizacionService.finalizar(id, ClientIpResolver.resolver(request)));
    }
}
