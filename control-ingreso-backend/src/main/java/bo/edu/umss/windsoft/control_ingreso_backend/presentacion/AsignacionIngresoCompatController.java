package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AsignacionIngresoRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.AulaAsignacionDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/examenes/{idExamen}")
public class AsignacionIngresoCompatController {
    private final AsignacionIngresoService service;
    private final ContextoUsuarioService contexto;
    private final ExamenRepository examenRepository;

    public AsignacionIngresoCompatController(AsignacionIngresoService service,
                                             ContextoUsuarioService contexto,
                                             ExamenRepository examenRepository) {
        this.service = service;
        this.contexto = contexto;
        this.examenRepository = examenRepository;
    }

    @GetMapping("/operadores-disponibles")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE')")
    public ResponseEntity<?> operadores(@PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.operadoresDisponibles(idExamen));
    }

    @GetMapping("/asignacion-ingreso")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE','OPERADOR')")
    public ResponseEntity<Map<String, Object>> leer(@PathVariable Integer idExamen) {
        List<AulaAsignacionDTO> actuales = service.leerAsignacion(idExamen);
        List<Map<String, Object>> aulas = new ArrayList<>();
        List<Map<String, Object>> responsables = new ArrayList<>();
        for (AulaAsignacionDTO a : actuales) {
            aulas.add(Map.of("idAmbiente", a.idAmbiente(), "cantidad", a.capacidadAula() == null ? 0 : a.capacidadAula()));
            if (a.idOperadorAsignado() != null) {
                Map<String, Object> r = new LinkedHashMap<>();
                r.put("idAmbiente", a.idAmbiente());
                r.put("idUsuario", a.idOperadorAsignado());
                r.put("rol", "OPERADOR");
                r.put("nombreResponsable", (a.nombreOperador() + " " + a.apellidoOperador()).trim());
                responsables.add(r);
            }
        }
        return ResponseEntity.ok(Map.of("modoReparto", "MANUAL", "aulas", aulas, "responsables", responsables));
    }

    @PutMapping("/asignacion-ingreso")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE')")
    public ResponseEntity<?> guardar(@PathVariable Integer idExamen, @RequestBody Map<String, Object> body) {
        Examen examen = examenRepository.findById(idExamen).orElseThrow();
        List<AsignacionIngresoRequestDTO.ItemAsignacion> items = new ArrayList<>();
        Object responsables = body.get("responsables");
        if (responsables instanceof List<?> lista) for (Object valor : lista) {
            if (!(valor instanceof Map<?, ?> r)) continue;
            Object ambiente = r.get("idAmbiente");
            Object usuario = r.get("idUsuario");
            items.add(new AsignacionIngresoRequestDTO.ItemAsignacion(
                    ambiente instanceof Number n ? n.intValue() : Integer.valueOf(String.valueOf(ambiente)),
                    usuario instanceof Number n ? n.intValue() : usuario == null ? null : Integer.valueOf(String.valueOf(usuario))));
        }
        var request = new AsignacionIngresoRequestDTO(examen.getIdAsignatura(), items);
        return ResponseEntity.ok(service.guardarAsignacion(idExamen, request, contexto.actual()));
    }
}
