package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceIntento;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Ingreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MetodoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoExcepcion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.TipoIngreso;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.FaceIntentoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.IngresoRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceAuditoriaDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceIntentoAdminDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceSyncRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.FaceSyncResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Sincroniza datos creados offline; el UUID de cliente permite reintentos seguros. */
@Service
public class FaceSyncService {
    private final FaceIntentoRepository intentoRepository;
    private final IngresoRepository ingresoRepository;
    private final ContextoUsuarioService contextoUsuarioService;
    private final UsuarioRepository usuarioRepository;
    private final EstudianteRepository estudianteRepository;
    private final AuditoriaFacialService auditoriaFacialService;

    public FaceSyncService(FaceIntentoRepository intentoRepository, IngresoRepository ingresoRepository,
                           ContextoUsuarioService contextoUsuarioService, UsuarioRepository usuarioRepository,
                           EstudianteRepository estudianteRepository, AuditoriaFacialService auditoriaFacialService) {
        this.intentoRepository = intentoRepository;
        this.ingresoRepository = ingresoRepository;
        this.contextoUsuarioService = contextoUsuarioService;
        this.usuarioRepository = usuarioRepository;
        this.estudianteRepository = estudianteRepository;
        this.auditoriaFacialService = auditoriaFacialService;
    }

