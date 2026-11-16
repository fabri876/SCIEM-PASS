package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceVerificacionEstudiante;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;

public interface FaceVerificacionEstudianteRepository extends JpaRepository<FaceVerificacionEstudiante, Integer> {
    long countByIdUsuarioAndIdExamenAndResultado(Integer idUsuario, Integer idExamen, String resultado);
    Optional<FaceVerificacionEstudiante> findTopByIdUsuarioAndIdExamenAndResultadoAndVenceEnAfterOrderByVerificadoEnDesc(Integer idUsuario, Integer idExamen, String resultado, LocalDateTime ahora);
}
