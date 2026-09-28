package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AyudanteService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ayudante")
public class AyudanteController {

    private final AyudanteService ayudanteService;

    public AyudanteController(AyudanteService ayudanteService) {
        this.ayudanteService = ayudanteService;
    }

    @GetMapping("/perfil")
    public ResponseEntity<UsuarioRespuestaDto> perfil() {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(ayudanteService.obtenerPerfil(correo));
    }
}
