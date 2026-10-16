package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    public NominaOfflineController(AsignacionIngresoService asignacionIngresoService) {
        this.asignacionIngresoService = asignacionIngresoService;
    }

    @GetMapping("/{idExamen}/nomina")
    @PreAuthorize("hasAnyRole('OPERADOR','DOCENTE')")
    public ResponseEntity<Map<String, Object>> obtenerNomina(
            @PathVariable Integer idExamen,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size,
            @RequestParam(required = false) String updatedSince) {

        if (page < 0 || size < 1 || size > 2000) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Los parámetros page y size no son válidos"));
        }

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
        return ResponseEntity.ok(respuesta);
    }
}
