package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ReporteAsistenciaService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reportes")
public class ReporteAsistenciaController {
    private final ReporteAsistenciaService service;
    private final ContextoUsuarioService contexto;
    public ReporteAsistenciaController(ReporteAsistenciaService service, ContextoUsuarioService contexto) { this.service=service; this.contexto=contexto; }

    @GetMapping("/examenes/{idExamen}/asistencia")
    @PreAuthorize("hasAnyRole('DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<byte[]> descargar(@PathVariable Integer idExamen,
                                            @RequestParam(defaultValue="pdf") String formato,
                                            @RequestParam(defaultValue="resumen") String secciones) {
        Set<String> seleccionadas = Arrays.stream(secciones.split(",")).map(String::trim).filter(s -> !s.isBlank()).collect(Collectors.toSet());
        String f = "xlsx".equalsIgnoreCase(formato) ? "xlsx" : "pdf";
        byte[] archivo = service.generar(idExamen, f, seleccionadas, contexto.actual());
        MediaType tipo = "xlsx".equals(f) ? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") : MediaType.APPLICATION_PDF;
        return ResponseEntity.ok().contentType(tipo).header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reporte-asistencia-" + idExamen + "." + f + "\"").body(archivo);
    }
}
