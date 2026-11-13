package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.NominaFotoService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Contrato de precarga de nómina para HU7.
 * Mantiene separada la ruta offline de la lista oficial usada por el panel web.
 */
@RestController
@RequestMapping("/api/v1/examenes")
public class NominaOfflineController {

    private final AsignacionIngresoService asignacionIngresoService;
    private final NominaFotoService nominaFotoService;
    private final ContextoUsuarioService contextoUsuarioService;

    public NominaOfflineController(AsignacionIngresoService asignacionIngresoService,
                                   NominaFotoService nominaFotoService,
                                   ContextoUsuarioService contextoUsuarioService) {
        this.asignacionIngresoService = asignacionIngresoService;
        this.nominaFotoService = nominaFotoService;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @GetMapping("/{idExamen}/nomina")
    @PreAuthorize("hasAnyRole('OPERADOR','DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<Map<String, Object>> obtenerNomina(
            @PathVariable Integer idExamen,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size,
            @RequestParam(required = false) String updatedSince,
            HttpServletRequest request) {

        if (page < 0 || size < 1 || size > 2000) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Los parámetros page y size no son válidos"));
        }
        contextoUsuarioService.verificarAccesoExamen(contextoUsuarioService.actual(), idExamen, true,
                "DESCARGAR_NOMINA_OFFLINE", request.getRemoteAddr());

        // Se reutiliza la fuente de datos actual para no alterar el flujo web.
        // updatedSince se conserva en la firma del contrato; el filtrado incremental
        // se implementará cuando exista una marca de actualización persistida por estudiante.
        List<EstudianteListaOficialDTO> nomina = asignacionIngresoService.obtenerListaOficial(idExamen, null);
        int total = nomina.size();
        int desde = Math.min(page * size, total);
        int hasta = Math.min(desde + size, total);
        List<EstudianteListaOficialDTO> items = desde < hasta
                ? nomina.subList(desde, hasta)
                : Collections.emptyList();

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("items", items);
        respuesta.put("page", page);
        respuesta.put("totalPages", total == 0 ? 0 : (int) Math.ceil((double) total / size));
        respuesta.put("total", total);
        respuesta.put("generadoEn", OffsetDateTime.now().toString());
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store").body(respuesta);
    }

    @GetMapping("/{idExamen}/fotos")
    @PreAuthorize("hasAnyRole('OPERADOR','DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<Map<String, Object>> obtenerFotos(@PathVariable Integer idExamen,
                                                             @RequestParam(defaultValue = "0") int page,
                                                             @RequestParam(defaultValue = "200") int size,
                                                             HttpServletRequest request) {
        if (page < 0 || size < 1 || size > 500) {
            return ResponseEntity.badRequest().body(Map.of("error", "Los parámetros page y size no son válidos"));
        }
        contextoUsuarioService.verificarAccesoExamen(contextoUsuarioService.actual(), idExamen, true,
                "DESCARGAR_FOTOS_OFFLINE", request.getRemoteAddr());
        NominaFotoService.PaginaFotos pagina = nominaFotoService.obtenerPagina(idExamen, page, size);
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("items", pagina.items());
        respuesta.put("page", pagina.page());
        respuesta.put("totalPages", pagina.totalPages());
        respuesta.put("total", pagina.total());
        respuesta.put("generadoEn", OffsetDateTime.now().toString());
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store").body(respuesta);
    }
}
