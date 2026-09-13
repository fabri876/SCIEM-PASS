package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenResponseDTO;

@Service
public class ExamenService {

    private final ExamenRepository examenRepository;

    public ExamenService(ExamenRepository examenRepository) {
        this.examenRepository = examenRepository;
    }

    @Transactional(readOnly = true)
    public List<ExamenResponseDTO> listarExamenes() {
        return examenRepository.findAll().stream()
                .map(this::mapearAExamenResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExamenResponseDTO> listarPorAsignatura(Integer idAsignatura) {
        return examenRepository.findByIdAsignatura(idAsignatura).stream()
                .map(this::mapearAExamenResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExamenResponseDTO obtenerPorId(Integer idExamen) {
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new RecursoNoEncontradoException("Examen no encontrado con ID: " + idExamen));
        return mapearAExamenResponseDTO(examen);
    }

    @Transactional
    public ExamenResponseDTO crearExamen(ExamenRequestDTO dto) {
        Examen examen = new Examen();
        examen.setIdAsignatura(dto.getIdAsignatura());
        examen.setFechaExamen(dto.getFechaExamen());
        examen.setDuracionExamen(dto.getDuracionExamen());
        examen.setFechaCreacionExamen(dto.getFechaCreacionExamen() != null ? dto.getFechaCreacionExamen() : LocalDateTime.now());
        examen.setNormasExamen(dto.getNormasExamen());
        examen.setEstadoExamen(dto.getEstadoExamen() != null ? dto.getEstadoExamen() : true);

        Examen guardado = examenRepository.save(examen);
        return mapearAExamenResponseDTO(guardado);
    }

    private ExamenResponseDTO mapearAExamenResponseDTO(Examen x) {
        return new ExamenResponseDTO(
                x.getIdExamen(),
                x.getFechaExamen(),
                x.getDuracionExamen(),
                x.getFechaCreacionExamen(),
                x.getNormasExamen(),
                x.getEstadoExamen(),
                x.getIdAsignatura()
        );
    }
}
