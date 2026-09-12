package bo.edu.umss.windsoft.control_ingreso_backend.aplicacion;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Examen;
import bo.edu.umss.windsoft.control_ingreso_backend.dominio.Usuario;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.ExamenRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.persistencia.UsuarioRepository;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenRequestDTO;
import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.ExamenResponseDTO;

@Service
public class ExamenService {

    private final ExamenRepository examenRepository;
    private final UsuarioRepository usuarioRepository;

    public ExamenService(ExamenRepository examenRepository, UsuarioRepository usuarioRepository) {
        this.examenRepository = examenRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public List<ExamenResponseDTO> listarExamenes() {
        return examenRepository.findAll().stream()
                .map(this::mapearAExamenResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExamenResponseDTO obtenerPorId(Long idExamen) {
        Examen examen = examenRepository.findById(idExamen)
                .orElseThrow(() -> new IllegalArgumentException("Examen no encontrado con ID: " + idExamen));
        return mapearAExamenResponseDTO(examen);
    }

    @Transactional
    public ExamenResponseDTO crearExamen(ExamenRequestDTO dto) {
        Usuario docente = usuarioRepository.findById(dto.getIdUsuarioDocente())
                .orElseThrow(() -> new IllegalArgumentException("Docente no encontrado con ID de usuario: " + dto.getIdUsuarioDocente()));

        Examen examen = new Examen(
                dto.getAsignatura(),
                dto.getFechaHoraInicio(),
                dto.getDuracionMinutos(),
                dto.getAmbiente(),
                dto.getNormas(),
                dto.getEstado(),
                docente
        );

        Examen guardado = examenRepository.save(examen);
        return mapearAExamenResponseDTO(guardado);
    }

    private ExamenResponseDTO mapearAExamenResponseDTO(Examen x) {
        String nombreDocente = x.getDocente() != null
                ? (x.getDocente().getNombreusuario() + " " + x.getDocente().getApellidousuario()).trim()
                : null;
        Integer idDocente = x.getDocente() != null ? x.getDocente().getIdusuario() : null;

        return new ExamenResponseDTO(
                x.getIdExamen(),
                x.getAsignatura(),
                x.getFechaHoraInicio(),
                x.getDuracionMinutos(),
                x.getAmbiente(),
                x.getNormas(),
                x.getEstado(),
                idDocente,
                nombreDocente
        );
    }
}