    @Transactional(readOnly = true)
    public List<FaceAuditoriaDto> listarAuditoria() {
        var usuarios = usuarioRepository.findAll().stream().collect(java.util.stream.Collectors.toMap(
                bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario::getIdusuario, u -> u));
        return ingresoRepository.findByAuditFlagTrueOrderBySincronizadoEnDescHoraIngresoDesc().stream().map(i -> {
            var estudiante = usuarios.get(i.getIdUsuarioEstudiante());
            String nombre = estudiante == null ? null : (estudiante.getNombreusuario() + " " + estudiante.getApellidousuario()).trim();
            return new FaceAuditoriaDto(i.getIdIngreso(), i.getCodsisEstudiante(), nombre, i.getIdAmbiente(),
                    i.getIdAsignatura(), i.getIdExamen(), i.getTipoIngreso().name(), i.getMetodoIngreso().name(),
                    i.getMotivoExcepcion() == null ? null : i.getMotivoExcepcion().name(), i.getObservacionIngreso(),
                    i.getScoreFacial(), i.getServerRecheckScore(), i.getSincronizadoEn(), i.getHoraIngreso(), i.getIdUsuarioRegistra());
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<FaceIntentoAdminDto> listarIntentos(Integer idExamen, Integer idAmbiente) {
        List<FaceIntento> intentos = idExamen != null && idAmbiente != null ? intentoRepository.findByIdExamenAndIdAmbienteOrderByCapturadoEnDesc(idExamen, idAmbiente)
                : idExamen != null ? intentoRepository.findByIdExamenOrderByCapturadoEnDesc(idExamen)
                : idAmbiente != null ? intentoRepository.findByIdAmbienteOrderByCapturadoEnDesc(idAmbiente)
                : intentoRepository.findAllByOrderByCapturadoEnDesc();
        return intentos.stream().map(i -> new FaceIntentoAdminDto(i.getIdIntento(), i.getClientUuid(),
                i.getIdUsuarioEstudiante(), i.getIdUsuarioOperador(), i.getIdAmbiente(), i.getScore(), i.getLivenessScore(),
                i.getResultado(), i.getDeviceId(), i.getCapturadoEn(), i.getSincronizadoEn())).toList();
    }

    @Transactional
    public FaceSyncResponseDto sincronizar(FaceSyncRequestDto request) {
        return sincronizar(request, "-");
    }

    @Transactional
    public FaceSyncResponseDto sincronizar(FaceSyncRequestDto request, String ip) {
        if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El lote es obligatorio.");
        Integer idOperador = contextoUsuarioService.actual().idUsuario();
        List<FaceSyncResponseDto.ItemResultadoDto> intentos = new ArrayList<>();
        List<FaceSyncResponseDto.ItemResultadoDto> ingresos = new ArrayList<>();
        for (FaceSyncRequestDto.IntentoDto dto : request.intentos() == null ? List.<FaceSyncRequestDto.IntentoDto>of() : request.intentos()) {
            try { intentos.add(sincronizarIntento(dto, idOperador, ip)); }
            catch (ResponseStatusException ex) { intentos.add(resultado(dto == null ? null : dto.clientUuid(), "ERROR", ex.getReason())); }
        }
        for (FaceSyncRequestDto.IngresoDto dto : request.ingresos() == null ? List.<FaceSyncRequestDto.IngresoDto>of() : request.ingresos()) {
            try { ingresos.add(sincronizarIngreso(dto, idOperador, ip)); }
            catch (ResponseStatusException ex) { ingresos.add(resultado(dto == null ? null : dto.clientUuid(), "ERROR", ex.getReason())); }
        }
        return new FaceSyncResponseDto(intentos, ingresos);
    }

    private FaceSyncResponseDto.ItemResultadoDto sincronizarIntento(FaceSyncRequestDto.IntentoDto dto, Integer idOperador, String ip) {
        validarUuid(dto == null ? null : dto.clientUuid());
        if (intentoRepository.findByClientUuid(dto.clientUuid()).isPresent()) {
            return resultado(dto.clientUuid(), "DUPLICADO", "El intento ya fue sincronizado.");
        }
        if (dto.idUsuarioEstudiante() == null || dto.idAsignatura() == null || dto.idExamen() == null
                || dto.idAmbiente() == null || dto.deviceId() == null || dto.deviceId().isBlank()
                || dto.modelVersion() == null || dto.modelVersion().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faltan datos obligatorios del intento facial.");
        }
        String resultado = dto.resultado() == null ? "" : dto.resultado().trim().toLowerCase(Locale.ROOT);
        if (!"autorizado".equals(resultado) && !"rechazado".equals(resultado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El resultado facial debe ser autorizado o rechazado.");
        }
        FaceIntento intento = new FaceIntento();
        intento.setClientUuid(dto.clientUuid());
        intento.setIdUsuarioEstudiante(dto.idUsuarioEstudiante());
        intento.setIdUsuarioOperador(idOperador);
        intento.setIdAsignatura(dto.idAsignatura());
        intento.setIdExamen(dto.idExamen());
        intento.setIdAmbiente(dto.idAmbiente());
        intento.setScore(dto.score());
        intento.setLivenessScore(dto.livenessScore());
        intento.setResultado(resultado);
        intento.setDeviceId(dto.deviceId().trim());
        intento.setModelVersion(dto.modelVersion().trim());
        intento.setCapturadoEn(dto.capturadoEn() == null ? LocalDateTime.now() : dto.capturadoEn());
        intento.setSincronizadoEn(LocalDateTime.now());
        intentoRepository.save(intento);
        String afectado = correo(dto.idUsuarioEstudiante());
        auditoriaFacialService.publicar("autorizado".equals(resultado) ? "FACIAL_CONTROL_AUTORIZADO" : "FACIAL_CONTROL_RECHAZADO",
                correo(idOperador), afectado, ip, "sincronizacion_offline",
                detalleEstudiante(dto.idUsuarioEstudiante(), afectado, dto.idExamen(), dto.idAmbiente(), resultado,
                        dto.score(), dto.livenessScore(), null));
        return resultado(dto.clientUuid(), "PROCESADO", "Intento facial sincronizado.");
    }

    private FaceSyncResponseDto.ItemResultadoDto sincronizarIngreso(FaceSyncRequestDto.IngresoDto dto, Integer idOperador, String ip) {
        validarUuid(dto == null ? null : dto.clientUuid());
        if (dto.idAmbiente() == null || dto.idUsuarioEstudiante() == null || dto.codsisEstudiante() == null
                || dto.idAsignatura() == null || dto.idExamen() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La marcación requiere estudiante, examen, asignatura y ambiente.");
        }
        if (ingresoRepository.findByClientUuid(dto.clientUuid()).isPresent()) {
            return resultado(dto.clientUuid(), "DUPLICADO", "La marcación ya fue sincronizada.");
        }
        var previo = ingresoRepository.findByCodsisEstudianteAndIdAsignaturaAndIdExamen(
                dto.codsisEstudiante(), dto.idAsignatura(), dto.idExamen());
        if (previo.isPresent()) {
            ingresoRepository.marcarAuditoria(previo.get().getIdIngreso());
            String afectado = correo(dto.idUsuarioEstudiante());
            auditoriaFacialService.publicar("FACIAL_COLISION_OFFLINE", correo(idOperador), afectado, ip,
                    "sincronizacion_offline", detalleEstudiante(dto.idUsuarioEstudiante(), afectado, dto.idExamen(),
                            dto.idAmbiente(), "colision", dto.scoreFacial(), dto.livenessScore(),
                            "ingreso_existente=" + previo.get().getIdIngreso()));
            return resultado(dto.clientUuid(), "COLISION_AUDITADA",
                    "Se conservó la primera marcación y se marcó para auditoría.");
        }

        MetodoIngreso metodo = enumSeguro(MetodoIngreso.class, dto.metodoIngreso(), "metodoIngreso");
        TipoIngreso tipo = enumSeguro(TipoIngreso.class, dto.tipoIngreso(), "tipoIngreso");
        validarReglasIngreso(dto, metodo, tipo);
        LocalDateTime horaMarcacion = dto.horaMarcacion() == null ? LocalDateTime.now() : dto.horaMarcacion();
        Ingreso ingreso = new Ingreso();
        ingreso.setClientUuid(dto.clientUuid());
        ingreso.setIdUsuarioEstudiante(dto.idUsuarioEstudiante());
        ingreso.setCodsisEstudiante(dto.codsisEstudiante());
        ingreso.setIdAsignatura(dto.idAsignatura());
        ingreso.setIdExamen(dto.idExamen());
        ingreso.setIdAmbiente(dto.idAmbiente());
        ingreso.setIdUsuarioRegistra(idOperador);
        ingreso.setFechaIngreso(LocalDate.now());
        ingreso.setHoraIngreso(horaMarcacion);
        ingreso.setHoraMarcacion(horaMarcacion);
        ingreso.setTipoIngreso(tipo);
        ingreso.setMetodoIngreso(metodo);
        ingreso.setScoreFacial(dto.scoreFacial());
        ingreso.setLivenessScore(dto.livenessScore());
        ingreso.setModelVersion(dto.modelVersion());
        ingreso.setDeviceId(dto.deviceId());
        ingreso.setSincronizadoEn(LocalDateTime.now());
        if (tipo == TipoIngreso.EXCEPCIONAL) {
            ingreso.setMotivoExcepcion(enumSeguro(MotivoExcepcion.class, dto.motivoExcepcion(), "motivoExcepcion"));
            ingreso.setObservacionIngreso(dto.observacionIngreso().trim());
            ingreso.setAuditFlag(true);
        }
        ingresoRepository.save(ingreso);
        if (tipo == TipoIngreso.EXCEPCIONAL) {
            String afectado = correo(dto.idUsuarioEstudiante());
            auditoriaFacialService.publicar("FACIAL_INGRESO_MANUAL_EXCEPCIONAL", correo(idOperador), afectado, ip,
                    "sincronizacion_offline", detalleEstudiante(dto.idUsuarioEstudiante(), afectado, dto.idExamen(),
                            dto.idAmbiente(), "autorizado", dto.scoreFacial(), dto.livenessScore(),
                            "motivo=" + ingreso.getMotivoExcepcion()));
        }
        return resultado(dto.clientUuid(), "PROCESADO", "Marcación facial sincronizada.");
    }

    private String correo(Integer idUsuario) {
        return usuarioRepository.findById(idUsuario).map(u -> u.getCorreousuario()).orElse("-");
    }

    private String detalleEstudiante(Integer idUsuario, String correo, Integer idExamen, Integer idAmbiente,
                                     String resultado, Double score, Double liveness, String extra) {
        String sis = estudianteRepository.findByIdusuario(idUsuario)
                .map(e -> String.valueOf(e.getCodsisestudiante())).orElse("-");
        return "sis=" + sis + " | estudiante_correo=" + correo + " | examen=" + idExamen
                + " | ambiente=" + idAmbiente + " | resultado=" + resultado
                + " | score=" + score + " | liveness=" + liveness + (extra == null ? "" : " | " + extra);
    }

    private void validarReglasIngreso(FaceSyncRequestDto.IngresoDto dto, MetodoIngreso metodo, TipoIngreso tipo) {
        if (metodo == MetodoIngreso.FACIAL) {
            if (tipo != TipoIngreso.NORMAL || dto.motivoExcepcion() != null || dto.scoreFacial() == null || dto.livenessScore() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ingreso facial aprobado debe ser NORMAL y tener scores.");
            }
            return;
        }
        if (metodo != MetodoIngreso.MANUAL || tipo != TipoIngreso.EXCEPCIONAL
                || dto.observacionIngreso() == null || dto.observacionIngreso().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ingreso manual facial debe ser excepcional y tener observación.");
        }
        MotivoExcepcion motivo = enumSeguro(MotivoExcepcion.class, dto.motivoExcepcion(), "motivoExcepcion");
        if (motivo != MotivoExcepcion.FALLO_FACIAL && motivo != MotivoExcepcion.SIN_ENROLAMIENTO_FACIAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El motivo manual debe corresponder a una excepción facial.");
        }
    }

    private void validarUuid(String clientUuid) {
        if (clientUuid == null || clientUuid.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "clientUuid es obligatorio.");
        }
        try { java.util.UUID.fromString(clientUuid); }
        catch (IllegalArgumentException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "clientUuid no es un UUID válido."); }
    }

    private <T extends Enum<T>> T enumSeguro(Class<T> tipo, String valor, String campo) {
        try { return Enum.valueOf(tipo, valor == null ? "" : valor.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor inválido para " + campo + "."); }
    }

    private FaceSyncResponseDto.ItemResultadoDto resultado(String uuid, String estado, String mensaje) {
        return new FaceSyncResponseDto.ItemResultadoDto(uuid, estado, mensaje);
    }
}
