package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/usuarios")
public class UsuarioDuplicadoController {
  private final UsuarioRepository usuarios; private final EstudianteRepository estudiantes; private final DocenteRepository docentes;
  public UsuarioDuplicadoController(UsuarioRepository u, EstudianteRepository e, DocenteRepository d){usuarios=u;estudiantes=e;docentes=d;}
  @GetMapping("/duplicado") @PreAuthorize("hasAnyRole('DOCENTE','ADMINISTRADOR')")
  public ResponseEntity<Map<String,Boolean>> duplicado(@RequestParam(required=false) String ci,@RequestParam(required=false) String correo,@RequestParam(required=false) Integer codigoSis){
    boolean a=ci!=null&&usuarios.existsByCiusuario(ci.trim().toUpperCase()); boolean b=correo!=null&&usuarios.existsByCorreousuario(correo.trim().toLowerCase()); boolean c=codigoSis!=null&&(estudiantes.findByCodsisestudiante(codigoSis).isPresent()||docentes.findByCodsisdocente(codigoSis).isPresent());
    return ResponseEntity.ok(Map.of("ci",a,"correo",b,"codigoSis",c));
  }
}
