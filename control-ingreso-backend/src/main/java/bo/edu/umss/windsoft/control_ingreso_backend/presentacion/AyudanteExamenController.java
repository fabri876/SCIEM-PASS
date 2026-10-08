package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ControlIngresoAyudanteService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.DelegadoExamenDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.JornadaActivaDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ResultadoIngresoDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.VerificarIngresoRequestDTO;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class AyudanteExamenController {

    private final ControlIngresoAyudanteService controlIngresoAyudanteService;
    private final ContextoUsuarioService contextoUsuarioService;

    public AyudanteExamenController(ControlIngresoAyudanteService controlIngresoAyudanteService,
                                   ContextoUsuarioService contextoUsuarioService) {
        this.controlIngresoAyudanteService = controlIngresoAyudanteService;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @GetMapping("/examenes/delegados")
    @PreAuthorize("hasRole('OPERADOR')")
    public ResponseEntity<List<DelegadoExamenDTO>> obtenerDelegados() {
        Integer idUsuario = contextoUsuarioService.actual().idUsuario();
        List<DelegadoExamenDTO> delegados = controlIngresoAyudanteService.obtenerDelegadosActivos(idUsuario);
        return ResponseEntity.ok(delegados);
    }

    @GetMapping("/control/jornada-activa")
    @PreAuthorize("hasRole('OPERADOR')")
    public ResponseEntity<JornadaActivaDTO> obtenerJornadaActiva() {
        Integer idUsuario = contextoUsuarioService.actual().idUsuario();
        JornadaActivaDTO jornadaActiva = controlIngresoAyudanteService.obtenerJornadaActiva(idUsuario);
        return ResponseEntity.ok(jornadaActiva);
    }

    @GetMapping("/control/examen-seleccionado")
    @PreAuthorize("hasRole('OPERADOR')")
    public ResponseEntity<JornadaActivaDTO> obtenerExamenSeleccionado(
            @org.springframework.web.bind.annotation.RequestParam Integer idasignatura,
            @org.springframework.web.bind.annotation.RequestParam Integer idexamen,
            @org.springframework.web.bind.annotation.RequestParam Integer idambiente) {
        Integer idUsuario = contextoUsuarioService.actual().idUsuario();
        JornadaActivaDTO detalle = controlIngresoAyudanteService.obtenerExamenSeleccionado(idUsuario, idasignatura, idexamen, idambiente);
        return ResponseEntity.ok(detalle);
    }

    @GetMapping("/control/ultimos-ingresos")
    @PreAuthorize("hasRole('OPERADOR')")
    public ResponseEntity<List<bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UltimoIngresoDTO>> obtenerUltimosIngresos(
            @org.springframework.web.bind.annotation.RequestParam Integer idasignatura,
            @org.springframework.web.bind.annotation.RequestParam Integer idexamen,
            @org.springframework.web.bind.annotation.RequestParam Integer idambiente,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "5") int limite) {
        List<bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.UltimoIngresoDTO> ultimos =
                controlIngresoAyudanteService.obtenerUltimosIngresos(idasignatura, idexamen, idambiente, limite);
        return ResponseEntity.ok(ultimos);
    }

    @PostMapping("/control/ingresos")
    @PreAuthorize("hasRole('OPERADOR')")
    public ResponseEntity<ResultadoIngresoDTO> registrarIngreso(@Valid @RequestBody VerificarIngresoRequestDTO dto) {
        Integer idOperador = contextoUsuarioService.actual().idUsuario();
        return controlIngresoAyudanteService.registrarIngreso(dto, idOperador);
    }
}
