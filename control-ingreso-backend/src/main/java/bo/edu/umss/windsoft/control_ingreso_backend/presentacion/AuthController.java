package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AuthService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.LoginRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.LoginResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroDocenteAyudanteDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroPendienteRespuestaDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto dto,
                                                    HttpServletRequest request) {
        LoginResponseDto respuesta = authService.login(dto.getCorreo(), dto.getContrasena(),
                ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }

    // Nota (sep-2026): se retiró "/registro-estudiante" (auto-registro con foto
    // + QR) — la inge confirmó que el estudiante ya no se autorregistra, lo
    // crea el administrador (ver UsuarioService/UsuarioAdminController). La
    // tabla "estudiante" del rediseño de base tampoco tiene columnas para
    // foto ni QR: eso se generará por examen, en otra HU.

    // Nota: no se usa "/registro" porque ya lo ocupa RegistroUsuarioController
    // (auto-registro genérico de la rama testing, con roles admin/docente/ayudante/estudiante).
    @PostMapping("/registro-personal")
    public ResponseEntity<RegistroPendienteRespuestaDto> registroDocenteOAyudante(
            @Valid @RequestBody RegistroDocenteAyudanteDto dto) {
        RegistroPendienteRespuestaDto respuesta = authService.registrarDocenteOAyudante(dto.getNombre(),
                dto.getApellido(), dto.getCi(), dto.getCorreo(), dto.getContrasena(), dto.getTelefono(),
                dto.getRolSolicitado());
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }
}
