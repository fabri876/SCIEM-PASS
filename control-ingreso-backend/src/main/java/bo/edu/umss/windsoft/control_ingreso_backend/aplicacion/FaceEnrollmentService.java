package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceEnrollmentRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentAdminDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentStatusDto;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FaceEnrollmentService {
    private static final String ACTIVO = "activo";

    private final FaceEnrollmentRepository enrollmentRepository;
    private final StorageProvider storageProvider;
    private final ContextoUsuarioService contextoUsuarioService;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final LimpiezaFotoBiometricaService limpiezaFotoBiometricaService;

    public FaceEnrollmentService(FaceEnrollmentRepository enrollmentRepository, StorageProvider storageProvider,
                                 ContextoUsuarioService contextoUsuarioService, UsuarioRepository usuarioRepository,
                                 EstudianteRepository estudianteRepository, ApplicationEventPublisher eventPublisher,
                                 LimpiezaFotoBiometricaService limpiezaFotoBiometricaService) {
        this.enrollmentRepository = enrollmentRepository;
        this.storageProvider = storageProvider;
        this.contextoUsuarioService = contextoUsuarioService;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.eventPublisher = eventPublisher;
        this.limpiezaFotoBiometricaService = limpiezaFotoBiometricaService;
    }

    @Transactional
    public FaceEnrollmentStatusDto enrolar(MultipartFile file, String embedding, String modelVersion,
                                           LocalDateTime consentimientoAt) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esEstudiante()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el estudiante puede registrar su rostro.");
        }
        validarSolicitud(file, embedding, modelVersion, consentimientoAt);
        if (enrollmentRepository.findByIdUsuarioForUpdate(usuario.idUsuario()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El estudiante ya tiene un enrolamiento facial historico.");
        }

        FaceEnrollment nuevo = new FaceEnrollment();
        nuevo.setIdUsuario(usuario.idUsuario());
        nuevo.setPhotoPath(guardarNuevaFoto(file));
        nuevo.setEmbedding(embedding.trim());
        nuevo.setModelVersion(modelVersion.trim());
        nuevo.setEstado(ACTIVO);
        nuevo.setConsentimientoAt(consentimientoAt);
        nuevo.setFechaRegistro(LocalDateTime.now());
        enrollmentRepository.save(nuevo);
        return new FaceEnrollmentStatusDto(usuario.idUsuario(), ACTIVO, nuevo.getFechaRegistro());
    }

    @Transactional
    public FaceEnrollmentStatusDto reenrolarComoAdministrador(Integer idUsuario, MultipartFile file, String embedding,
                                                               String modelVersion, LocalDateTime consentimientoAt) {
        validarSolicitud(file, embedding, modelVersion, consentimientoAt);
        if (!estudianteRepository.existsByIdusuario(idUsuario)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudiante no encontrado.");
        }
        FaceEnrollment existente = enrollmentRepository.findByIdUsuarioForUpdate(idUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "El estudiante no tiene un enrolamiento que pueda reemplazarse."));

        String rutaNueva = guardarNuevaFoto(file);
        String rutaAnterior = existente.getPhotoPath();
        existente.setPhotoPath(rutaNueva);
        existente.setEmbedding(embedding.trim());
        existente.setModelVersion(modelVersion.trim());
        existente.setEstado(ACTIVO);
        existente.setConsentimientoAt(consentimientoAt);
        existente.setFechaRegistro(LocalDateTime.now());
        enrollmentRepository.save(existente);
        Long idLimpieza = limpiezaFotoBiometricaService.encolar(rutaAnterior);
        eventPublisher.publishEvent(new FotoEnrolamientoReemplazadaEvent(idLimpieza));
        return new FaceEnrollmentStatusDto(idUsuario, ACTIVO, existente.getFechaRegistro());
    }

    @Transactional(readOnly = true)
    public FaceEnrollmentStatusDto estadoActual() {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esEstudiante()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el estudiante puede consultar su enrolamiento.");
        }
        return enrollmentRepository.findByIdUsuarioAndEstado(usuario.idUsuario(), ACTIVO)
                .map(e -> new FaceEnrollmentStatusDto(usuario.idUsuario(), ACTIVO, e.getFechaRegistro()))
                .orElseGet(() -> enrollmentRepository.findByIdUsuarioOrderByFechaRegistroDesc(usuario.idUsuario()).stream()
                        .findFirst()
                        .map(e -> new FaceEnrollmentStatusDto(usuario.idUsuario(), e.getEstado(), e.getFechaRegistro()))
                        .orElse(new FaceEnrollmentStatusDto(usuario.idUsuario(), "pendiente", null)));
    }

    @Transactional
    public FaceEnrollmentStatusDto cambiarEstado(Integer idEnrollment, String estado) {
        String estadoNormalizado = estado == null ? "" : estado.trim().toLowerCase();
        if (!"bloqueado".equals(estadoNormalizado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El unico estado administrativo permitido es bloqueado.");
        }
        FaceEnrollment enrollment = enrollmentRepository.findById(idEnrollment)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrolamiento no encontrado."));
        enrollment.setEstado(estadoNormalizado);
        enrollmentRepository.save(enrollment);
        return new FaceEnrollmentStatusDto(enrollment.getIdUsuario(), enrollment.getEstado(), enrollment.getFechaRegistro());
    }

    @Transactional(readOnly = true)
    public List<FaceEnrollmentAdminDto> listarAdministracion(String estado, String busqueda) {
        List<FaceEnrollment> lista = estado == null || estado.isBlank()
                ? enrollmentRepository.findAllByOrderByFechaRegistroDesc()
                : enrollmentRepository.findByEstadoOrderByFechaRegistroDesc(estado.trim().toLowerCase(Locale.ROOT));
        List<Integer> ids = lista.stream().map(FaceEnrollment::getIdUsuario).distinct().toList();
        Map<Integer, bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario> usuarios = usuarioRepository.findAllById(ids)
                .stream().collect(Collectors.toMap(bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario::getIdusuario, u -> u));
        Map<Integer, Integer> sis = estudianteRepository.findByIdusuarioIn(ids).stream()
                .collect(Collectors.toMap(bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante::getIdusuario,
                        bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante::getCodsisestudiante));
        String filtro = busqueda == null ? "" : busqueda.trim().toLowerCase(Locale.ROOT);
        return lista.stream().map(e -> {
            var u = usuarios.get(e.getIdUsuario());
            String nombre = u == null ? "" : (String.valueOf(u.getNombreusuario()) + " "
                    + String.valueOf(u.getApellidousuario())).replace("null", "").trim();
            return new FaceEnrollmentAdminDto(e.getIdEnrollment(), e.getIdUsuario(), nombre, sis.get(e.getIdUsuario()),
                    e.getPhotoPath(), e.getModelVersion(), e.getEstado(), e.getConsentimientoAt(), e.getFechaRegistro());
        }).filter(dto -> filtro.isEmpty() || dto.nombreCompleto().toLowerCase(Locale.ROOT).contains(filtro)
                || String.valueOf(dto.codsisEstudiante()).contains(filtro)).toList();
    }

    private void validarSolicitud(MultipartFile file, String embedding, String modelVersion, LocalDateTime consentimientoAt) {
        if (file == null || file.isEmpty() || embedding == null || embedding.isBlank()
                || modelVersion == null || modelVersion.isBlank() || consentimientoAt == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Foto, embedding, modelo y consentimiento son obligatorios.");
        }
    }

    private String guardarNuevaFoto(MultipartFile file) {
        try {
            String ruta = storageProvider.save(file.getBytes(), extensionPermitida(file), "enrollments");
            eventPublisher.publishEvent(new FotoEnrolamientoCreadaEvent(ruta));
            return ruta;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo guardar la fotografia biometrica.", ex);
        }
    }

    private String extensionPermitida(MultipartFile file) {
        String contentType = file.getContentType();
        if ("image/jpeg".equalsIgnoreCase(contentType)) return "jpg";
        if ("image/png".equalsIgnoreCase(contentType)) return "png";
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La foto debe ser JPEG o PNG.");
    }
}
