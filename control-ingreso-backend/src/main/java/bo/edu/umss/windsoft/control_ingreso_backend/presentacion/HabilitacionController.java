package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.HabilitacionService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsociarEstudianteExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;

import java.util.List;

@RestController
@RequestMapping({"/api/habilitaciones", "/api/habilitacion", "/habilitacion"})
public class HabilitacionController {

    private final HabilitacionService habilitacionService;

    public HabilitacionController(HabilitacionService habilitacionService) {
        this.habilitacionService = habilitacionService;
    }

    @GetMapping
    public ResponseEntity<List<HabilitacionResponseDto>> obtenerHabilitaciones(
            @RequestParam(required = false) Integer idAsignatura,
            @RequestParam(required = false) Integer idExamen) {
        if (idAsignatura != null && idExamen != null) {
            return ResponseEntity.ok(habilitacionService.obtenerPorAsignaturaYExamen(idAsignatura, idExamen));
        }
        if (idAsignatura != null) {
            return ResponseEntity.ok(habilitacionService.obtenerPorAsignatura(idAsignatura));
        }
        return ResponseEntity.ok(habilitacionService.obtenerTodas());
    }

    // BUG-007 (QA): antes "Exportar lista oficial" no llamaba a nada.
    @GetMapping("/exportar")
    public ResponseEntity<byte[]> exportarExcel(@RequestParam(required = false) Integer idAsignatura) {
        byte[] archivo = habilitacionService.exportarExcel(idAsignatura);
        String nombreArchivo = "lista_habilitaciones"
                + (idAsignatura != null ? "_asignatura_" + idAsignatura : "") + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(archivo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HabilitacionResponseDto> obtenerHabilitacionPorId(@PathVariable Integer id) {
        HabilitacionResponseDto dto = habilitacionService.obtenerPorId(id);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabilitacionResponseDto> actualizarHabilitacion(
            @PathVariable Integer id,
            @Valid @RequestBody HabilitacionRequestDto request,
            Authentication authentication, HttpServletRequest httpRequest) {
        HabilitacionResponseDto actualizado = habilitacionService.actualizarHabilitacion(
                id, request, authentication.getName(), ClientIpResolver.resolver(httpRequest));
        return ResponseEntity.ok(actualizado);
    }

    @PostMapping("/asociar-examen")
    public ResponseEntity<HabilitacionResponseDto> asociarEstudiante(
            @Valid @RequestBody AsociarEstudianteExamenRequest request) {
        return ResponseEntity.ok(habilitacionService.asociarEstudiante(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarAsociacion(@PathVariable Integer id) {
        habilitacionService.eliminarAsociacion(id);
        return ResponseEntity.noContent().build();
    }
}

