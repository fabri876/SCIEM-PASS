package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.UsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ActualizarUsuarioDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CambiarEstadoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CambiarRolDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CambioEstadoRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CrearUsuarioDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/usuarios")
public class UsuarioAdminController {

    private final UsuarioService usuarioService;

    public UsuarioAdminController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<UsuarioRespuestaDto>> listar(@RequestParam(required = false) String rol,
                                                              @RequestParam(required = false) Boolean estado,
                                                              @RequestParam(required = false) String busqueda) {
        return ResponseEntity.ok(usuarioService.listar(rol, estado, busqueda));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioRespuestaDto> obtener(@PathVariable Integer id) {
        return ResponseEntity.ok(usuarioService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<UsuarioRespuestaDto> crear(@Valid @RequestBody CrearUsuarioDto dto,
                                                       HttpServletRequest request) {
        UsuarioRespuestaDto respuesta = usuarioService.crear(dto, correoEjecutor(), ClientIpResolver.resolver(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    @PostMapping("/primer-ingreso/migrar")
    public ResponseEntity<Map<String, Object>> migrarClavesIniciales(HttpServletRequest request) {
        int marcados = usuarioService.marcarCuentasConClaveInicial(correoEjecutor(), ClientIpResolver.resolver(request));
        return ResponseEntity.ok(Map.of(
                "mensaje", "Se identificaron " + marcados + " cuenta(s) con contraseña inicial.",
                "marcados", marcados));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioRespuestaDto> actualizar(@PathVariable Integer id,
                                                            @Valid @RequestBody ActualizarUsuarioDto dto,
                                                            HttpServletRequest request) {
        UsuarioRespuestaDto respuesta = usuarioService.actualizar(id, dto, correoEjecutor(),
                ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }

    @PatchMapping("/{id}/rol")
    public ResponseEntity<UsuarioRespuestaDto> cambiarRol(@PathVariable Integer id,
                                                             @Valid @RequestBody CambiarRolDto dto,
                                                             HttpServletRequest request) {
        UsuarioRespuestaDto respuesta = usuarioService.cambiarRol(id, dto.getNuevoRol(), dto.getCodigoSis(),
                correoEjecutor(), ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<CambioEstadoRespuestaDto> cambiarEstado(@PathVariable Integer id,
                                                                    @Valid @RequestBody CambiarEstadoDto dto,
                                                                    HttpServletRequest request) {
        UsuarioRespuestaDto uDto = usuarioService.cambiarEstado(id, dto.esActivo(), correoEjecutor(),
                ClientIpResolver.resolver(request));
        boolean activo = uDto.isEstado();
        String estado = activo ? "ACTIVO" : "INACTIVO";
        return ResponseEntity.ok(new CambioEstadoRespuestaDto("Estado de usuario actualizado exitosamente", id, estado));
    }

    private String correoEjecutor() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
