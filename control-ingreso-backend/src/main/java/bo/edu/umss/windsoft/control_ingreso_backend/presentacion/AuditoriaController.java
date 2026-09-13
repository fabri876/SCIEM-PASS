package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuditoriaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Auditoria;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AuditoriaRespuestaDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/auditoria")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @GetMapping
    public ResponseEntity<List<AuditoriaRespuestaDto>> listar() {
        List<AuditoriaRespuestaDto> respuesta = auditoriaService.listar().stream()
                .map(this::mapear)
                .toList();
        return ResponseEntity.ok(respuesta);
    }

    private AuditoriaRespuestaDto mapear(Auditoria auditoria) {
        return new AuditoriaRespuestaDto(auditoria.getIdAuditoria(), auditoria.getTipoOperacion(),
                auditoria.getUsuarioEjecutor(), auditoria.getUsuarioAfectado(), auditoria.getDetalles(),
                auditoria.getIpOrigen(), auditoria.getFechaHora());
    }
}
