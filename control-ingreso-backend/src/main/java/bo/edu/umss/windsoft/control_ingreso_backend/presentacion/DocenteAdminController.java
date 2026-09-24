// presentacion/DocenteAdminController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.UsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/docentes")
public class DocenteAdminController {

    private final UsuarioService usuarioService;

    public DocenteAdminController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<UsuarioRespuestaDto>> listarDocentes(
            @RequestParam(required = false) String busqueda) {
        return ResponseEntity.ok(usuarioService.listar("DOCENTE", true, busqueda));
    }
}