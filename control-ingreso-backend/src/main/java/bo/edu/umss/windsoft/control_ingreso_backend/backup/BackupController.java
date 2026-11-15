package bo.edu.umss.windsoft.control_ingreso_backend.backup;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/backups")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@ConditionalOnProperty(prefix = "backup", name = "enabled", havingValue = "true")
public class BackupController {

    private final BackupService backupService;
    private final ContextoUsuarioService contextoUsuarioService;

    // ADAPTAR: debe devolver el UUID del admin según cómo guardes el id en tu JWT
    public BackupController(BackupService backupService, ContextoUsuarioService contextoUsuarioService) {
        this.backupService = backupService;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    private String adminId() {
        return String.valueOf(contextoUsuarioService.actual().idUsuario());
    }

    private ResponseEntity<?> error(Exception e) {
        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", e.getMessage());
        HttpStatus estado = e instanceof IllegalStateException ? HttpStatus.CONFLICT : HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(estado).body(body);
    }

    @GetMapping
    public ResponseEntity<?> listar() {
        try {
            return ResponseEntity.ok(backupService.listar());
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping
    public ResponseEntity<?> generar() {
        try {
            return ResponseEntity.ok(backupService.generar(adminId(), "GENERAR"));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/{nombre}/descarga")
    public ResponseEntity<?> descargar(@PathVariable String nombre) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("url", backupService.urlDescarga(nombre, adminId()));
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/{nombre}/restaurar")
    public ResponseEntity<?> restaurar(@PathVariable String nombre) {
        try {
            backupService.restaurar(nombre, adminId());
            Map<String, Object> body = new HashMap<>();
            body.put("mensaje", "Restauración completada");
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/bitacora")
    public ResponseEntity<?> bitacora() {
        return ResponseEntity.ok(backupService.bitacora());
    }

    @GetMapping("/estado")
    public ResponseEntity<?> estado() {
        Map<String, Object> body = new HashMap<>();
        body.put("restaurando", backupService.isRestaurando());
        return ResponseEntity.ok(body);
    }
}
