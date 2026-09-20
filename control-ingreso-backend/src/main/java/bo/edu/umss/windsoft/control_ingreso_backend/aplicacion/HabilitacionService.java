package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.MotivoInhabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class HabilitacionService {

    private final HabilitacionRepository habilitacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final MotivoInhabilitacionRepository motivoInhabilitacionRepository;

    public HabilitacionService(
            HabilitacionRepository habilitacionRepository,
            UsuarioRepository usuarioRepository,
            MotivoInhabilitacionRepository motivoInhabilitacionRepository) {
        this.habilitacionRepository = habilitacionRepository;
        this.usuarioRepository = usuarioRepository;
        this.motivoInhabilitacionRepository = motivoInhabilitacionRepository;
    }

    @Transactional(readOnly = true)
    public List<HabilitacionResponseDto> obtenerTodas() {
        return habilitacionRepository.findAllConDetalles()
                .stream()
                .map(this::mapearADto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public HabilitacionResponseDto obtenerPorId(Integer idHabilitacion) {
        Habilitacion habilitacion = habilitacionRepository.findByIdConDetalles(idHabilitacion)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la habilitación con ID: " + idHabilitacion));
        return mapearADto(habilitacion);
    }

    @Transactional
    public HabilitacionResponseDto actualizarHabilitacion(Integer idHabilitacion, HabilitacionRequestDto request) {
        Habilitacion habilitacion = habilitacionRepository.findById(idHabilitacion)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró la habilitación con ID: " + idHabilitacion));

        Boolean nuevoEstado = request.resolverEstado();
        if (nuevoEstado != null) {
            habilitacion.setEstadohabilitacion(nuevoEstado);
        }

        String textoMotivo = request.resolverTextoMotivo();
        if (textoMotivo == null && request.getIdMotivo() != null) {
            MotivoInhabilitacion m = motivoInhabilitacionRepository.findById(request.getIdMotivo()).orElse(null);
            if (m != null) {
                textoMotivo = m.getNombremotivo();
            }
        }

        if (Boolean.TRUE.equals(habilitacion.getEstadohabilitacion())) {
            // Si queda habilitado, se limpia el motivo de inhabilitación
            habilitacion.setObservacionhabilitacion(null);
        } else if (textoMotivo != null) {
            habilitacion.setObservacionhabilitacion(textoMotivo);
        }

        Habilitacion guardada = habilitacionRepository.save(habilitacion);
        return mapearADto(guardada);
    }


    private HabilitacionResponseDto mapearADto(Habilitacion h) {
        Usuario u = null;
        if (h.getEstudiante() != null && h.getEstudiante().getIdUsuario() != null) {
            u = usuarioRepository.findById(h.getEstudiante().getIdUsuario()).orElse(null);
        }
        return HabilitacionResponseDto.fromEntity(h, u);
    }
}

