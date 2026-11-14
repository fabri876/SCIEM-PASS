package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.IngresoExcepcionalService;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.ClientIpResolver;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ConsultaEstudianteDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.IngresoExcepcionalDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * HU06 · Ingreso excepcional. Solo DOCENTE (de la materia) y ADMINISTRADOR
 * (ver SecurityConfig; la materia se valida en el servicio).
 */
@RestController
@RequestMapping("/api/ingresos-excepcionales")
public class IngresoExcepcionalController {

    private final IngresoExcepcionalService ingresoExcepcionalService;

    public IngresoExcepcionalController(IngresoExcepcionalService ingresoExcepcionalService) {
        this.ingresoExcepcionalService = ingresoExcepcionalService;
    }

    /** Busca al estudiante (Código SIS o CI) en el aula y dice qué acciones se permiten. */
    @GetMapping("/consulta")
    public ResponseEntity<ConsultaEstudianteDto> consultar(@RequestParam Integer idAmbiente,
                                                           @RequestParam String q,
                                                           HttpServletRequest request) {
        return ResponseEntity.ok(ingresoExcepcionalService.consultar(idAmbiente, q, false,
                ClientIpResolver.resolver(request)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IngresoExcepcionalDto> autorizar(@RequestParam Integer idAmbiente,
                                                           @RequestParam Integer codSis,
                                                           @RequestParam String motivo,
                                                           @RequestParam String observacion,
                                                           @RequestParam(required = false) MultipartFile respaldo,
                                                           HttpServletRequest request) {
        if (MotivoExcepcion.MODO_RAPIDO.name().equalsIgnoreCase(motivo)) {
            throw new SolicitudInvalidaException("MODO_RAPIDO solo se registra desde el control normal.");
        }
        IngresoExcepcionalDto respuesta = ingresoExcepcionalService.autorizar(idAmbiente, codSis, motivo, observacion,
                respaldo, ClientIpResolver.resolver(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    @GetMapping
    public ResponseEntity<List<IngresoExcepcionalDto>> listar(@RequestParam(required = false) Integer idExamen,
                                                              @RequestParam(required = false) Integer idAmbiente,
                                                              HttpServletRequest request) {
        return ResponseEntity.ok(ingresoExcepcionalService.listar(idExamen, idAmbiente,
                ClientIpResolver.resolver(request)));
    }
}
