package bo.edu.umss.windsoft.control_ingreso_backend.persistencia;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.FaceConsentimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FaceConsentimientoRepository extends JpaRepository<FaceConsentimiento, Integer> {
    Optional<FaceConsentimiento> findTopByIdUsuarioOrderByAceptadoEnDesc(Integer idUsuario);
}
