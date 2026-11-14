package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.FaceEnrollmentService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.FaceExamPackageService;
import bo.edu.umss.windsoft.control_ingreso_backend.aplicacion.FaceSyncService;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentStatusDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentStatusRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceExamPackageStudentDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceSyncRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceSyncResponseDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentAdminDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceAuditoriaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceIntentoAdminDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceVerificacionEstudianteRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceVerificacionEstudianteResponseDto;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/face")
public class FaceController {
    private final FaceEnrollmentService enrollmentService;
    private final FaceExamPackageService examPackageService;
    private final FaceSyncService syncService;

    public FaceController(FaceEnrollmentService enrollmentService, FaceExamPackageService examPackageService,
                          FaceSyncService syncService) {
        this.enrollmentService = enrollmentService;
        this.examPackageService = examPackageService;
        this.syncService = syncService;
    }

    @PostMapping(value = "/enroll", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public ResponseEntity<FaceEnrollmentStatusDto> enrolar(@RequestParam MultipartFile file,
                                                            @RequestParam String embedding,
                                                            @RequestParam String modelVersion,
                                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                                            LocalDateTime consentimientoAt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(enrollmentService.enrolar(file, embedding, modelVersion, consentimientoAt));
    }

    @PostMapping("/enrollment/consentimiento")
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public ResponseEntity<FaceEnrollmentStatusDto> registrarConsentimiento() {
        return ResponseEntity.status(HttpStatus.CREATED).body(enrollmentService.registrarConsentimiento());
    }

    @PostMapping(value = "/enrollment/{idUsuario}/override", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<FaceEnrollmentStatusDto> reenrolarComoAdministrador(@PathVariable Integer idUsuario,
                                                                                 @RequestParam MultipartFile file,
                                                                                 @RequestParam String embedding,
                                                                                 @RequestParam String modelVersion,
                                                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                                                                 LocalDateTime consentimientoAt) {
        return ResponseEntity.ok(enrollmentService.reenrolarComoAdministrador(
                idUsuario, file, embedding, modelVersion, consentimientoAt));
    }

    @GetMapping("/enrollment/status")
    @PreAuthorize("hasAnyRole('ESTUDIANTE','ADMINISTRADOR')")
    public FaceEnrollmentStatusDto estadoEnrolamiento() {
        return enrollmentService.estadoActual();
    }

    @PostMapping("/verificar-estudiante")
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public ResponseEntity<FaceVerificacionEstudianteResponseDto> verificarEstudiante(
            @Valid @RequestBody FaceVerificacionEstudianteRequestDto solicitud) {
        return ResponseEntity.ok(enrollmentService.verificarEstudiante(
                solicitud.embedding(), solicitud.livenessScore(), solicitud.idExamen()));
    }

    @PatchMapping("/enrollment/{idEnrollment}/status")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public FaceEnrollmentStatusDto cambiarEstado(@PathVariable Integer idEnrollment,
                                                  @Valid @RequestBody FaceEnrollmentStatusRequestDto solicitud) {
        return enrollmentService.cambiarEstado(idEnrollment, solicitud.estado());
    }

    @GetMapping("/examenes/{idExamen}/paquete")
    @PreAuthorize("hasAnyRole('DOCENTE','OPERADOR','ADMINISTRADOR')")
    public List<FaceExamPackageStudentDto> paquete(@PathVariable Integer idExamen) {
        return examPackageService.obtenerPaquete(idExamen);
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('OPERADOR','DOCENTE','ADMINISTRADOR')")
    public FaceSyncResponseDto sincronizar(@RequestBody FaceSyncRequestDto solicitud) {
        return syncService.sincronizar(solicitud);
    }

    @GetMapping(value = "/enrollment/{idUsuario}/foto", produces = MediaType.IMAGE_JPEG_VALUE)
    @PreAuthorize("hasAnyRole('ESTUDIANTE','OPERADOR','DOCENTE','ADMINISTRADOR')")
    public ResponseEntity<byte[]> obtenerFotoEnrolamiento(@PathVariable Integer idUsuario) {
        byte[] bytes = enrollmentService.obtenerFotoBytes(idUsuario);
        return ResponseEntity.ok()
                // Una foto biometrica puede ser reemplazada o eliminada: nunca
                // servir una version anterior desde la cache del navegador.
                .header(HttpHeaders.CACHE_CONTROL, "no-store, private")
                .body(bytes);
    }

    @GetMapping("/enrollments")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public List<FaceEnrollmentAdminDto> listarEnrollments(@RequestParam(required = false) String estado,
                                                            @RequestParam(required = false) String busqueda) {
        return enrollmentService.listarAdministracion(estado, busqueda);
    }

    @GetMapping("/auditoria")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public List<FaceAuditoriaDto> auditoria() {
        return syncService.listarAuditoria();
    }

    @GetMapping("/intentos")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public List<FaceIntentoAdminDto> intentos(@RequestParam(required = false) Integer idExamen,
                                               @RequestParam(required = false) Integer idAmbiente) {
        return syncService.listarIntentos(idExamen, idAmbiente);
    }
}
