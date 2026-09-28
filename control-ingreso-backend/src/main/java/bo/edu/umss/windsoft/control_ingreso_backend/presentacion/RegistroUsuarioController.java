package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.RegistroUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroUsuarioRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioResponseDTO;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class RegistroUsuarioController {

    private final RegistroUsuarioService registroUsuarioService;

    public RegistroUsuarioController(RegistroUsuarioService registroUsuarioService) {
        this.registroUsuarioService = registroUsuarioService;
    }

    @PostMapping("/registro")
    public ResponseEntity<UsuarioResponseDTO> registrarUsuario(@Valid @RequestBody RegistroUsuarioRequestDTO request) {
        UsuarioResponseDTO response = registroUsuarioService.registrarUsuario(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
