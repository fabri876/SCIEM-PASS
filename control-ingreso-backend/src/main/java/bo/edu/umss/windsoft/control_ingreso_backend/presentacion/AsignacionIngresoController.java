package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignacionIngresoRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AulaAsignacionDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.EstudianteListaOficialDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.OperadorDisponibleDTO;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints de administración de asignación de operadores a aulas de examen.
 *
 * GET  /api/v1/control/examenes/{idExamen}/operadores-disponibles  → lista operadores
 * GET  /api/v1/control/examenes/{idExamen}/asignacion-ingreso      → lee asignación actual
 * PUT  /api/v1/control/examenes/{idExamen}/asignacion-ingreso      → guarda asignación
 */
@RestController
// Se conservan ambas rutas para compatibilidad con el frontend actual y con
// el contrato versionado de control de ingreso.
@RequestMapping("/api/v1/control/examenes/{idExamen}")
public class AsignacionIngresoController {

    private final AsignacionIngresoService asignacionIngresoService;
    private final ContextoUsuarioService   contextoUsuarioService;

    public AsignacionIngresoController(AsignacionIngresoService asignacionIngresoService,
                                       ContextoUsuarioService contextoUsuarioService) {
        this.asignacionIngresoService = asignacionIngresoService;
        this.contextoUsuarioService   = contextoUsuarioService;
    }

    /**
     * Lista todos los operadores del sistema indicando cuáles ya están asignados
     * al examen.  Solo ADMINISTRADOR y DOCENTE pueden verlo.
     */
    @GetMapping("/operadores-disponibles")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE')")
    public ResponseEntity<List<OperadorDisponibleDTO>> operadoresDisponibles(
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(asignacionIngresoService.operadoresDisponibles(idExamen));
    }

    /**
     * Devuelve el estado actual de asignación de operadores para cada aula del examen.
     * Accesible a ADMINISTRADOR, DOCENTE y OPERADOR (el operador ve su propia aula).
     */
    @GetMapping("/asignacion-ingreso")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE','OPERADOR')")
    public ResponseEntity<List<AulaAsignacionDTO>> leerAsignacion(
            @PathVariable Integer idExamen) {
        return ResponseEntity.ok(asignacionIngresoService.leerAsignacion(idExamen));
    }

    /**
     * Persiste la asignación de operadores a aulas.
     * Solo ADMINISTRADOR y DOCENTE pueden modificar asignaciones.
     * El docente solo puede asignar en exámenes de los que es responsable
     * (la validación ocurre en el servicio).
     */
    @PutMapping("/asignacion-ingreso")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE')")
    public ResponseEntity<List<AulaAsignacionDTO>> guardarAsignacion(
            @PathVariable Integer idExamen,
            @Valid @RequestBody AsignacionIngresoRequestDTO request) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        return ResponseEntity.ok(asignacionIngresoService.guardarAsignacion(idExamen, request, usuario));
    }

    /**
     * Contrato unificado para la lista oficial del examen (HU7 / PanelListaOficial).
     * Devuelve la nómina de estudiantes con su habilitación, aula asignada,
     * credencial QR y estado de ingreso.
     * Accesible a ADMINISTRADOR, DOCENTE y OPERADOR.
     */
    @GetMapping("/lista-oficial")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE','OPERADOR')")
    public ResponseEntity<List<EstudianteListaOficialDTO>> obtenerListaOficial(
            @PathVariable Integer idExamen,
            @RequestParam(required = false) String buscar) {
        return ResponseEntity.ok(asignacionIngresoService.obtenerListaOficial(idExamen, buscar));
    }
}
