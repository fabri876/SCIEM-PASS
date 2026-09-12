package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Estudiante;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Habilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.EstudianteRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.MotivoInhabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDTO;

@Service
public class HabilitacionService {

    private final HabilitacionRepository habilitacionRepository;
    private final EstudianteRepository estudianteRepository;
    private final MotivoInhabilitacionRepository motivoInhabilitacionRepository;

    public HabilitacionService(HabilitacionRepository habilitacionRepository,
                               EstudianteRepository estudianteRepository,
                               MotivoInhabilitacionRepository motivoInhabilitacionRepository) {
        this.habilitacionRepository = habilitacionRepository;
        this.estudianteRepository = estudianteRepository;
        this.motivoInhabilitacionRepository = motivoInhabilitacionRepository;
    }

    @Transactional(readOnly = true)
    public List<HabilitacionResponseDTO> listarHabilitaciones() {
        return habilitacionRepository.findAllConDetalles().stream()
                .map(this::mapearAHabilitacionResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public HabilitacionResponseDTO obtenerPorId(Integer idhabilitacion) {
        Habilitacion habilitacion = habilitacionRepository.findByIdConDetalles(idhabilitacion)
                .orElseThrow(() -> new IllegalArgumentException("Habilitación no encontrada con ID: " + idhabilitacion));
        return mapearAHabilitacionResponseDTO(habilitacion);
    }

    @Transactional(readOnly = true)
    public HabilitacionResponseDTO obtenerUltimaPorEstudiante(Integer codsisestudiante) {
        Habilitacion habilitacion = habilitacionRepository.findTopByEstudianteCodsisestudianteOrderByFecharegistroDesc(codsisestudiante)
                .orElseThrow(() -> new IllegalArgumentException("No se encontró registro de habilitación para el estudiante con código SIS: " + codsisestudiante));
        return mapearAHabilitacionResponseDTO(habilitacion);
    }

    @Transactional
    public HabilitacionResponseDTO registrarHabilitacion(HabilitacionRequestDTO dto) {
        Estudiante estudiante = estudianteRepository.findById(dto.getCodsisestudiante())
                .orElseThrow(() -> new IllegalArgumentException("Estudiante no encontrado con código SIS: " + dto.getCodsisestudiante()));

        MotivoInhabilitacion motivo = null;
        if (Boolean.FALSE.equals(dto.getEstadohabilitacion())) {
            if (dto.getIdmotivo() == null) {
                throw new IllegalArgumentException("Debe seleccionar un motivo de inhabilitación cuando el estado es inhabilitado");
            }
            motivo = motivoInhabilitacionRepository.findById(dto.getIdmotivo())
                    .orElseThrow(() -> new IllegalArgumentException("Motivo de inhabilitación no encontrado con ID: " + dto.getIdmotivo()));
        }

        Habilitacion habilitacion = new Habilitacion(
                estudiante,
                motivo,
                dto.getEstadohabilitacion(),
                dto.getObservacionhabilitacion()
        );

        Habilitacion guardada = habilitacionRepository.save(habilitacion);
        return mapearAHabilitacionResponseDTO(guardada);
    }

    @Transactional
    public HabilitacionResponseDTO actualizarHabilitacion(Integer idhabilitacion, HabilitacionRequestDTO dto) {
        Habilitacion habilitacion = habilitacionRepository.findById(idhabilitacion)
                .orElseThrow(() -> new IllegalArgumentException("Habilitación no encontrada con ID: " + idhabilitacion));

        habilitacion.setEstadohabilitacion(dto.getEstadohabilitacion());
        habilitacion.setObservacionhabilitacion(dto.getObservacionhabilitacion());

        if (Boolean.FALSE.equals(dto.getEstadohabilitacion())) {
            if (dto.getIdmotivo() == null) {
                throw new IllegalArgumentException("Debe seleccionar un motivo de inhabilitación cuando el estado es inhabilitado");
            }
            MotivoInhabilitacion motivo = motivoInhabilitacionRepository.findById(dto.getIdmotivo())
                    .orElseThrow(() -> new IllegalArgumentException("Motivo de inhabilitación no encontrado con ID: " + dto.getIdmotivo()));
            habilitacion.setMotivo(motivo);
        } else {
            habilitacion.setMotivo(null);
        }

        Habilitacion actualizada = habilitacionRepository.save(habilitacion);
        return mapearAHabilitacionResponseDTO(actualizada);
    }

    private HabilitacionResponseDTO mapearAHabilitacionResponseDTO(Habilitacion h) {
        String nombre = h.getEstudiante() != null && h.getEstudiante().getUsuario() != null
                ? h.getEstudiante().getUsuario().getNombreusuario() : null;
        String apellido = h.getEstudiante() != null && h.getEstudiante().getUsuario() != null
                ? h.getEstudiante().getUsuario().getApellidousuario() : null;
        String ci = h.getEstudiante() != null && h.getEstudiante().getUsuario() != null
                ? h.getEstudiante().getUsuario().getCiusuario() : null;

        Integer idMotivo = h.getMotivo() != null ? h.getMotivo().getIdmotivo() : null;
        String nombreMotivo = h.getMotivo() != null ? h.getMotivo().getNombremotivo() : null;
        String descMotivo = h.getMotivo() != null ? h.getMotivo().getDescripcionmotivo() : null;

        return new HabilitacionResponseDTO(
                h.getIdhabilitacion(),
                h.getEstudiante() != null ? h.getEstudiante().getCodsisestudiante() : null,
                nombre,
                apellido,
                ci,
                h.getEstadohabilitacion(),
                idMotivo,
                nombreMotivo,
                descMotivo,
                h.getObservacionhabilitacion(),
                h.getFecharegistro()
        );
    }
}
