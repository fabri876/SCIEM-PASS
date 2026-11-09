package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceEnrollmentRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentAdminDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentStatusDto;
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

    public FaceEnrollmentService(FaceEnrollmentRepository enrollmentRepository, StorageProvider storageProvider,
                                 ContextoUsuarioService contextoUsuarioService, UsuarioRepository usuarioRepository,
                                 EstudianteRepository estudianteRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.storageProvider = storageProvider;
        this.contextoUsuarioService = contextoUsuarioService;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
    }

    @Transactional
    public FaceEnrollmentStatusDto enrolar(MultipartFile file, String embedding, String modelVersion,
                                           LocalDateTime consentimientoAt) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esEstudiante()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el estudiante puede registrar su rostro.");
        }
        if (file == null || file.isEmpty() || embedding == null || embedding.isBlank()
                || modelVersion == null || modelVersion.isBlank() || consentimientoAt == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Foto, embedding, modelo y consentimiento son obligatorios.");
        }
        String extension = extensionPermitida(file);
        String ruta;
        try {
            ruta = storageProvider.save(file.getBytes(), extension, "enrollments");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la fotografía biométrica.", ex);
        }

        enrollmentRepository.findByIdUsuarioAndEstado(usuario.idUsuario(), ACTIVO).ifPresent(anterior -> {
            anterior.setEstado("reemplazado");
            enrollmentRepository.save(anterior);
        });
        FaceEnrollment nuevo = new FaceEnrollment();
        nuevo.setIdUsuario(usuario.idUsuario());
        nuevo.setPhotoPath(ruta);
        nuevo.setEmbedding(embedding);
        nuevo.setModelVersion(modelVersion.trim());
        nuevo.setEstado(ACTIVO);
        nuevo.setConsentimientoAt(consentimientoAt);
        nuevo.setFechaRegistro(LocalDateTime.now());
        enrollmentRepository.save(nuevo);
        return new FaceEnrollmentStatusDto(usuario.idUsuario(), ACTIVO, nuevo.getFechaRegistro());
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
        if (!"bloqueado".equals(estadoNormalizado) && !"reemplazado".equals(estadoNormalizado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El estado permitido es bloqueado o reemplazado para habilitar un nuevo enrolamiento.");
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
            String nombre = u == null ? "" : (String.valueOf(u.getNombreusuario()) + " " + String.valueOf(u.getApellidousuario())).replace("null", "").trim();
            return new FaceEnrollmentAdminDto(e.getIdEnrollment(), e.getIdUsuario(), nombre, sis.get(e.getIdUsuario()),
                    e.getPhotoPath(), e.getModelVersion(), e.getEstado(), e.getConsentimientoAt(), e.getFechaRegistro());
        }).filter(dto -> filtro.isEmpty() || dto.nombreCompleto().toLowerCase(Locale.ROOT).contains(filtro)
                || String.valueOf(dto.codsisEstudiante()).contains(filtro)).toList();
    }

    private String extensionPermitida(MultipartFile file) {
        String contentType = file.getContentType();
        if ("image/jpeg".equalsIgnoreCase(contentType)) return "jpg";
        if ("image/png".equalsIgnoreCase(contentType)) return "png";
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La foto debe ser JPEG o PNG.");
    }
}
