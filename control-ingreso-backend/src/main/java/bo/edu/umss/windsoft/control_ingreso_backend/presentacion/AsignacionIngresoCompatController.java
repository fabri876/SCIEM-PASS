package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.AsignacionIngresoService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ResponsableExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
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
    private final ResponsableExamenRepository responsableExamenRepository;
    private final UsuarioRepository usuarioRepository;

    public AsignacionIngresoCompatController(AsignacionIngresoService service,
                                             ContextoUsuarioService contexto,
                                             ExamenRepository examenRepository,
                                             ResponsableExamenRepository responsableExamenRepository,
                                             UsuarioRepository usuarioRepository) {
        this.service = service;
        this.contexto = contexto;
        this.examenRepository = examenRepository;
        this.responsableExamenRepository = responsableExamenRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/operadores-disponibles")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE')")
    public ResponseEntity<?> operadores(@PathVariable Integer idExamen) {
        return ResponseEntity.ok(service.operadoresDisponibles(idExamen, contexto.actual()));
    }

    @GetMapping("/asignacion-ingreso")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE','OPERADOR')")
    public ResponseEntity<Map<String, Object>> leer(@PathVariable Integer idExamen) {
        List<AulaAsignacionDTO> actuales = service.leerAsignacion(idExamen, contexto.actual());
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
                r.put("apellidoDesde", a.apellidoDesde());
                r.put("activo", a.operadorActivo());
                r.put("apellidoHasta", a.apellidoHasta());
                responsables.add(r);
            }
        }
        responsableExamenRepository.findByIdexamenAndEstado(idExamen, "ACTIVO").forEach(r -> {
            var usuario = usuarioRepository.findById(r.getIdusuario()).orElse(null);
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("idAmbiente", r.getIdambiente());
            fila.put("idUsuario", r.getIdusuario());
            fila.put("rol", r.getRol());
            fila.put("nombreResponsable", usuario == null ? "Responsable" :
                    (usuario.getNombreusuario() + " " + usuario.getApellidousuario()).trim());
            fila.put("apellidoDesde", r.getApellidoDesde());
            fila.put("apellidoHasta", r.getApellidoHasta());
            responsables.add(fila);
        });
        String modoAsignacion = actuales.stream()
                .map(a -> service.modoAsignacion(idExamen, a.idAmbiente()))
                .filter(java.util.Objects::nonNull)
                .findFirst().orElse("SUBDIVISION");
        return ResponseEntity.ok(Map.of("modoReparto", "MANUAL", "modoAsignacion", modoAsignacion, "aulas", aulas, "responsables", responsables));
    }

    @PutMapping("/asignacion-ingreso")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','DOCENTE')")
    public ResponseEntity<?> guardar(@PathVariable Integer idExamen, @RequestBody Map<String, Object> body) {
        Examen examen = examenRepository.findById(idExamen).orElseThrow();
        List<AsignacionIngresoRequestDTO.ItemAsignacion> items = new ArrayList<>();
        Map<Integer, Integer> ambientesSinOperador = new LinkedHashMap<>();
        service.leerAsignacion(idExamen, contexto.actual()).forEach(a ->
                ambientesSinOperador.putIfAbsent(a.idAmbiente(), null));
        Object responsables = body.get("responsables");
        if (responsables instanceof List<?> lista) for (Object valor : lista) {
            if (!(valor instanceof Map<?, ?> r)) continue;
            Object rol = r.get("rol");
            Object ambiente = r.get("idAmbiente");
            Object usuario = r.get("idUsuario");
            Integer idAmbiente = ambiente instanceof Number n ? n.intValue() : Integer.valueOf(String.valueOf(ambiente));
            Integer idUsuario = usuario instanceof Number n ? n.intValue() : usuario == null ? null : Integer.valueOf(String.valueOf(usuario));
            String apellidoDesde = r.get("apellidoDesde") == null ? null : String.valueOf(r.get("apellidoDesde"));
            String apellidoHasta = r.get("apellidoHasta") == null ? null : String.valueOf(r.get("apellidoHasta"));
            items.add(new AsignacionIngresoRequestDTO.ItemAsignacion(idAmbiente, idUsuario, apellidoDesde, apellidoHasta, String.valueOf(rol)));
        }
        ambientesSinOperador.forEach((idAmbiente, ignorado) -> {
            if (items.stream().noneMatch(i -> i.idAmbiente().equals(idAmbiente)))
                items.add(new AsignacionIngresoRequestDTO.ItemAsignacion(idAmbiente, null, null, null, null));
        });
        String modoAsignacion = "ONLINE".equalsIgnoreCase(String.valueOf(body.get("modoAsignacion")))
                ? "ONLINE" : "SUBDIVISION";
        var request = new AsignacionIngresoRequestDTO(examen.getIdAsignatura(), items, modoAsignacion);
        return ResponseEntity.ok(service.guardarAsignacion(idExamen, request, contexto.actual()));
    }
}
