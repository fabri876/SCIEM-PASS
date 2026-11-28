package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.MonitoreoService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsistentesAulaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenMonitoreoDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.LlegadaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReubicacionDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ReubicarRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.TableroMonitoreoDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * HU10 · Dashboard de monitoreo. Solo DOCENTE (exámenes asignados) y
 * ADMINISTRADOR (ver SecurityConfig). "Reubicar y Autorizar" es exclusivo del
 * docente (se valida en el servicio).
 */
@RestController
@RequestMapping("/api/monitoreo")
public class MonitoreoController {

    private final MonitoreoService monitoreoService;

    public MonitoreoController(MonitoreoService monitoreoService) {
        this.monitoreoService = monitoreoService;
    }

    @GetMapping("/examenes")
    public ResponseEntity<List<ExamenMonitoreoDto>> examenes(HttpServletRequest request) {
        return ResponseEntity.ok(monitoreoService.listarExamenes(ClientIpResolver.resolver(request)));
    }

    /** Métricas, aulas y alertas del examen. El frontend lo consulta cada 15 s. */
    @GetMapping("/examenes/{idExamen}/tablero")
    public ResponseEntity<TableroMonitoreoDto> tablero(@PathVariable Integer idExamen, HttpServletRequest request) {
        return ResponseEntity.ok(monitoreoService.tablero(idExamen, ClientIpResolver.resolver(request)));
    }

    /** Curva de llegada: ingresos agrupados cada "intervalo" minutos (1 a 60). */
    @GetMapping("/examenes/{idExamen}/llegadas")
    public ResponseEntity<List<LlegadaDto>> llegadas(@PathVariable Integer idExamen,
                                                     @RequestParam(defaultValue = "5") int intervalo,
                                                     HttpServletRequest request) {
        return ResponseEntity.ok(monitoreoService.llegadas(idExamen, intervalo, ClientIpResolver.resolver(request)));
    }

    /** Lista del aula: asignados (con su estado) y quienes ingresaron en ella. */
    @GetMapping("/ambientes/{idAmbiente}/asistentes")
    public ResponseEntity<AsistentesAulaDto> asistentes(@PathVariable Integer idAmbiente, HttpServletRequest request) {
        return ResponseEntity.ok(monitoreoService.asistentes(idAmbiente, ClientIpResolver.resolver(request)));
    }

    /** La misma lista en CSV (queda en auditoría como EXPORTACION_ASISTENCIA). */
    @GetMapping("/ambientes/{idAmbiente}/asistentes.csv")
    public ResponseEntity<byte[]> asistentesCsv(@PathVariable Integer idAmbiente,
            @RequestParam(defaultValue = "TODOS") String estado,
            @RequestParam(defaultValue = "") String busqueda, HttpServletRequest request) {
        byte[] csv = monitoreoService.asistentesCsv(idAmbiente, estado, busqueda, ClientIpResolver.resolver(request));
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"asistentes-aula-" + idAmbiente + "_" + estado.replaceAll("[^A-Za-z]", "") + "_" + java.time.LocalDate.now(java.time.ZoneId.of("America/La_Paz")) + ".csv\"")
                .body(csv);
    }

    @PostMapping("/reubicaciones")
    public ResponseEntity<ReubicacionDto> reubicar(@Valid @RequestBody ReubicarRequestDto dto,
                                                   HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(monitoreoService.reubicarYAutorizar(dto.idIntento(), ClientIpResolver.resolver(request)));
    }
}
