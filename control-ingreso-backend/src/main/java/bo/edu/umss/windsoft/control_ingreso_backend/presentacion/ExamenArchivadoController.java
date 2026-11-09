package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenArchivadoService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.ExamenArchivado;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenArchivadoRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
public class ExamenArchivadoController {
    private final ExamenArchivadoService service;
    public ExamenArchivadoController(ExamenArchivadoService service) { this.service=service; }
    @PostMapping(value="/api/admin/examenes-pasados",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Long> guardar(@Valid @ModelAttribute ExamenArchivadoRequest datos,
            @RequestParam MultipartFile archivoPdf) {
        return Map.of("intId",service.guardar(datos,archivoPdf));
    }
    @GetMapping("/api/publico/examenes/pasados")
    public List<ExamenArchivado> listar(@RequestParam(defaultValue="20") int limite,
            @RequestParam(defaultValue="0") int offset) { return service.listar(limite,offset); }
    @GetMapping("/api/publico/examenes/pasados/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable long id) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("examen-"+id+".pdf").build().toString())
            .header("X-Content-Type-Options","nosniff").body(service.pdf(id));
    }
}
