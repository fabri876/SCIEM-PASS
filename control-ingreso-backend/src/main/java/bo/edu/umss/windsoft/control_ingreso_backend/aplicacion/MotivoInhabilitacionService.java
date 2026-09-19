package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.RecursoNoEncontradoException;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.exception.SolicitudInvalidaException;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.MotivoInhabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionRequestDto;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MotivoInhabilitacionService {

    private final MotivoInhabilitacionRepository motivoRepository;

    public MotivoInhabilitacionService(MotivoInhabilitacionRepository motivoRepository) {
        this.motivoRepository = motivoRepository;
    }

    @Transactional(readOnly = true)
    public List<MotivoInhabilitacionResponseDto> obtenerTodos() {
        return motivoRepository.findAll()
                .stream()
                .map(MotivoInhabilitacionResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MotivoInhabilitacionResponseDto obtenerPorId(Integer id) {
        MotivoInhabilitacion motivo = motivoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el motivo de inhabilitación con ID: " + id));
        return MotivoInhabilitacionResponseDto.fromEntity(motivo);
    }

    @Transactional
    public MotivoInhabilitacionResponseDto crearMotivo(MotivoInhabilitacionRequestDto request) {
        if (request == null || request.getNombreMotivo() == null || request.getNombreMotivo().trim().isEmpty()) {
            throw new SolicitudInvalidaException("El nombre del motivo es obligatorio");
        }

        String nombre = request.getNombreMotivo().trim();
        String descripcion = request.getDescripcionMotivo() != null ? request.getDescripcionMotivo().trim() : null;

        MotivoInhabilitacion nuevoMotivo = new MotivoInhabilitacion(nombre, descripcion);
        MotivoInhabilitacion guardado = motivoRepository.save(nuevoMotivo);

        return MotivoInhabilitacionResponseDto.fromEntity(guardado);
    }

    @Transactional
    public MotivoInhabilitacionResponseDto actualizarMotivo(Integer id, MotivoInhabilitacionRequestDto request) {
        MotivoInhabilitacion motivo = motivoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el motivo de inhabilitación con ID: " + id));

        if (request == null || request.getNombreMotivo() == null || request.getNombreMotivo().trim().isEmpty()) {
            throw new SolicitudInvalidaException("El nombre del motivo es obligatorio");
        }

        motivo.setNombremotivo(request.getNombreMotivo().trim());
        motivo.setDescripcionmotivo(request.getDescripcionMotivo() != null ? request.getDescripcionMotivo().trim() : null);

        MotivoInhabilitacion guardado = motivoRepository.save(motivo);
        return MotivoInhabilitacionResponseDto.fromEntity(guardado);
    }

    @Transactional
    public void eliminarMotivo(Integer id) {
        if (!motivoRepository.existsById(id)) {
            throw new RecursoNoEncontradoException("No se encontró el motivo de inhabilitación con ID: " + id);
        }
        motivoRepository.deleteById(id);
    }
}

