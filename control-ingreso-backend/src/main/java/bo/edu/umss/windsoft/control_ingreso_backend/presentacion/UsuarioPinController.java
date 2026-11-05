package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;

import java.util.Map;

/**
 * Endpoints para configuración y validación de PIN de desbloqueo offline (F3-06).
 * Guarda el hash del PIN con el PasswordEncoder compartido en configuracion_usuario.
 *
 * NOTA: Ajusta la inyección de JdbcTemplate o reemplázala por tu repositorio JPA
 * según la configuración actual de tu proyecto.
 */
@RestController
@RequestMapping("/api/v1/usuario")
public class UsuarioPinController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/validar-pin")
    public ResponseEntity<?> validarPin(@RequestBody PinRequest request) {
        if (request.idUsuario() == null || request.pin() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "idUsuario y pin son requeridos"));
        }
        try {
            String hash = jdbcTemplate.queryForObject(
                "SELECT pin_hash FROM configuracion_usuario WHERE idusuario = ?",
                new Object[]{request.idUsuario()}, String.class
            );
            boolean coincide = passwordEncoder.matches(request.pin(), hash);
            return ResponseEntity.ok(Map.of("valido", coincide));
        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.ok(Map.of("valido", false));
        }
    }

    /**
     * Guarda o actualiza el PIN de un usuario.
     * Body: { "idUsuario": 1, "pin": "1234" }
     */
    @PostMapping("/configurar-pin")
    public ResponseEntity<?> configurarPin(@RequestBody PinRequest request) {
        if (request.idUsuario() == null || request.pin() == null || request.pin().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "idUsuario y pin son requeridos"));
        }
        if (request.pin().length() != 4) {
            return ResponseEntity.badRequest().body(Map.of("error", "El PIN debe tener 4 dígitos"));
        }

        String hash = passwordEncoder.encode(request.pin());
        jdbcTemplate.update(
            "INSERT INTO configuracion_usuario (idusuario, pin_hash, fecha_creacion, intentos_fallidos, sesion_bloqueada, ultima_interaccion) " +
            "VALUES (?, ?, NOW(), 0, FALSE, NOW()) " +
            "ON CONFLICT (idusuario) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, fecha_creacion = NOW(), " +
            "intentos_fallidos = 0, sesion_bloqueada = FALSE, ultima_interaccion = NOW()",
            request.idUsuario(), hash
        );
        return ResponseEntity.ok().build();
    }

    /**
     * Devuelve el pinHash de un usuario para validación offline en IndexedDB.
     */
    @GetMapping("/pin/{idUsuario}")
    public ResponseEntity<?> obtenerPinHash(@PathVariable Integer idUsuario) {
        try {
            String hash = jdbcTemplate.queryForObject(
                "SELECT pin_hash FROM configuracion_usuario WHERE idusuario = ?",
                new Object[]{idUsuario}, String.class
            );
            return ResponseEntity.ok(Map.of("pinHash", hash));
        } catch (EmptyResultDataAccessException e) {
            return ResponseEntity.notFound().build();
        }
    }

    public record PinRequest(Integer idUsuario, String pin) {}
}
