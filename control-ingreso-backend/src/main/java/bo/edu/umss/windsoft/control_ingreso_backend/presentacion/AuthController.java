package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.UsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroUsuarioRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioResponseDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/auth/registro")
    public ResponseEntity<UsuarioResponseDTO> registrarUsuario(@Valid @RequestBody RegistroUsuarioRequestDTO dto) {
        UsuarioResponseDTO response = usuarioService.registrarUsuario(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/usuarios")
    public ResponseEntity<List<UsuarioResponseDTO>> listarUsuarios() {
        return ResponseEntity.ok(usuarioService.listarUsuarios());
    }

    @GetMapping("/usuarios/{id}")
    public ResponseEntity<UsuarioResponseDTO> obtenerUsuarioPorId(@PathVariable("id") Integer id) {
        return ResponseEntity.ok(usuarioService.obtenerPorId(id));
    }
}
