package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignaturaService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.GrupoService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignaturaResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AyudanteGrupoDetalleDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.DocenteMateriaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.GrupoResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/grupos")
public class GrupoController {

    private final GrupoService grupoService;
    private final AsignaturaService asignaturaService;

    public GrupoController(GrupoService grupoService, AsignaturaService asignaturaService) {
        this.grupoService = grupoService;
        this.asignaturaService = asignaturaService;
    }

    // 1. Obtener todas las asignaturas
    @GetMapping("/catalogo")
    public ResponseEntity<List<bo.edu.umss.windsoft.control_ingreso_backend.dominio.Asignatura>> catalogo() {
        return ResponseEntity.ok(asignaturaService.listarCatalogo());
    }
    @GetMapping("/catalogo/grupos")
    public ResponseEntity<List<GrupoResponseDto>> catalogoGrupos() {
        return ResponseEntity.ok(grupoService.listarCatalogoGrupos());
    }
    @GetMapping("/asignaturas")
    public ResponseEntity<List<AsignaturaResponseDto>> listarAsignaturas() {
        return ResponseEntity.ok(asignaturaService.listarTodas());
    }

    // 2. Obtener grupos por asignatura
    @GetMapping("/asignaturas/{idAsignatura}")
    public ResponseEntity<List<GrupoResponseDto>> obtenerGruposPorAsignatura(@PathVariable Integer idAsignatura) {
        return ResponseEntity.ok(grupoService.obtenerGruposPorAsignatura(idAsignatura));
    }

    // 3. Cascading Dropdown 2: Obtener docentes que dictan una asignatura
    @GetMapping("/asignaturas/{idAsignatura}/docentes")
    public ResponseEntity<List<DocenteMateriaDto>> obtenerDocentesPorAsignatura(@PathVariable Integer idAsignatura) {
        return ResponseEntity.ok(grupoService.obtenerDocentesPorAsignatura(idAsignatura));
    }

    // 4. Cascading Dropdown 3: Obtener grupos que dictan un docente específico en una asignatura
    @GetMapping("/asignaturas/{idAsignatura}/docentes/{idUsuarioDocente}")
    public ResponseEntity<List<GrupoResponseDto>> obtenerGruposPorAsignaturaYDocente(
            @PathVariable Integer idAsignatura,
            @PathVariable Integer idUsuarioDocente) {
        return ResponseEntity.ok(grupoService.obtenerGruposPorAsignaturaYDocente(idAsignatura, idUsuarioDocente));
    }

    // 5. Crear un grupo
    @PostMapping
    public ResponseEntity<GrupoResponseDto> crearGrupo(@RequestBody Map<String, Object> body) {
        Integer idAsignatura = (Integer) body.get("idAsignatura");
        String nombreGrupo = (String) body.get("nombreGrupo");
        String horarios = (String) body.get("horarios");
        return ResponseEntity.ok(grupoService.crearGrupo(idAsignatura, nombreGrupo, horarios));
    }

    // 6. Asignar Docente a Grupo
    @PostMapping("/docentes/asignar")
    public ResponseEntity<Map<String, String>> asignarDocenteAGrupo(@RequestBody Map<String, Integer> body) {
        Integer idUsuario = body.get("idUsuario");
        Integer codSis = body.get("codSisDocente");
        Integer idGrupo = body.get("idGrupo");
        grupoService.validarAccesoRegistro(java.util.Collections.singletonList(idGrupo), "DOCENTE");
        grupoService.asignarDocenteAGrupo(idUsuario, codSis, idGrupo);
        return ResponseEntity.ok(Map.of("mensaje", "Docente asignado exitosamente al grupo."));
    }

    // 7. Inscribir Estudiante a Grupo
    @PostMapping("/estudiantes/inscribir")
    public ResponseEntity<Map<String, String>> inscribirEstudianteAGrupo(@RequestBody Map<String, Integer> body) {
        Integer idUsuario = body.get("idUsuario");
        Integer codSis = body.get("codSisEstudiante");
        Integer idGrupo = body.get("idGrupo");
        grupoService.validarAccesoRegistro(java.util.Collections.singletonList(idGrupo), "ESTUDIANTE");
        grupoService.inscribirEstudianteAGrupo(idUsuario, codSis, idGrupo);
        return ResponseEntity.ok(Map.of("mensaje", "Estudiante inscrito exitosamente en el grupo."));
    }

    // 8. Asignar Ayudante a Grupo
    @PostMapping("/ayudantes/asignar")
    public ResponseEntity<Map<String, String>> asignarAyudanteAGrupo(@RequestBody Map<String, Integer> body) {
        Integer idUsuario = body.get("idUsuario");
        Integer idGrupo = body.get("idGrupo");
        grupoService.validarAccesoRegistro(java.util.Collections.singletonList(idGrupo), "OPERADOR");
        grupoService.asignarAyudanteAGrupo(idUsuario, idGrupo);
        return ResponseEntity.ok(Map.of("mensaje", "Ayudante asignado exitosamente al grupo."));
    }

    // 9. Vista Home del Ayudante: Cargar sus asignaturas y grupos asignados
    @GetMapping("/ayudante/{idUsuario}")
    public ResponseEntity<List<AyudanteGrupoDetalleDto>> obtenerGruposAyudante(@PathVariable Integer idUsuario) {
        return ResponseEntity.ok(grupoService.obtenerGruposPorAyudante(idUsuario));
    }

    public record VincularRequest(Integer idUsuario, String rol, List<Integer> idGrupos) {}

    @PostMapping("/vinculaciones")
    public ResponseEntity<Map<String, String>> vincular(@RequestBody VincularRequest body) {
        grupoService.vincularUsuario(body.idUsuario(), body.rol(), body.idGrupos());
        return ResponseEntity.ok(Map.of("mensaje", "Vinculaciones guardadas sin duplicados."));
    }

    @GetMapping("/vinculaciones")
    public ResponseEntity<List<GrupoService.Vinculacion>> vinculaciones() {
        return ResponseEntity.ok(grupoService.listarVinculaciones());
    }
}
