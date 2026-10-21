package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.SemestreService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/admin/semestres") @PreAuthorize("hasRole('ADMINISTRADOR')")
public class SemestreAdminController {
 private final SemestreService service;
 public SemestreAdminController(SemestreService service){this.service=service;}
 @GetMapping public SemestreService.Panel listar(){return service.listar();}
 @GetMapping("/{id}/comparacion") public SemestreService.Detalle comparar(@PathVariable int id){return service.comparar(id);}
 @GetMapping("/{id}/listado") public java.util.List<bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente> listado(@PathVariable int id){return service.listado(id);}
 @GetMapping("/{id}/pdf") public ResponseEntity<byte[]> pdf(@PathVariable int id,@RequestParam(defaultValue="false") boolean original){return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=horario-semestre-"+id+(original?"-original":"")+".pdf").body(service.descargar(id,original));}
 @PostMapping("/vista-previa") public SemestreService.VistaPrevia previa(@RequestParam String nombre,@RequestParam(required=false) MultipartFile archivo){return service.previsualizar(nombre,archivo);}
 @PostMapping("/abrir") public SemestreService.Panel abrir(@RequestParam String nombre,@RequestParam(defaultValue="") String observaciones,@RequestParam(required=false) MultipartFile archivo,@RequestParam String confirmacion){return service.abrir(nombre,observaciones,archivo,confirmacion);}
 @PostMapping("/historicos") public SemestreService.Panel historico(@RequestParam String nombre,@RequestParam(defaultValue="") String observaciones,@RequestParam MultipartFile archivo){return service.historico(nombre,observaciones,archivo);}
 @PostMapping("/ejemplos") public SemestreService.Panel ejemplos(){return service.ejemplos();}
}
