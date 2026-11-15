package bo.edu.umss.windsoft.control_ingreso_backend.backup;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/backups")
@PreAuthorize("hasRole('ROLE_ADMINISTRADOR')")
public class BackupController {

    @Autowired private BackupService backupService;

    // ADAPTAR: debe devolver el UUID del admin según cómo guardes el id en tu JWT
    private String adminId(Authentication auth) {
        return auth.getDetails().toString();
    }

    private ResponseEntity<?> error(Exception e) {
        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", e.getMessage());
        return ResponseEntity.status(500).body(body);
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
    public ResponseEntity<?> generar(Authentication auth) {
        try {
            return ResponseEntity.ok(backupService.generar(adminId(auth), "GENERAR"));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/{nombre}/descarga")
    public ResponseEntity<?> descargar(@PathVariable String nombre, Authentication auth) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("url", backupService.urlDescarga(nombre, adminId(auth)));
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return error(e);
        }
    }

    @PostMapping("/{nombre}/restaurar")
    public ResponseEntity<?> restaurar(@PathVariable String nombre, Authentication auth) {
        try {
            backupService.restaurar(nombre, adminId(auth));
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