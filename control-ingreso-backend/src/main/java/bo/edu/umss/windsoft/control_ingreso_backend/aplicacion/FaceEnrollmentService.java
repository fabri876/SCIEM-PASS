package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceEnrollment;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceConsentimiento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceVerificacionEstudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.storage.StorageProvider;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceEnrollmentRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceConsentimientoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceVerificacionEstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentAdminDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceEnrollmentStatusDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceVerificacionEstudianteResponseDto;
import tools.jackson.databind.ObjectMapper;
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
    private static final String PENDIENTE_REENROLAMIENTO = "pendiente_reenrolamiento";
    private static final int MAX_INTENTOS_QR = 3;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final FaceEnrollmentRepository enrollmentRepository;
    private final StorageProvider storageProvider;
    private final ContextoUsuarioService contextoUsuarioService;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final LimpiezaFotoBiometricaService limpiezaFotoBiometricaService;
    private final FaceConsentimientoRepository consentimientoRepository;
    private final FaceVerificacionEstudianteRepository verificacionRepository;
    private final AuditoriaFacialService auditoriaFacialService;

    public FaceEnrollmentService(FaceEnrollmentRepository enrollmentRepository, StorageProvider storageProvider,
                                 ContextoUsuarioService contextoUsuarioService, UsuarioRepository usuarioRepository,
                                 EstudianteRepository estudianteRepository, ApplicationEventPublisher eventPublisher,
                                 LimpiezaFotoBiometricaService limpiezaFotoBiometricaService,
                                 FaceConsentimientoRepository consentimientoRepository,
                                 FaceVerificacionEstudianteRepository verificacionRepository,
                                 AuditoriaFacialService auditoriaFacialService) {
        this.enrollmentRepository = enrollmentRepository;
        this.storageProvider = storageProvider;
        this.contextoUsuarioService = contextoUsuarioService;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.eventPublisher = eventPublisher;
        this.limpiezaFotoBiometricaService = limpiezaFotoBiometricaService;
        this.consentimientoRepository = consentimientoRepository;
        this.verificacionRepository = verificacionRepository;
        this.auditoriaFacialService = auditoriaFacialService;
    }

    @Transactional
    public FaceEnrollmentStatusDto registrarConsentimiento() {
        return registrarConsentimiento("-");
    }

    @Transactional
    public FaceEnrollmentStatusDto registrarConsentimiento(String ip) {
        var usuario = contextoUsuarioService.actual();
        if (!usuario.esEstudiante()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el estudiante puede aceptar el consentimiento.");
        FaceConsentimiento consentimiento = new FaceConsentimiento();
        consentimiento.setIdUsuario(usuario.idUsuario());
        consentimiento.setAceptadoEn(LocalDateTime.now());
        consentimiento.setVersionTerminos("v1");
        consentimientoRepository.save(consentimiento);
        auditoriaFacialService.publicar("FACIAL_CONSENTIMIENTO_ACEPTADO", usuario.correo(), usuario.correo(), ip,
                "estudiante_web", "estudiante_correo=" + usuario.correo());
        return new FaceEnrollmentStatusDto(usuario.idUsuario(), "consentido", consentimiento.getAceptadoEn());
    }

    @Transactional
    public FaceEnrollmentStatusDto enrolar(MultipartFile file, String embedding, String modelVersion,
                                           LocalDateTime consentimientoAt) {
        return enrolar(file, embedding, modelVersion, consentimientoAt, "-");
    }

    @Transactional
    public FaceEnrollmentStatusDto enrolar(MultipartFile file, String embedding, String modelVersion,
                                           LocalDateTime consentimientoAt, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esEstudiante()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el estudiante puede registrar su rostro.");
        }
        FaceConsentimiento consentimiento = consentimientoRepository.findTopByIdUsuarioOrderByAceptadoEnDesc(usuario.idUsuario())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes aceptar el consentimiento antes de capturar tu rostro."));
        validarSolicitud(file, embedding, modelVersion, consentimiento.getAceptadoEn());
        FaceEnrollment existente = enrollmentRepository.findByIdUsuarioForUpdate(usuario.idUsuario()).orElse(null);
        if (existente != null && !PENDIENTE_REENROLAMIENTO.equals(existente.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El estudiante ya tiene un enrolamiento facial historico.");
        }

        FaceEnrollment nuevo = existente == null ? new FaceEnrollment() : existente;
        String rutaAnterior = existente == null ? null : existente.getPhotoPath();
        nuevo.setIdUsuario(usuario.idUsuario());
        nuevo.setPhotoPath(guardarNuevaFoto(file));
        nuevo.setEmbedding(embedding.trim());
        nuevo.setModelVersion(modelVersion.trim());
        nuevo.setEstado(ACTIVO);
        nuevo.setConsentimientoAt(consentimiento.getAceptadoEn());
        nuevo.setFechaRegistro(LocalDateTime.now());
        enrollmentRepository.save(nuevo);
        if (rutaAnterior != null) {
            Long idLimpieza = limpiezaFotoBiometricaService.encolar(rutaAnterior);
            eventPublisher.publishEvent(new FotoEnrolamientoReemplazadaEvent(idLimpieza));
        }
        String accion = existente == null ? "FACIAL_ENROLAMIENTO_INICIAL_COMPLETADO"
                : "FACIAL_REENROLAMIENTO_COMPLETADO";
        auditoriaFacialService.publicar(accion, usuario.correo(), usuario.correo(), ip, "estudiante_web",
                detalleEstudiante(usuario.idUsuario(), usuario.correo(), null));
        return new FaceEnrollmentStatusDto(usuario.idUsuario(), ACTIVO, nuevo.getFechaRegistro());
    }

    @Transactional
    public FaceEnrollmentStatusDto reenrolarComoAdministrador(Integer idUsuario, MultipartFile file, String embedding,
                                                               String modelVersion, LocalDateTime consentimientoAt) {
        return reenrolarComoAdministrador(idUsuario, file, embedding, modelVersion, consentimientoAt, "-");
    }

    @Transactional
    public FaceEnrollmentStatusDto reenrolarComoAdministrador(Integer idUsuario, MultipartFile file, String embedding,
                                                               String modelVersion, LocalDateTime consentimientoAt, String ip) {
        ContextoUsuarioService.UsuarioActual ejecutor = contextoUsuarioService.actual();
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
        String afectado = usuarioRepository.findById(idUsuario).map(u -> u.getCorreousuario()).orElse("-");
        auditoriaFacialService.publicar("FACIAL_REENROLAMIENTO_COMPLETADO", ejecutor.correo(), afectado, ip,
                "control_presencial", detalleEstudiante(idUsuario, afectado, null));
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
        return cambiarEstado(idEnrollment, estado, "-");
    }

    @Transactional
    public FaceEnrollmentStatusDto cambiarEstado(Integer idEnrollment, String estado, String ip) {
        ContextoUsuarioService.UsuarioActual ejecutor = contextoUsuarioService.actual();
        String estadoNormalizado = estado == null ? "" : estado.trim().toLowerCase();
        if (!"bloqueado".equals(estadoNormalizado) && !PENDIENTE_REENROLAMIENTO.equals(estadoNormalizado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El estado debe ser bloqueado o pendiente_reenrolamiento.");
        }
        FaceEnrollment enrollment = enrollmentRepository.findById(idEnrollment)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrolamiento no encontrado."));
        boolean cambio = !estadoNormalizado.equals(enrollment.getEstado());
        enrollment.setEstado(estadoNormalizado);
        enrollmentRepository.save(enrollment);
        if (cambio) {
            String afectado = usuarioRepository.findById(enrollment.getIdUsuario()).map(u -> u.getCorreousuario()).orElse("-");
            String accion = "bloqueado".equals(estadoNormalizado) ? "FACIAL_ENROLAMIENTO_BLOQUEADO"
                    : "FACIAL_REENROLAMIENTO_AUTORIZADO";
            auditoriaFacialService.publicar(accion, ejecutor.correo(), afectado, ip, "control_presencial",
                    detalleEstudiante(enrollment.getIdUsuario(), afectado, "estado=" + estadoNormalizado));
        }
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

    @Transactional
    public FaceVerificacionEstudianteResponseDto verificarEstudiante(String embeddingJson, Double livenessScore, Integer idExamen) {
        return verificarEstudiante(embeddingJson, livenessScore, idExamen, "-");
    }

    @Transactional
    public FaceVerificacionEstudianteResponseDto verificarEstudiante(String embeddingJson, Double livenessScore,
                                                                      Integer idExamen, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        if (!usuario.esEstudiante()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el estudiante puede verificar su identidad biométrica.");
        }
        FaceEnrollment enrollment = enrollmentRepository.findByIdUsuarioAndEstado(usuario.idUsuario(), ACTIVO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "El estudiante no cuenta con un enrolamiento facial activo."));

        if (idExamen == null || idExamen <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El examen es obligatorio.");
        }
        if (verificacionRepository.countByIdUsuarioAndIdExamenAndResultado(usuario.idUsuario(), idExamen, "RECHAZADO") >= MAX_INTENTOS_QR) {
            auditoriaFacialService.publicar("FACIAL_QR_LIMITE_INTENTOS", usuario.correo(), usuario.correo(), ip,
                    "estudiante_web", detalleEstudiante(usuario.idUsuario(), usuario.correo(), "examen=" + idExamen + " | resultado=limite_intentos"));
            return new FaceVerificacionEstudianteResponseDto(false, 0.0, livenessScore, "Alcanzaste el limite de 3 intentos para este examen.");
        }
        if (embeddingJson == null || embeddingJson.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El vector biométrico en vivo es obligatorio.");
        }

        if (livenessScore != null && livenessScore < 0.70) {
            guardarVerificacion(usuario.idUsuario(), idExamen, false, 0.0, livenessScore,
                    "La prueba de vida no supero el minimo requerido.");
            publicarResultadoQr(usuario, idExamen, false, 0.0, livenessScore, ip);
            return new FaceVerificacionEstudianteResponseDto(false, 0.0, livenessScore,
                    "No se pudo confirmar que seas una persona real. Mira de frente a la cámara.");
        }

        double[] actual;
        double[] referencia;
        try {
            actual = OBJECT_MAPPER.readValue(embeddingJson, double[].class);
            referencia = OBJECT_MAPPER.readValue(enrollment.getEmbedding(), double[].class);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error al procesar los vectores biométricos.");
        }

        double score = calcularSimilitudCoseno(actual, referencia);
        double umbral = 0.82;
        boolean autorizado = score >= umbral;
        String mensaje = autorizado
                ? "Identidad confirmada con éxito."
                : "El rostro no coincide suficientemente con la foto registrada en tu primer ingreso.";

        FaceVerificacionEstudianteResponseDto respuesta = guardarVerificacion(usuario.idUsuario(), idExamen, autorizado, score, livenessScore, mensaje);
        publicarResultadoQr(usuario, idExamen, autorizado, score, livenessScore, ip);
        return respuesta;
    }

    private FaceVerificacionEstudianteResponseDto guardarVerificacion(Integer idUsuario, Integer idExamen,
            boolean autorizado, double score, Double liveness, String mensaje) {
        FaceVerificacionEstudiante intento = new FaceVerificacionEstudiante();
        intento.setIdUsuario(idUsuario); intento.setIdExamen(idExamen);
        intento.setResultado(autorizado ? "AUTORIZADO" : "RECHAZADO");
        intento.setScore(score); intento.setLivenessScore(liveness); intento.setVerificadoEn(LocalDateTime.now());
        if (autorizado) intento.setVenceEn(LocalDateTime.now().plusMinutes(10));
        verificacionRepository.save(intento);
        return new FaceVerificacionEstudianteResponseDto(autorizado, score, liveness, mensaje);
    }

    private void publicarResultadoQr(ContextoUsuarioService.UsuarioActual usuario, Integer idExamen,
                                     boolean autorizado, double score, Double liveness, String ip) {
        auditoriaFacialService.publicar(autorizado ? "FACIAL_QR_AUTORIZADO" : "FACIAL_QR_RECHAZADO",
                usuario.correo(), usuario.correo(), ip, "estudiante_web",
                detalleEstudiante(usuario.idUsuario(), usuario.correo(), "examen=" + idExamen
                        + " | resultado=" + (autorizado ? "autorizado" : "rechazado")
                        + " | score=" + score + " | liveness=" + liveness));
    }

    private String detalleEstudiante(Integer idUsuario, String correo, String extra) {
        String sis = estudianteRepository.findByIdusuario(idUsuario).map(e -> String.valueOf(e.getCodsisestudiante())).orElse("-");
        return "sis=" + sis + " | estudiante_correo=" + correo + (extra == null ? "" : " | " + extra);
    }

    @Transactional(readOnly = true)
    public boolean tieneAutorizacionQrVigente(Integer idUsuario, Integer idExamen) {
        return verificacionRepository.findTopByIdUsuarioAndIdExamenAndResultadoAndVenceEnAfterOrderByVerificadoEnDesc(
                idUsuario, idExamen, "AUTORIZADO", LocalDateTime.now()).isPresent();
    }

    @Transactional(readOnly = true)
    public byte[] obtenerFotoBytes(Integer idUsuario, Integer idExamen, String ip) {
        var usuario = contextoUsuarioService.actual();
        if (usuario.esEstudiante() && !usuario.idUsuario().equals(idUsuario)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para ver la foto de otro estudiante.");
        }
        if (!usuario.esEstudiante() && !usuario.esAdmin()) {
            if (idExamen == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "La foto biometrica solo se consulta desde un contexto academico autorizado.");
            }
            contextoUsuarioService.verificarAccesoExamen(usuario, idExamen, true,
                    "Consultar foto biometrica", ip);
        }
        FaceEnrollment enrollment = enrollmentRepository
                .findByIdUsuarioAndEstado(idUsuario, ACTIVO)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No hay enrolamiento activo para este usuario."));
        try {
            return storageProvider.get(enrollment.getPhotoPath());
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo leer la foto biometrica.");
        }
    }

    public static double calcularSimilitudCoseno(double[] a, double[] b) {
        if (a == null || b == null || a.length == 0 || a.length != b.length) {
            return 0.0;
        }
        double producto = 0.0;
        double normaA = 0.0;
        double normaB = 0.0;
        for (int i = 0; i < a.length; i++) {
            producto += a[i] * b[i];
            normaA += a[i] * a[i];
            normaB += b[i] * b[i];
        }
        double denominador = Math.sqrt(normaA) * Math.sqrt(normaB);
        if (denominador == 0.0) return 0.0;
        double coseno = producto / denominador;
        double similitud = (coseno + 1.0) / 2.0;
        return Math.max(0.0, Math.min(1.0, similitud));
    }
}
