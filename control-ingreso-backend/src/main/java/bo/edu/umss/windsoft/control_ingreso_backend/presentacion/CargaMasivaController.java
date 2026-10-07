package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.CargaMasivaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.UsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CrearUsuarioDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UsuarioRespuestaDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/usuarios")
public class CargaMasivaController {

    private final CargaMasivaService cargaMasivaService;
    private final UsuarioService usuarioService;

    public CargaMasivaController(CargaMasivaService cargaMasivaService, UsuarioService usuarioService) {
        this.cargaMasivaService = cargaMasivaService;
        this.usuarioService = usuarioService;
    }

    @PostMapping(value = "/carga-masiva", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CargaMasivaRespuestaDto> cargaMasiva(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "rol", required = false) String targetRol,
            @RequestParam(value = "idGrupo", required = false) Integer idGrupo,
            HttpServletRequest request) {
        String correoEjecutor = SecurityContextHolder.getContext().getAuthentication().getName();
        CargaMasivaRespuestaDto respuesta = cargaMasivaService.procesarCargaMasiva(
                archivo, targetRol, correoEjecutor, ClientIpResolver.resolver(request), idGrupo);
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping(value = "/carga-masiva/vista-previa", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.CargaMasivaVistaPreviaDto previsualizar(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "rol", required = false) String rol,
            @RequestParam(value = "idGrupo", required = false) Integer idGrupo) {
        return cargaMasivaService.previsualizar(archivo, rol, SecurityContextHolder.getContext().getAuthentication().getName(), idGrupo);
    }

    @PostMapping("/registro-individual")
    public ResponseEntity<UsuarioRespuestaDto> registroIndividual(
            @Valid @RequestBody CrearUsuarioDto dto,
            HttpServletRequest request) {
        String correoEjecutor = SecurityContextHolder.getContext().getAuthentication().getName();
        UsuarioRespuestaDto respuesta = usuarioService.crear(
                dto, correoEjecutor, ClientIpResolver.resolver(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }
}
