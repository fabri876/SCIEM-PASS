package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.MotivoInhabilitacion;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.MotivoInhabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.MotivoInhabilitacionResponseDTO;

@Service
public class MotivoInhabilitacionService {

    private final MotivoInhabilitacionRepository motivoInhabilitacionRepository;

    public MotivoInhabilitacionService(MotivoInhabilitacionRepository motivoInhabilitacionRepository) {
        this.motivoInhabilitacionRepository = motivoInhabilitacionRepository;
    }

    @Transactional(readOnly = true)
    public List<MotivoInhabilitacionResponseDTO> listarMotivos() {
        return motivoInhabilitacionRepository.findAll().stream()
                .map(m -> new MotivoInhabilitacionResponseDTO(
                        m.getIdmotivo(),
                        m.getNombremotivo(),
                        m.getDescripcionmotivo()))
                .collect(Collectors.toList());
    }

    @Transactional
    public MotivoInhabilitacionResponseDTO crearMotivo(MotivoInhabilitacionRequestDTO dto) {
        MotivoInhabilitacion motivo = new MotivoInhabilitacion(
                dto.getNombremotivo().trim(),
                dto.getDescripcionmotivo() != null ? dto.getDescripcionmotivo().trim() : null);

        MotivoInhabilitacion guardado = motivoInhabilitacionRepository.save(motivo);

        return new MotivoInhabilitacionResponseDTO(
                guardado.getIdmotivo(),
                guardado.getNombremotivo(),
                guardado.getDescripcionmotivo());
    }
}
