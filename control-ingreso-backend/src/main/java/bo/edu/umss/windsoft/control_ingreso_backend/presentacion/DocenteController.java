package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.DocenteService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/docente")
public class DocenteController {

    private final DocenteService docenteService;

    public DocenteController(DocenteService docenteService) {
        this.docenteService = docenteService;
    }

    @GetMapping("/perfil")
    public ResponseEntity<UsuarioRespuestaDto> perfil() {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(docenteService.obtenerPerfil(correo));
    }
}
