package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.HabilitacionRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.HabilitacionResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class HabilitacionService {

    private final HabilitacionRepository habilitacionRepository;

    public HabilitacionService(HabilitacionRepository habilitacionRepository) {
        this.habilitacionRepository = habilitacionRepository;
    }

    @Transactional(readOnly = true)
    public List<HabilitacionResponseDto> obtenerTodas() {
        return habilitacionRepository.findAllConDetalles()
                .stream()
                .map(HabilitacionResponseDto::fromEntity)
                .collect(Collectors.toList());
    }
}
