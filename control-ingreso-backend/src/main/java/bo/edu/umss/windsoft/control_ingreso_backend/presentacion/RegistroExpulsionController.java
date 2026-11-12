package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.RegistroExpulsionService;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteExpulsionDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExpulsionListaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroExpulsionRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.RegistroExpulsionResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * HU14 · Expulsiones.
 * Endpoints:
 *   POST  /api/examenes/{idExamen}/expulsiones          → registrar (DOCENTE, ADMINISTRADOR, OPERADOR)
 *   GET   /api/examenes/{idExamen}/expulsiones          → listar (DOCENTE, ADMINISTRADOR, OPERADOR)
 *   GET   /api/examenes/{idExamen}/expulsiones/pendientes → listar pendientes (DOCENTE, ADMINISTRADOR, OPERADOR)
 *   GET   /api/examenes/{idExamen}/expulsiones/pendientes/total → contar pendientes (badge)
 *   PUT   /api/examenes/{idExamen}/expulsiones/{idExpulsion}/autorizar → autorizar (DOCENTE, ADMINISTRADOR)
 *   GET   /api/admin/expulsiones                         → reporte global (ADMINISTRADOR)
 */
@RestController
@RequestMapping("/api/examenes/{idExamen}/expulsiones")
public class RegistroExpulsionController {

    private final RegistroExpulsionService registroExpulsionService;

    public RegistroExpulsionController(RegistroExpulsionService registroExpulsionService) {
        this.registroExpulsionService = registroExpulsionService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RegistroExpulsionResponse> registrar(
            @PathVariable Integer idExamen,
            @RequestParam Integer idIngreso,
            @RequestParam String motivoExpulsion,
            @RequestParam(required = false) String observacion,
            @RequestParam(required = false) MultipartFile evidencia,
            HttpServletRequest request) {
        RegistroExpulsionRequest req = new RegistroExpulsionRequest(idIngreso, motivoExpulsion, observacion);
        RegistroExpulsionResponse respuesta = registroExpulsionService.registrar(
                idExamen, req, evidencia, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping
    public ResponseEntity<List<ExpulsionListaDto>> listar(
            @PathVariable Integer idExamen,
            HttpServletRequest request) {
        List<ExpulsionListaDto> lista = registroExpulsionService.listarPorExamen(
                idExamen, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/pendientes")
    public ResponseEntity<List<ExpulsionListaDto>> pendientes(
            @PathVariable Integer idExamen,
            HttpServletRequest request) {
        List<ExpulsionListaDto> lista = registroExpulsionService.listarPendientes(
                idExamen, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/pendientes/total")
    public ResponseEntity<Long> totalPendientes(
            @PathVariable Integer idExamen,
            HttpServletRequest request) {
        long total = registroExpulsionService.contarPendientes(
                idExamen, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(total);
    }

    @GetMapping("/buscar-estudiante")
    public ResponseEntity<EstudianteExpulsionDto> buscarEstudiante(
            @PathVariable Integer idExamen,
            @RequestParam String ci,
            HttpServletRequest request) {
        EstudianteExpulsionDto estudiante = registroExpulsionService.buscarEstudianteParaExpulsion(
                idExamen, ci, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(estudiante);
    }

    @PutMapping("/{idExpulsion}/autorizar")
    public ResponseEntity<RegistroExpulsionResponse> autorizar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idExpulsion,
            HttpServletRequest request) {
        RegistroExpulsionResponse respuesta = registroExpulsionService.autorizar(
                idExamen, idExpulsion, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{idExpulsion}/denegar")
    public ResponseEntity<RegistroExpulsionResponse> denegar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idExpulsion,
            HttpServletRequest request) {
        RegistroExpulsionResponse respuesta = registroExpulsionService.denegar(
                idExamen, idExpulsion, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{idExpulsion}/revocar")
    public ResponseEntity<RegistroExpulsionResponse> revocar(
            @PathVariable Integer idExamen,
            @PathVariable Integer idExpulsion,
            @RequestParam String motivo,
            HttpServletRequest request) {
        RegistroExpulsionResponse respuesta = registroExpulsionService.revocar(
                idExamen, idExpulsion, motivo, ClientIpResolver.resolver(request));
        return ResponseEntity.ok(respuesta);
    }
}
