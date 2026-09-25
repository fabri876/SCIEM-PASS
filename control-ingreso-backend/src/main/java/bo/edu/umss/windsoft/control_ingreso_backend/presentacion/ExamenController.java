// presentacion/ExamenController.java
package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.dto.ExamenRequest;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.HorarioRegular;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AmbienteRespuestaDto;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenDetalleDto;

@RestController
@RequestMapping("/api/examenes")
public class ExamenController {

    private final ExamenService examenService;

    public ExamenController(ExamenService examenService) {
        this.examenService = examenService;
    }

    @PostMapping
    public ResponseEntity<Examen> registrarExamen(@Valid @RequestBody ExamenRequest request) {
        Examen examen = examenService.registrarExamen(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(examen);
    }

    // FIX #4: actualizar examen existente
    @PutMapping("/{id}")
    public ResponseEntity<ExamenRespuestaDto> actualizarExamen(
            @PathVariable Integer id,
            @Valid @RequestBody ExamenRequest request) {
        return ResponseEntity.ok(examenService.actualizarExamen(id, request));
    }

    @GetMapping("/horarios-regulares")
    public ResponseEntity<List<HorarioRegular>> obtenerHorariosRegulares(
            @RequestParam Integer idUsuario,
            @RequestParam Integer codsisDocente,
            @RequestParam Integer idAsignatura) {

        return ResponseEntity.ok(
                examenService.obtenerHorariosRegulares(idUsuario, codsisDocente, idAsignatura));
    }

    // FIX #3: ahora devuelve nombres enriquecidos (asignatura, tipo, docente)
    @GetMapping("/por-asignatura/{idAsignatura}")
    public ResponseEntity<ExamenDetalleDto> obtenerPorAsignatura(@PathVariable Integer idAsignatura) {
        return ResponseEntity.ok(examenService.obtenerDetalleExamenPorAsignatura(idAsignatura));
    }

    @GetMapping
    public ResponseEntity<List<ExamenRespuestaDto>> obtenerExamenes() {
        return ResponseEntity.ok(examenService.obtenerExamenesEnriquecidos());
    }

    // FIX #3: examen individual también enriquecido
    @GetMapping("/{id}")
    public ResponseEntity<ExamenRespuestaDto> obtenerExamenPorId(@PathVariable Integer id) {
        Examen examen = examenService.obtenerExamenPorId(id);
        return ResponseEntity.ok(examenService.enriquecerExamen(examen));
    }

    @GetMapping("/{id}/ambientes")
    public ResponseEntity<List<AmbienteRespuestaDto>> obtenerAmbientes(@PathVariable Integer id) {
        return ResponseEntity.ok(examenService.obtenerAmbientesDeExamen(id));
    }

    @GetMapping("/mis-examenes")
    public ResponseEntity<List<ExamenRespuestaDto>> obtenerMisExamenes() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Integer idUsuarioAutenticado = (Integer) auth.getDetails();
        return ResponseEntity.ok(examenService.obtenerMisExamenesEnriquecidos(idUsuarioAutenticado));
    }

    // FIX #5: para que el frontend deshabilite tipos de examen ya usados
    @GetMapping("/tipos-usados")
    public ResponseEntity<List<Integer>> obtenerTiposUsados(
            @RequestParam Integer idAsignatura,
            @RequestParam Integer codsisDocente) {
        return ResponseEntity.ok(examenService.obtenerTiposUsados(idAsignatura, codsisDocente));
    }
}