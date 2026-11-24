package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.LocalDiskStorage;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {
    private final LocalDiskStorage almacenamientoBiometrico;

    public HealthController(LocalDiskStorage almacenamientoBiometrico) {
        this.almacenamientoBiometrico = almacenamientoBiometrico;
    }

    /**
     * Endpoint liviano y público para verificar la disponibilidad del servidor.
     * Utilizado para el modo offline (HU7).
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        try {
            almacenamientoBiometrico.verificarSalud();
            return ResponseEntity.ok(Map.of("status", "UP"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("status", "DOWN", "mensaje", "Almacenamiento biometrico no disponible."));
        }
    }
}
