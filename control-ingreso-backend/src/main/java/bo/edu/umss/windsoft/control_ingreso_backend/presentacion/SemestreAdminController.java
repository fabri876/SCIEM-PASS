package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.SemestreService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
@RestController @RequestMapping("/api/admin/semestres") @PreAuthorize("hasRole('ADMINISTRADOR')")
public class SemestreAdminController {
 private final SemestreService service;
 public SemestreAdminController(SemestreService service){this.service=service;}
 @GetMapping public SemestreService.Panel listar(){return service.listar();}
 @GetMapping("/{id}/comparacion") public SemestreService.Detalle comparar(@PathVariable int id){return service.comparar(id);}
 @GetMapping("/{id}/listado") public java.util.List<bo.edu.umss.windsoft.control_ingreso_backend.dominio.FilaListadoDocente> listado(@PathVariable int id){return service.listado(id);}
 @GetMapping("/{id}/pdf") public ResponseEntity<byte[]> pdf(@PathVariable int id,@RequestParam(defaultValue="false") boolean original){return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=horario-semestre-"+id+(original?"-original":"")+".pdf").body(service.descargar(id,original));}
 @PostMapping("/vista-previa") public SemestreService.VistaPrevia previa(@RequestParam String nombre,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaInicio,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaFin,@RequestParam(required=false) MultipartFile archivo){return service.previsualizar(nombre,fechaInicio,fechaFin,archivo);}
 @PostMapping("/abrir") public SemestreService.Panel abrir(@RequestParam String nombre,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaInicio,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaFin,@RequestParam(defaultValue="") String observaciones,@RequestParam(required=false) MultipartFile archivo,@RequestParam String confirmacion){return service.abrir(nombre,fechaInicio,fechaFin,observaciones,archivo,confirmacion);}
 @PostMapping("/historicos") public SemestreService.Panel historico(@RequestParam String nombre,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaInicio,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaFin,@RequestParam(defaultValue="") String observaciones,@RequestParam MultipartFile archivo){return service.historico(nombre,fechaInicio,fechaFin,observaciones,archivo);}
 @PutMapping("/fechas") public SemestreService.Panel fechas(@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaInicio,@RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fechaFin){return service.configurarFechas(fechaInicio,fechaFin);}
 @PostMapping("/ejemplos") public SemestreService.Panel ejemplos(){return service.ejemplos();}
}
