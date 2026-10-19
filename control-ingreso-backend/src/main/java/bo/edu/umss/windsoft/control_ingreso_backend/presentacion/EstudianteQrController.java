package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ContextoUsuarioService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.EstudianteQrService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.QrCredencialDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenRespuestaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.ExamenService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador para que el estudiante consulte su credencial QR por examen.
 * Endpoint: GET /api/v1/estudiante/examenes/{idExamen}/qr
 */
@RestController
@RequestMapping("/api/v1/estudiante")
public class EstudianteQrController {

    private final EstudianteQrService estudianteQrService;
    private final ContextoUsuarioService contextoUsuarioService;
    private final ExamenService examenService;

    public EstudianteQrController(EstudianteQrService estudianteQrService,
                                  ContextoUsuarioService contextoUsuarioService,
                                  ExamenService examenService) {
        this.estudianteQrService = estudianteQrService;
        this.contextoUsuarioService = contextoUsuarioService;
        this.examenService = examenService;
    }

    @GetMapping("/examenes")
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public ResponseEntity<List<ExamenRespuestaDto>> obtenerExamenes() {
        return ResponseEntity.ok(examenService.obtenerExamenesEstudiante(
                contextoUsuarioService.actual().idUsuario()));
    }

    /**
     * Devuelve la credencial QR del estudiante autenticado para un examen específico.
     * Si el QR está dentro de la ventana de validez, se incluye el contenido del código QR.
     * Si no, se devuelve contenidoQr=null con un mensaje explicativo.
     *
     * @param idExamen ID del examen a consultar
     * @return 200 OK con QrCredencialDTO
     */
    @GetMapping("/examenes/{idExamen}/qr")
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public ResponseEntity<QrCredencialDTO> obtenerQrExamen(@PathVariable Integer idExamen) {
        Integer idUsuario = contextoUsuarioService.actual().idUsuario();
        QrCredencialDTO respuesta = estudianteQrService.obtenerQrParaEstudiante(idUsuario, idExamen);
        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/examenes/{idExamen}/qr/regenerar")
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public ResponseEntity<QrCredencialDTO> regenerarQr(@PathVariable Integer idExamen) {
        Integer idUsuario = contextoUsuarioService.actual().idUsuario();
        return ResponseEntity.ok(estudianteQrService.regenerarQrParaEstudiante(idUsuario, idExamen));
    }
}
