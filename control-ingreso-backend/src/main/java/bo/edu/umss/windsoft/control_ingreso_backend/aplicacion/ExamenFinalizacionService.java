package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.AccesoDenegadoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenFinalizadoRespuestaDto;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ExamenFinalizacionService {
    private final ExamenRepository examenRepository;
    private final ContextoUsuarioService contextoUsuarioService;
    private final AuditoriaService auditoriaService;
    private final ApplicationEventPublisher eventPublisher;

    public ExamenFinalizacionService(ExamenRepository examenRepository, ContextoUsuarioService contextoUsuarioService,
                                     AuditoriaService auditoriaService, ApplicationEventPublisher eventPublisher) {
        this.examenRepository = examenRepository;
        this.contextoUsuarioService = contextoUsuarioService;
        this.auditoriaService = auditoriaService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ExamenFinalizadoRespuestaDto finalizar(Integer idExamen, String ip) {
        ContextoUsuarioService.UsuarioActual usuario = contextoUsuarioService.actual();
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new RecursoNoEncontradoException("Examen no encontrado."));
        if (!usuario.esDocente() || !usuario.idUsuario().equals(examen.getIdUsuario())) {
            throw new AccesoDenegadoException("Solo el docente propietario puede finalizar este examen.");
        }
        if (!Boolean.TRUE.equals(examen.getEstadoExamen())) {
            return new ExamenFinalizadoRespuestaDto(examen.getIdExamen(), true, false);
        }

        examen.setEstadoExamen(false);
        examenRepository.save(examen);
        auditoriaService.registrarEnTransaccion("FINALIZACION_EXAMEN", usuario.correo(), null,
                "examen=" + examen.getIdExamen(), ip);
        eventPublisher.publishEvent(new ExamenFinalizadoEvent(examen.getIdExamen(), usuario.idUsuario(),
                usuario.correo(), LocalDateTime.now(), ip));
        return new ExamenFinalizadoRespuestaDto(examen.getIdExamen(), true, true);
    }
}
