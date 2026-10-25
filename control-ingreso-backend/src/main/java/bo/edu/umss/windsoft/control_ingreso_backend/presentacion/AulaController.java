// presentacion/AulaController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AulaService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Aula;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AulaOcupadaDTO;

@RestController
@RequestMapping("/api/aulas")
public class AulaController {

    private final AulaService aulaService;

    public AulaController(AulaService aulaService) {
        this.aulaService = aulaService;
    }

    @GetMapping
    public ResponseEntity<List<Aula>> listarAulas() {
        return ResponseEntity.ok(aulaService.obtenerAulasActivas());
    }

    @GetMapping("/ocupadas")
    @PreAuthorize("hasAnyRole('DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<List<AulaOcupadaDTO>> listarAulasOcupadas(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) @org.springframework.web.bind.annotation.RequestParam LocalDate fecha,
            @DateTimeFormat(pattern = "HH:mm") @org.springframework.web.bind.annotation.RequestParam LocalTime horaInicio,
            @DateTimeFormat(pattern = "HH:mm") @org.springframework.web.bind.annotation.RequestParam LocalTime horaFin,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer idExamenExcluir) {
        return ResponseEntity.ok(aulaService.obtenerAulasOcupadas(fecha, horaInicio, horaFin, idExamenExcluir));
    }
}
